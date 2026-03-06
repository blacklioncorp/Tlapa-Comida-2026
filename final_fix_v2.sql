-- ==========================================
-- FINAL DATABASE FIXES
-- Proyecto: Tlapa-Comida
-- ==========================================

-- 1. AÑADIR COLUMNAS DE TIEMPO FALTANTES
-- Esto corrige el error "Could not find the 'updatedAt' column"

ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. ASEGURAR QUE LOS USUARIOS PUEDAN VER SU PROPIO PERFIL
-- Esto ayuda a evitar el error 401 (Unauthorized) al cargar la app

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);

-- 3. RE-VINCULACIÓN DE HUEVOS TACOS (Just in case)
UPDATE public.users 
SET role = 'merchant', "merchantId" = (SELECT id FROM public.merchants WHERE "ownerEmail" = 'huevostacos@gmail.com' LIMIT 1)
WHERE email = 'huevostacos@gmail.com';

-- 4. HABILITAR PERMISOS DE ACTUALIZACIÓN PARA EL OWNER
DROP POLICY IF EXISTS "Merchants can update own data" ON public.merchants;
CREATE POLICY "Merchants can update own data" ON public.merchants 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND (public.users.role = 'admin' OR public.users."merchantId" = merchants.id)
  )
);
