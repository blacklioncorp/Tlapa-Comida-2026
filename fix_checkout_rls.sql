-- Fix RLS for Orders by casting UUID to text
DROP POLICY IF EXISTS "View orders" ON public.orders;
DROP POLICY IF EXISTS "Update orders" ON public.orders;
DROP POLICY IF EXISTS "Clients can create orders" ON public.orders;

CREATE POLICY "View orders" ON public.orders FOR SELECT USING (
  auth.uid()::text = "clientId"::text OR 
  auth.uid()::text = "driverId"::text OR 
  is_admin() OR 
  get_merchant_id() = "merchantId"
);

CREATE POLICY "Update orders" ON public.orders FOR UPDATE USING (
  auth.uid()::text = "clientId"::text OR 
  auth.uid()::text = "driverId"::text OR 
  is_admin() OR 
  get_merchant_id() = "merchantId"
);

CREATE POLICY "Clients can create orders" ON public.orders 
FOR INSERT WITH CHECK (auth.uid()::text = "clientId"::text);
