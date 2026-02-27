-- Create the Categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    icon TEXT,
    image TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial categories
INSERT INTO public.categories (id, name, label, icon, image)
VALUES 
('cat-1', 'Pizza', 'Pizza', '🍕', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500'),
('cat-2', 'Hamburguesas', 'Hamburguesas', '🍔', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500'),
('cat-3', 'Tacos', 'Tacos', '🌮', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500'),
('cat-4', 'Sushi', 'Sushi', '🍣', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500'),
('cat-5', 'Bebidas', 'Bebidas', '🥤', 'https://images.unsplash.com/photo-1544145945-f904253d0c71?w=500'),
('cat-6', 'Postres', 'Postres', '🍰', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500'),
('cat-7', 'Comida Mexicana', 'Comida Mexicana', '🇲🇽', 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=500'),
('cat-8', 'Pollo', 'Pollo', '🍗', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON public.categories
    FOR SELECT USING (true);

-- Allow authenticated users (Admins) full access
-- Note: Simplified for now, in a real scenario we'd check for admin role
CREATE POLICY "Allow all for authenticated users" ON public.categories
    FOR ALL USING (auth.role() = 'authenticated');
