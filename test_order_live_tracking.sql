-- ╔══════════════════════════════════════════════════════╗
-- ║  SCRIPT PRUEBA - PEDIDO EN TIEMPO REAL (ON_THE_WAY) ║
-- ║  Tlapa Comida 2026 - Test Solo para Desarrollo      ║
-- ╚══════════════════════════════════════════════════════╝

-- PASO 1: Asignar coordenadas GPS de prueba al repartidor "Juan Camaney"
--   (Esto simula que el repartidor ya está en ruta por las calles de Tlapa)
UPDATE users
SET 
    "currentLocation" = '{"lat": 17.5461, "lng": -98.5800}',
    "isOnline" = true
WHERE id = 'b34e37b1-af2e-48ca-98c0-0801f7ad5b30';


-- PASO 2: Insertar un pedido de prueba con status "on_the_way"
--   (El pedido ya fue aceptado por el conductor y está en camino)
INSERT INTO orders (
    "orderNumber",
    "merchantId",
    "clientId",
    "driverId",
    status,
    "createdAt",
    items,
    totals,
    "deliveryAddress",
    payment,
    notes,
    rating,
    timestamps
)
VALUES (
    'TLP-PRUEBA-DEMO',
    'merchant-2',
    '35802763-3a33-45c1-a2ae-dbbe0fa41974',  -- usuario de prueba (merchant owner)
    'b34e37b1-af2e-48ca-98c0-0801f7ad5b30',
    'on_the_way',
    NOW(),
    '[
        {
            "id": "test-item-1",
            "name": "Hamburguesa BBQ",
            "price": 85,
            "quantity": 2,
            "modifiers": []
        },
        {
            "id": "test-item-2",
            "name": "Papas Francesas",
            "price": 35,
            "quantity": 1,
            "modifiers": []
        }
    ]'::jsonb,
    '{
        "subtotal": 205,
        "deliveryFee": 30,
        "total": 235,
        "serviceFee": 0,
        "discount": 0
    }'::jsonb,
    '{
        "street": "Calle Lerma 23",
        "colony": "Centro",
        "city": "Tlapa de Comonfort",
        "lat": 17.5490,
        "lng": -98.5755
    }'::jsonb,
    '{"method": "cash", "status": "pending_cash"}'::jsonb,
    'Pedido de prueba para rastreo en vivo',
    null,
    '{
        "createdAt": null,
        "confirmedAt": null,
        "preparingAt": null,
        "readyAt": null,
        "searchingDriverAt": null,
        "pickedUpAt": null,
        "onTheWayAt": null,
        "deliveredAt": null,
        "cancelledAt": null
    }'::jsonb
);


-- PASO (OPCIONAL): Para ver el pin moverse al hacer pruebas,
--   ejecuta este UPDATE para cambiar las coordenadas del repartidor
--   en tiempo real. Corre esto varias veces para simular movimiento:

-- UPDATE users
-- SET "currentLocation" = '{"lat": 17.5475, "lng": -98.5780}'
-- WHERE id = 'b34e37b1-af2e-48ca-98c0-0801f7ad5b30';

-- UPDATE users
-- SET "currentLocation" = '{"lat": 17.5483, "lng": -98.5767}'
-- WHERE id = 'b34e37b1-af2e-48ca-98c0-0801f7ad5b30';

-- UPDATE users
-- SET "currentLocation" = '{"lat": 17.5490, "lng": -98.5755}'
-- WHERE id = 'b34e37b1-af2e-48ca-98c0-0801f7ad5b30';
