-- Add driver onboarding and verification fields to users table

-- 1. Add verification_status column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verification_status') THEN
        ALTER TABLE public.users ADD COLUMN verification_status TEXT DEFAULT 'pending';
    END IF;

    -- 2. Add driver_documents column (JSONB to store URLs of INE, License, etc.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='driver_documents') THEN
        ALTER TABLE public.users ADD COLUMN driver_documents JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- 3. Add selfie_url column specifically for the profile avatar
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='selfie_url') THEN
        ALTER TABLE public.users ADD COLUMN selfie_url TEXT;
    END IF;
END $$;

-- Update RLS if necessary (assuming admins can already edit users)
-- The existing RLS for public.users should allow the user to update their own record 
-- and admins to update all records.
