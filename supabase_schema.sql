-- ==========================================
-- Supabase Schema for Tlapa-Comida
-- ==========================================

-- Drop existing tables to ensure a clean slate if re-running
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.merchants CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;

-- 1. Create the Users Table (public profiles)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  "displayName" TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'merchant', 'driver', 'admin')),
  phone TEXT,
  "avatarUrl" TEXT,
  "savedAddresses" JSONB DEFAULT '[]'::jsonb,
  "isActive" BOOLEAN DEFAULT true,
  "isBlocked" BOOLEAN DEFAULT false,
  "merchantId" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the Merchants (Restaurants) Table
CREATE TABLE public.merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  "logoUrl" TEXT,
  "bannerUrl" TEXT,
  "prepTime" TEXT,
  rating NUMERIC DEFAULT 4.5,
  "deliveryFee" NUMERIC DEFAULT 0,
  "minOrder" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  coordinates JSONB,
  address TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the Products (Menu) Table
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  "merchantId" TEXT REFERENCES public.merchants(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  "originalPrice" NUMERIC,
  category TEXT,
  "imageUrl" TEXT,
  "isAvailable" BOOLEAN DEFAULT true,
  "popular" BOOLEAN DEFAULT false,
  "modifiers" JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create the Orders Table
CREATE TABLE public.orders (
  id TEXT PRIMARY KEY,
  "clientId" UUID REFERENCES public.users(id) NOT NULL,
  "merchantId" TEXT REFERENCES public.merchants(id) NOT NULL,
  "driverId" UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'preparing', 'ready', 'assigned_to_driver', 'on_the_way', 'delivered', 'cancelled')),
  total NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  "deliveryFee" NUMERIC DEFAULT 0,
  "serviceFee" NUMERIC DEFAULT 0,
  "deliveryAddress" JSONB,
  items JSONB NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- Row Level Security (RLS) Policies
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can read all users (needed for admin/driver flows) but only update themselves
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Merchants are public to read
CREATE POLICY "Merchants are viewable by everyone" ON public.merchants FOR SELECT USING (true);
CREATE POLICY "Admins can manage merchants" ON public.merchants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin')
);

-- Products are public to read
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Merchants and Admins can manage products" ON public.products FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND (public.users.role = 'admin' OR public.users."merchantId" = products."merchantId")
  )
);

-- Orders Policies
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (
  auth.uid() = "clientId" OR auth.uid() = "driverId" OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND (public.users.role = 'admin' OR public.users."merchantId" = orders."merchantId")
  )
);

CREATE POLICY "Clients can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = "clientId");

CREATE POLICY "Drivers, Merchants, and Admins can update orders" ON public.orders FOR UPDATE USING (
  auth.uid() = "clientId" OR auth.uid() = "driverId" OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND (public.users.role IN ('admin', 'driver') OR public.users."merchantId" = orders."merchantId")
  )
);

-- Automatically create a user profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, "displayName", role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'displayName',
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable Realtime for Orders & Users
-- Re-create the publication for these tables to ensure idempotency
DO $$
BEGIN
  -- Remove the tables from publication if they are already in it to avoid duplicate errors
  -- (We catch exceptions in case they are not in the publication)
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
  EXCEPTION WHEN OTHERS THEN END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.users;
  EXCEPTION WHEN OTHERS THEN END;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
