-- Add ownerEmail to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS "ownerEmail" TEXT;

-- Create an index to quickly lookup merchants by owner email during registration
CREATE INDEX IF NOT EXISTS idx_merchants_owner_email ON public.merchants("ownerEmail");
