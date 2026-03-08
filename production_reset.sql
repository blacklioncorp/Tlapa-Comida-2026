-- =============================================================
-- SCRIPT DE LIMPIEZA PARA LANZAMIENTO A PRODUCCIÓN
-- Tlapa-Comida 2026
-- =============================================================
-- Este script elimina datos de prueba pero mantiene la estructura
-- y las configuraciones de la plataforma.
-- =============================================================

BEGIN;

-- 1. Eliminar Historial de Pedidos (Ventas ficticias)
TRUNCATE TABLE public.orders CASCADE;
ALTER SEQUENCE IF EXISTS public.orders_id_seq RESTART WITH 1;

-- 2. Eliminar Menús y Productos de prueba
TRUNCATE TABLE public.products CASCADE;
ALTER SEQUENCE IF EXISTS public.products_id_seq RESTART WITH 1;

-- 3. Eliminar Comercios/Restaurantes de prueba
TRUNCATE TABLE public.merchants CASCADE;
-- Nota: Si quieres mantener algunos comercios reales, usa DELETE con WHERE id != '...'

-- 4. Limpiar Perfiles de Usuario (Manteniendo administradores)
-- Borramos todos los perfiles que no sean administradores
DELETE FROM public.users 
WHERE role != 'admin';

-- Nota sobre Usuarios de Autenticación:
-- Este script solo limpia la tabla de "perfiles" (public.users).
-- Debes ir al panel de Supabase > Authentication > Users 
-- y borrar manualmente los correos de prueba para que puedan registrarse de nuevo.

-- 5. Opcional: Reiniciar contadores o estados específicos
-- (Añadir aquí si hay tablas de métricas o logs temporales)

COMMIT;

-- INSTRUCCIONES POST-LIMPIEZA:
-- 1. Ve a Supabase Storage y vacía los buckets:
--    - 'merchant-logos'
--    - 'product-images'
--    - 'driver-documents'
-- 2. Ve a Supabase Auth y elimina los usuarios de prueba.
-- 3. Revisa que 'delivery_settings' y 'delivery_zones' tengan tus valores reales.
