-- Add platform configuration and radius settings to delivery_settings

-- 1. General Platform Config
INSERT INTO public.delivery_settings (key, value, description)
VALUES 
('platform_config', '{
    "platformName": "Tlapa Food",
    "supportEmail": "soporte@tlapafood.com",
    "supportPhone": "+52 757 123 4567",
    "enableNotifications": true,
    "enableSounds": true,
    "maintenanceMode": false
}', 'Configuración general de la plataforma')
ON CONFLICT (key) DO NOTHING;

-- 2. Fees & Limits Config
INSERT INTO public.delivery_settings (key, value, description)
VALUES 
('fees_and_limits', '{
    "defaultCommission": 15,
    "deliveryBaseFee": 20,
    "deliveryPerKm": 5,
    "minOrderAmount": 50,
    "serviceFeePct": 5
}', 'Configuración de comisiones y límites de pedido')
ON CONFLICT (key) DO NOTHING;

-- 3. Operation & Radius Config
INSERT INTO public.delivery_settings (key, value, description)
VALUES 
('operation_config', '{
    "maxDeliveryRadius": 8,
    "maxDriverRadius": 8,
    "autoAssignDrivers": true,
    "requireDriverDocs": true
}', 'Configuración de operación y radios de cobertura/asignación')
ON CONFLICT (key) DO NOTHING;
