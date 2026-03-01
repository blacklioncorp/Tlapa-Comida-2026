-- ==========================================
-- CONSOLIDACIÓN DE TABLAS Y AUTOMATIZACIÓN DE ROLES
-- Proyecto: Tlapa-Comida
-- ==========================================

-- 1. LIMPIEZA DE TABLAS OBSOLETAS (Legacy/Fantasma)
-- Solo se borran si existen para evitar errores.
DROP TABLE IF EXISTS public.restaurants CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.delivery_riders CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.addresses CASCADE;
DROP TABLE IF EXISTS public._prisma_migrations CASCADE;

-- 2. AUTOMATIZACIÓN DE ROLES (Trigger de Supabase)
-- Esta función se activará cada vez que se inserte o actualice un usuario
-- Vinculará el role='merchant' si su email está en la tabla 'merchants'

CREATE OR REPLACE FUNCTION public.sync_user_merchant_role()
RETURNS TRIGGER AS $$
DECLARE
    m_id TEXT;
BEGIN
    -- Buscamos si el email del usuario es dueño de algún comercio
    SELECT id INTO m_id FROM public.merchants WHERE "ownerEmail" = NEW.email LIMIT 1;

    IF m_id IS NOT NULL THEN
        NEW.role := 'merchant';
        NEW."merchantId" := m_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar el trigger a la tabla 'users'
DROP TRIGGER IF EXISTS tr_sync_user_merchant_role ON public.users;
CREATE TRIGGER tr_sync_user_merchant_role
BEFORE INSERT OR UPDATE OF email ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_merchant_role();

-- 3. ACTUALIZACIÓN MASIVA INICIAL
-- Forzamos la sincronización para usuarios ya existentes
UPDATE public.users u
SET 
  role = 'merchant',
  "merchantId" = m.id
FROM public.merchants m
WHERE u.email = m."ownerEmail"
AND (u.role != 'merchant' OR u."merchantId" IS NULL);

-- 4. AJUSTE DE RLS PARA PRODUCTOS
-- Asegurar que la política permita INSERT si el merchantId coincide
DROP POLICY IF EXISTS "Merchants and Admins can manage products" ON public.products;
CREATE POLICY "Merchants and Admins can manage products" ON public.products 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND (public.users.role = 'admin' OR public.users."merchantId" = products."merchantId")
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND (public.users.role = 'admin' OR public.users."merchantId" = products."merchantId")
  )
);

-- Habilitar Realtime para productos si no lo estaba
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
