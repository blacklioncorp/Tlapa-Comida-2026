-- ==========================================
-- FIX RLS RECURSION
-- Resolve "infinite recursion detected in policy for relation 'users'"
-- ==========================================

-- 1. Create Security Definer functions to bypass RLS internally
-- These functions run with the privileges of the creator (postgres), avoiding recursion.

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_merchant_id()
RETURNS TEXT AS $$
  SELECT "merchantId" FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Fix USERS policies
-- Drop ALL possible existing policies to avoid collisions
DROP POLICY IF EXISTS "Admins can do everything" ON public.users;
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users; -- ADED THIS
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Public/Everyone can see basic profiles
CREATE POLICY "Users are viewable by everyone" ON public.users 
FOR SELECT USING (true);

-- Admins can update/delete anything
CREATE POLICY "Admins can manage all users" ON public.users 
FOR ALL USING (is_admin());

-- Users can update themselves
CREATE POLICY "Users can update own profile" ON public.users 
FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (needed for triggers/signup)
CREATE POLICY "Users can insert own profile" ON public.users 
FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Fix MERCHANTS policies
DROP POLICY IF EXISTS "Admins can manage merchants" ON public.merchants;
DROP POLICY IF EXISTS "Merchants can update own data" ON public.merchants;
DROP POLICY IF EXISTS "Admins can manage all merchants" ON public.merchants;
DROP POLICY IF EXISTS "Merchants are viewable by everyone" ON public.merchants;

CREATE POLICY "Merchants are viewable by everyone" ON public.merchants 
FOR SELECT USING (true);

CREATE POLICY "Admins can manage all merchants" ON public.merchants 
FOR ALL USING (is_admin());

CREATE POLICY "Merchants can update own data" ON public.merchants 
FOR UPDATE USING (get_merchant_id() = id);

-- 4. Fix PRODUCTS policies
DROP POLICY IF EXISTS "Merchants and Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins and Owners manage products" ON public.products;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;

CREATE POLICY "Products are viewable by everyone" ON public.products 
FOR SELECT USING (true);

CREATE POLICY "Admins and Owners manage products" ON public.products 
FOR ALL USING (is_admin() OR get_merchant_id() = "merchantId");

-- 5. Fix ORDERS policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers, Merchants, and Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "View orders" ON public.orders;
DROP POLICY IF EXISTS "Update orders" ON public.orders;
DROP POLICY IF EXISTS "Clients can create orders" ON public.orders;

CREATE POLICY "View orders" ON public.orders FOR SELECT USING (
  auth.uid() = "clientId" OR 
  auth.uid() = "driverId" OR 
  is_admin() OR 
  get_merchant_id() = "merchantId"
);

CREATE POLICY "Update orders" ON public.orders FOR UPDATE USING (
  auth.uid() = "clientId" OR 
  auth.uid() = "driverId" OR 
  is_admin() OR 
  get_merchant_id() = "merchantId"
);

CREATE POLICY "Clients can create orders" ON public.orders 
FOR INSERT WITH CHECK (auth.uid() = "clientId");

-- 6. Fix CATEGORIES policies
DROP POLICY IF EXISTS "Solo Admins gestionan categorías" ON public.categories;
CREATE POLICY "Solo Admins gestionan categorías" ON public.categories 
FOR ALL USING (is_admin());

-- Final check: Ensure RLS is active
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
