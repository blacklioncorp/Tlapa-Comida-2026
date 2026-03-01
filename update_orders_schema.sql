-- ==========================================
-- UPDATE ORDERS SCHEMA
-- Fix for PGRST204: Missing columns in orders table
-- ==========================================

-- 1. Add missing columns and defaults
ALTER TABLE public.orders 
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
ADD COLUMN IF NOT EXISTS "orderNumber" TEXT,
ADD COLUMN IF NOT EXISTS "totals" JSONB,
ADD COLUMN IF NOT EXISTS "payment" JSONB,
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "rating" JSONB,
ADD COLUMN IF NOT EXISTS "timestamps" JSONB,
ADD COLUMN IF NOT EXISTS "statusHistory" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

-- 2. Update status constraint to include 'created' and 'arrived_at_merchant'
-- First, drop the old constraint if we can find its name, or just use a DO block
DO $$
BEGIN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN (
        'created', 
        'pending', 
        'confirmed', 
        'preparing', 
        'ready', 
        'searching_driver', 
        'assigned_to_driver', 
        'arrived_at_merchant', 
        'picked_up', 
        'on_the_way', 
        'delivered', 
        'cancelled'
    ));
END $$;

-- 3. Make old columns optional (to avoid NOT NULL violations if frontend doesn't send them anymore)
ALTER TABLE public.orders ALTER COLUMN "total" DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN "subtotal" DROP NOT NULL;

-- 4. Ensure RLS allows the insertions
-- (Handled by existing policies but good to verify)
