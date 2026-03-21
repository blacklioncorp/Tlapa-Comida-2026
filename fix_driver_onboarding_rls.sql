-- ==========================================
-- FIX: Driver Onboarding RLS & Storage
-- ==========================================

-- 1. Create the 'driver-documents' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('driver-documents', 'driver-documents', true) 
ON CONFLICT (id) DO NOTHING;

-- 2. RLS for 'driver-documents' Storage Bucket
-- Allow public select (to view documents in admin)
CREATE POLICY "Public Access for Driver Documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'driver-documents');

-- Allow authenticated users to upload their own documents
-- Note: We use a simple policy first to ensure it works, then refine if needed.
CREATE POLICY "Auth Insert for Driver Documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND 
    bucket_id = 'driver-documents'
);

CREATE POLICY "Auth Update for Driver Documents" 
ON storage.objects FOR UPDATE 
USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'driver-documents'
);

-- 3. Ensure users table has the necessary columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verification_status') THEN
        ALTER TABLE public.users ADD COLUMN verification_status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='driver_documents') THEN
        ALTER TABLE public.users ADD COLUMN driver_documents JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 4. Ensure users can update their own profile (including these new fields)
-- This policy should already exist from supabase_schema.sql, but we reinforce it.
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users 
FOR UPDATE 
USING (auth.uid() = id);
