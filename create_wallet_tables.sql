-- ==========================================
-- BILLETERA DE REPARTIDORES (DRIVER WALLET)
-- Proyecto: Tlapa-Comida
-- Versión 2: Descuenta solo la comisión de la plataforma
-- ==========================================

-- 1. Añadir saldo a la tabla de usuarios (idempotente)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "walletBalance" NUMERIC DEFAULT 0.00;

-- 2. Crear tabla de transacciones
--    NOTA: orderId es TEXT porque orders.id es de tipo text en este proyecto
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "driverId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('topup', 'commission_deduction', 'withdrawal')),
    "orderId" TEXT,   -- TEXT para coincidir con el tipo de orders.id
    description TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar Seguridad (RLS)
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Admins pueden ver todo
CREATE POLICY "Admins can view all wallet transactions"
    ON public.wallet_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid() AND public.users.role = 'admin'
        )
    );

-- Admins pueden insertar recargas manuales
CREATE POLICY "Admins can insert topups"
    ON public.wallet_transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid() AND public.users.role = 'admin'
        )
    );

-- Repartidores solo ven sus propias transacciones
CREATE POLICY "Drivers can view their own wallet transactions"
    ON public.wallet_transactions FOR SELECT
    USING ("driverId" = auth.uid());

-- Repartidores pueden insertar deducciones cuando aceptan un pedido
CREATE POLICY "Drivers can insert deductions"
    ON public.wallet_transactions FOR INSERT
    WITH CHECK ("driverId" = auth.uid() AND type = 'commission_deduction');

-- ==========================================
-- 4. RPC: Aceptar pedido y descontar solo la COMISIÓN de la plataforma
--
--    NUEVA LÓGICA (Efectivo):
--    - El repartidor paga al restaurante en CASH directamente
--    - Del monedero virtual solo se descuenta la COMISIÓN de Tlapa Food
--    - Descuento = subtotal_pedido × (comisión_pct / 100)
--    - Ej: pedido $100 con 15% → se descuentan $15 del monedero
--
--    BENEFICIO: con $500 en monedero puede hacer ~33 entregas en lugar de 5
-- ==========================================
CREATE OR REPLACE FUNCTION accept_order_deduct_wallet(
    p_driver_id UUID,
    p_order_id TEXT,
    p_subtotal NUMERIC,         -- Costo de la comida (sin envío)
    p_commission_pct NUMERIC    -- % de comisión de la plataforma (ej: 15.0)
) RETURNS JSONB AS $$
DECLARE
    v_current_balance NUMERIC;
    v_commission_amount NUMERIC;
BEGIN
    -- Calcular el monto a descontar (solo la comisión)
    v_commission_amount := ROUND(p_subtotal * (p_commission_pct / 100.0), 2);

    -- Verificar que el saldo es suficiente para cubrir la comisión
    SELECT "walletBalance" INTO v_current_balance
    FROM public.users
    WHERE id = p_driver_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'Repartidor no encontrado.';
    END IF;

    IF v_current_balance < v_commission_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente. La comisión de este pedido es $%, pero tu saldo es $%. Recarga tu monedero para continuar.',
            v_commission_amount, v_current_balance;
    END IF;

    -- Descontar solo la comisión del monedero
    UPDATE public.users
    SET "walletBalance" = "walletBalance" - v_commission_amount
    WHERE id = p_driver_id;

    -- Registrar la transacción
    INSERT INTO public.wallet_transactions ("driverId", amount, type, "orderId", description)
    VALUES (
        p_driver_id,
        -v_commission_amount,
        'commission_deduction',
        p_order_id,
        'Comisión de plataforma por pedido en efectivo (' || p_commission_pct || '%)'
    );

    -- Actualizar el pedido: asignar el repartidor
    UPDATE public.orders
    SET status = 'confirmed', "driverId" = p_driver_id::text
    WHERE id = p_order_id
    AND (status = 'ready' OR status = 'searching_driver');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido ya fue aceptado por otro repartidor o no está disponible.';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'commission_charged', v_commission_amount,
        'new_balance', v_current_balance - v_commission_amount
    );

EXCEPTION WHEN OTHERS THEN
    -- Revertir todo (PostgreSQL lo hace automáticamente en una excepción dentro de plpgsql)
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. RPC: Añadir saldo (Solo admin)
-- ==========================================
CREATE OR REPLACE FUNCTION admin_add_balance(
    p_driver_id UUID,
    p_amount NUMERIC,
    p_description TEXT
) RETURNS JSONB AS $$
DECLARE
    v_new_balance NUMERIC;
BEGIN
    -- Solo admins pueden ejecutar esto
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden recargar saldo.';
    END IF;

    -- Sumar al saldo y obtener el nuevo balance
    UPDATE public.users
    SET "walletBalance" = "walletBalance" + p_amount
    WHERE id = p_driver_id
    RETURNING "walletBalance" INTO v_new_balance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repartidor no encontrado con ese ID.';
    END IF;

    -- Registrar la recarga
    INSERT INTO public.wallet_transactions ("driverId", amount, type, description)
    VALUES (p_driver_id, p_amount, 'topup', p_description);

    RETURN jsonb_build_object(
        'success', true,
        'added', p_amount,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 6. Habilitar Realtime para el monedero
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
