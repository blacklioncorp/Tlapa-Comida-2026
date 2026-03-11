-- ==========================================
-- ADD REAL-TIME TRACKING TO USERS
-- Enable driver tracking across domains/devices
-- ==========================================

-- 1. Add tracking columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "currentLocation" JSONB;

-- 2. Ensure RLS allows drivers to update their own location and status
-- (Existing "Users can update own profile" policy should cover this, but let's be sure)
-- Policy was: CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 3. Verify Realtime is enabled for the users table
-- (Already handled in schema.sql, but good practice to ensure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
END $$;
