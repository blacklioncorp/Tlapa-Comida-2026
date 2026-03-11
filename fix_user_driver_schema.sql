-- Fix missing columns and ensure data linkage by email
-- Allow admins to pre-onboard drivers and preserve data upon signup

-- 1. Drop the FK constraint to allow 'pre-onboarding' records without a corresponding auth user
DO $$
BEGIN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint users_id_fkey not found';
END $$;

-- 2. Add all missing columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS "isExclusive" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "vehicleAttributes" JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "cashInHand" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "maxCashLimit" NUMERIC DEFAULT 1000,
ADD COLUMN IF NOT EXISTS "isBlockedDueToCash" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "isAvailable" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "currentLocation" JSONB DEFAULT 'null'::jsonb,
ADD COLUMN IF NOT EXISTS "assignedRestaurantId" TEXT,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 3. Make email unique to support UPSERT (if not already)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
    END IF;
END $$;

-- 4. Update the handle_new_user trigger to preserve pre-onboarded data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, "displayName", role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'displayName',
    COALESCE(new.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (email) DO UPDATE
  SET 
    id = EXCLUDED.id, -- Adopt the new Auth UUID
    "displayName" = COALESCE(EXCLUDED."displayName", public.users."displayName"),
    role = COALESCE(EXCLUDED.role, public.users.role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Harden RLS for Admin
DROP POLICY IF EXISTS "Admins can do everything" ON public.users;
CREATE POLICY "Admins can do everything" ON public.users 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND public.users.role = 'admin'
  )
);
