-- Ejecuta este comando en el SQL Editor de tu Dashboard de Supabase para crear el bucket de imágenes de productos

-- 1. Insertar el bucket público 'product-images'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true) 
ON CONFLICT (id) DO NOTHING;

-- 2. Crear política para que cualquier usuario pueda ver las imágenes (Select)
CREATE POLICY "Public Access for Product Images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- 3. Crear política para que los usuarios autenticados (dueños de locales) puedan subir imágenes (Insert)
CREATE POLICY "Auth Insert for Product Images" 
ON storage.objects FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND 
    bucket_id = 'product-images'
);

-- 4. Crear política para que los usuarios autenticados puedan actualizar sus imágenes (Update)
CREATE POLICY "Auth Update for Product Images" 
ON storage.objects FOR UPDATE 
USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'product-images'
);

-- 5. Crear política para que los usuarios autenticados puedan eliminar imágenes (Delete)
CREATE POLICY "Auth Delete for Product Images" 
ON storage.objects FOR DELETE 
USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'product-images'
);
