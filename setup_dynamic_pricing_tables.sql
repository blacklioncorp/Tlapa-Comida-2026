-- Create delivery_settings table
CREATE TABLE IF NOT EXISTS public.delivery_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings
CREATE POLICY "Allow public read access to delivery_settings"
ON public.delivery_settings FOR SELECT
USING (true);

-- Only admins can modify settings
CREATE POLICY "Allow admin to manage delivery_settings"
ON public.delivery_settings FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
));

-- Seed default settings
INSERT INTO public.delivery_settings (key, value, description)
VALUES 
('weather_multipliers', '{"clear": 1.0, "cloudy": 1.0, "fog": 1.15, "drizzle": 1.25, "rain": 1.4, "heavy_rain": 1.6, "storm": 2.0}', 'Multiplicadores basados en el clima'),
('traffic_thresholds', '{"low": 1.1, "medium": 1.3, "high": 1.5}', 'Umbrales de ratio de tráfico (duración con tráfico / duración sin tráfico)'),
('base_fees', '{"default": 20, "minimum": 15}', 'Tarifas base de envío')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create delivery_zones table
CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    multiplier DECIMAL DEFAULT 1.0,
    polygon JSONB NOT NULL, -- Array of {lat, lng}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to delivery_zones"
ON public.delivery_zones FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Allow admin to manage delivery_zones"
ON public.delivery_zones FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
));

-- Seed initial "Zona Centro" (Standard)
INSERT INTO public.delivery_zones (name, multiplier, polygon)
VALUES 
('Tlapa Centro', 1.0, '[{"lat": 17.5501, "lng": -98.5796}, {"lat": 17.5414, "lng": -98.5796}, {"lat": 17.5414, "lng": -98.5684}, {"lat": 17.5501, "lng": -98.5684}]')
ON CONFLICT DO NOTHING;
