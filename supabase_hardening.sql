-- ==========================================
-- SCRIPT DE BLINDAJE DE SEGURIDAD (HARDENING)
-- Proyecto: Tlapa-Comida
-- ==========================================

-- 1. CORRECCIÓN DE SEGURIDAD EN FUNCIONES (Search Path Mutability)
-- Esto evita ataques de suplantación de esquemas en funciones con privilegios de definidor.
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. ACTIVACIÓN GLOBAL DE RLS (Row Level Security)
-- Habilitamos RLS en todas las tablas para asegurar que no haya acceso no autorizado.

-- Tablas Activas del Proyecto
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Tablas Detectadas por el Advisor (Ghost/Legacy tables)
-- Si no las usas, lo ideal es borrarlas. Mientras tanto, activamos RLS:
DO $$ 
BEGIN 
    EXECUTE (SELECT 'ALTER TABLE IF EXISTS public._prisma_migrations ENABLE ROW LEVEL SECURITY');
    EXECUTE (SELECT 'ALTER TABLE IF EXISTS public.restaurants ENABLE ROW LEVEL SECURITY');
    EXECUTE (SELECT 'ALTER TABLE IF EXISTS public.menu_items ENABLE ROW LEVEL SECURITY');
    EXECUTE (SELECT 'ALTER TABLE IF EXISTS public.delivery_riders ENABLE ROW LEVEL SECURITY');
    EXECUTE (SELECT 'ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY');
    EXECUTE (SELECT 'ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY');
    EXECUTE (SELECT 'ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY');
    EXECUTE (SELECT 'ALTER TABLE IF EXISTS public.addresses ENABLE ROW LEVEL SECURITY');
EXCEPTION WHEN OTHERS THEN 
    -- Ignorar si la tabla no existe
END $$;

-- 3. POLÍTICAS DE SEGURIDAD PARA CATEGORÍAS
-- Lectura pública, pero solo Admins pueden insertar/editar/borrar.
DROP POLICY IF EXISTS "Categorías visibles para todos" ON public.categories;
CREATE POLICY "Categorías visibles para todos" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo Admins gestionan categorías" ON public.categories;
CREATE POLICY "Solo Admins gestionan categorías" ON public.categories FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() AND public.users.role = 'admin'
  )
);

-- 4. POLÍTICAS DE "DEFAULT DENY" PARA TABLAS FANTASMA
-- Esto asegura que aunque las tablas existan, nadie pueda ver nada en ellas por ahora.
DO $$
DECLARE
    t text;
    ghost_tables text[] := ARRAY['restaurants', 'menu_items', 'delivery_riders', 'reviews', 'order_items', 'notifications', 'addresses'];
BEGIN
    FOREACH t IN ARRAY ghost_tables LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('DROP POLICY IF EXISTS "No public access" ON public.%I', t);
            EXECUTE format('CREATE POLICY "No public access" ON public.%I FOR ALL USING (false)', t);
        END IF;
    END LOOP;
END $$;

-- 5. RE-VERIFICACIÓN DE RLS EN TABLAS CRÍTICAS (Asegurar que existan políticas)
-- (Users, Merchants, Products y Orders ya tienen sus políticas en supabase_schema.sql)
