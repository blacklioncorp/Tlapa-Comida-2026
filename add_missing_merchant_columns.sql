-- Adding all missing columns used by the frontend Merchant forms
ALTER TABLE public.merchants
ADD COLUMN IF NOT EXISTS "isOpen" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "schedule" JSONB,
ADD COLUMN IF NOT EXISTS "prepTimeMinutes" INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS "deliveryTime" TEXT,
ADD COLUMN IF NOT EXISTS "reviews" INTEGER DEFAULT 0;
