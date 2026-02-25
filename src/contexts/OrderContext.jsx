import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';

const OrderContext = createContext(null);

// ═══════════════════════════════════════════════
// FSM: Valid state transitions
// ═══════════════════════════════════════════════
const VALID_TRANSITIONS = {
    'created': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['searching_driver'],
    'searching_driver': ['assigned_to_driver', 'picked_up', 'cancelled'],
    'assigned_to_driver': ['picked_up', 'cancelled'],
    'picked_up': ['on_the_way'],
    'on_the_way': ['delivered'],
    'delivered': [],
    'cancelled': [],
};

// Who can trigger each transition
const TRANSITION_PERMISSIONS = {
    'confirmed': ['merchant', 'admin'],
    'preparing': ['merchant', 'admin'],
    'ready': ['merchant', 'admin'],
    'searching_driver': ['system', 'admin'],
    'assigned_to_driver': ['driver', 'admin'],
    'picked_up': ['driver', 'admin'],
    'on_the_way': ['driver', 'admin'],
    'delivered': ['driver', 'admin'],
    'cancelled': ['client', 'merchant', 'admin'],  // with restrictions per state
};

function validateTransition(currentStatus, newStatus) {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
        throw new Error(`Transición inválida: ${currentStatus} → ${newStatus}`);
    }
    return true;
}

function generateUniqueOrderNumber() {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TLP-${datePart}-${randomPart}`;
}

// Calculate item subtotal considering modifiers
function calculateItemSubtotal(item) {
    let extrasTotal = 0;
    // Support new modifier groups format
    if (item.modifiers && item.modifiers.length > 0) {
        extrasTotal = item.modifiers.reduce((sum, group) => {
            return sum + (group.selected || []).reduce((s, opt) => s + (opt.price || 0), 0);
        }, 0);
    }
    // Also support legacy selectedExtras
    else if (item.selectedExtras && item.selectedExtras.length > 0) {
        extrasTotal = item.selectedExtras.reduce((s, e) => s + e.price, 0);
    }
    return (item.price + extrasTotal) * item.quantity;
}

export function OrderProvider({ children }) {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Sync orders from Supabase — optimized per role
    useEffect(() => {
        if (!user) {
            setOrders([]);
            setLoading(false);
            return;
        }

        let subscription = null;

        const fetchInitialOrders = async () => {
            let query = supabase.from('orders').select('*').order('createdAt', { ascending: false });

            if (user.role === 'admin') {
                query = query.limit(100);
            } else if (user.role === 'merchant') {
                query = query.eq('merchantId', user.merchantId).limit(50);
            } else if (user.role === 'driver') {
                query = query.in('status', ['searching_driver', 'assigned_to_driver', 'picked_up', 'on_the_way', 'delivered']).limit(50);
            } else {
                query = query.eq('clientId', user.id).limit(20);
            }

            const { data, error } = await query;
            if (data && !error) {
                setOrders(data);
            } else if (error) {
                console.warn('[OrderContext] Fetch error:', error.message);
            }
            setLoading(false);
        };

        const startListening = () => {
            if (subscription) return;

            subscription = supabase.channel('public:orders')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                    // Update state optimistically based on incoming change
                    setOrders(current => {
                        const modifiedOrder = payload.new;
                        if (payload.eventType === 'INSERT') {
                            // Filter for current user context loosely to save re-fetches
                            if (user.role === 'client' && modifiedOrder.clientId !== user.id) return current;
                            if (user.role === 'merchant' && modifiedOrder.merchantId !== user.merchantId) return current;

                            // Prevent duplicates
                            if (current.find(o => o.id === modifiedOrder.id)) return current;
                            return [modifiedOrder, ...current];
                        }
                        if (payload.eventType === 'UPDATE') {
                            return current.map(o => o.id === modifiedOrder.id ? modifiedOrder : o);
                        }
                        return current;
                    });
                })
                .subscribe((status, err) => {
                    if (err) console.warn('[OrderContext] Supabase sync error:', err);
                });
        };

        const stopListening = () => {
            if (subscription) {
                supabase.removeChannel(subscription);
                subscription = null;
            }
        };

        const handleVisibility = () => {
            document.hidden ? stopListening() : startListening();
        };

        fetchInitialOrders().then(() => startListening());
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            stopListening();
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [user]);

    // ═══════════════════════════════════════════════
    // Create Order
    // ═══════════════════════════════════════════════
    const createOrder = async ({ clientId, merchantId, items, deliveryAddress, paymentMethod, deliveryFee, serviceFee, discount = 0, notes = '' }) => {
        const subtotal = items.reduce((sum, item) => calculateItemSubtotal(item), 0);
        const total = subtotal + deliveryFee + serviceFee - discount;

        const orderData = {
            orderNumber: generateUniqueOrderNumber(),
            clientId,
            merchantId,
            driverId: null,
            // Cash: order starts as "created" — payment happens on delivery
            // Digital: order starts as "created" — payment validated separately
            status: 'created',
            items: items.map(item => ({
                ...item,
                subtotal: calculateItemSubtotal(item),
            })),
            totals: { subtotal, deliveryFee, serviceFee, discount, total },
            payment: {
                method: paymentMethod,
                status: paymentMethod === 'cash' ? 'pending_cash' : 'pending',
                paidAt: null,
                cashCollected: null,   // repartidor registra cuánto recibió
            },
            deliveryAddress,
            notes,
            rating: null,
            // Timestamps for each state transition
            timestamps: {
                createdAt: new Date().toISOString(),
                confirmedAt: null,
                preparingAt: null,
                readyAt: null,
                searchingDriverAt: null,
                pickedUpAt: null,
                onTheWayAt: null,
                deliveredAt: null,
                cancelledAt: null,
            },
            statusHistory: [
                { status: 'created', timestamp: new Date().toISOString(), actor: clientId }
            ],
            cancelReason: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const { error, data } = await supabase.from('orders').insert([orderData]).select().single();
        if (error) throw error;
        return data;
    };

    // ═══════════════════════════════════════════════
    // Update Order Status (with FSM validation)
    // ═══════════════════════════════════════════════
    const updateOrderStatus = async (orderId, newStatus, actorId = 'system') => {
        const order = orders.find(o => o.id === orderId);
        if (!order) throw new Error(`Pedido no encontrado: ${orderId}`);

        // Validate FSM transition
        validateTransition(order.status, newStatus);

        const now = new Date().toISOString();

        // Build timestamp field name
        const timestampMap = {
            'confirmed': 'confirmedAt',
            'preparing': 'preparingAt',
            'ready': 'readyAt',
            'searching_driver': 'searchingDriverAt',
            'picked_up': 'pickedUpAt',
            'on_the_way': 'onTheWayAt',
            'delivered': 'deliveredAt',
            'cancelled': 'cancelledAt',
        };

        const updateData = {
            status: newStatus,
            updatedAt: now,
            statusHistory: [
                ...(order.statusHistory || []),
                { status: newStatus, timestamp: now, actor: actorId }
            ],
        };

        // Set specific timestamp (note: in Supabase we might keep timestamps inside a JSONB column or separate. We'll merge JSON)
        // Since `timestamps` is probably a JSONB object, depending on how it's structured, we might need to pull and modify it:
        const mergedTimestamps = { ...(order.timestamps || {}) };
        const tsField = timestampMap[newStatus];
        if (tsField) {
            mergedTimestamps[tsField] = now;
        }
        updateData.timestamps = mergedTimestamps;

        // If delivered and cash payment, mark as collected
        const mergedPayment = { ...(order.payment || {}) };
        if (newStatus === 'delivered' && order.payment?.method === 'cash') {
            mergedPayment.status = 'collected';
            mergedPayment.paidAt = now;
        }
        updateData.payment = mergedPayment;

        await supabase.from('orders').update(updateData).eq('id', orderId);
    };

    // ═══════════════════════════════════════════════
    // Accept Order (Concurrency Security via Optimized Update)
    // ═══════════════════════════════════════════════
    const acceptOrder = async (orderId, driverId) => {
        try {
            // Lock optimism: we update only if status is searching_driver and driverId is null
            const now = new Date().toISOString();

            // First get the latest state of the order to access its history
            const order = orders.find(o => o.id === orderId);
            if (!order) throw new Error("Pedido no encontrado localmente.");

            const history = [...(order.statusHistory || [])];
            history.push({
                status: 'assigned_to_driver',
                timestamp: now,
                actor: driverId
            });

            const mergedTimestamps = { ...(order.timestamps || {}), assignedToDriverAt: now };

            // Ejecutamos el update condicional en Supabase para evitar carrera de datos
            const { data, error } = await supabase.from('orders').update({
                driverId: driverId,
                status: 'assigned_to_driver',
                updatedAt: now,
                statusHistory: history,
                timestamps: mergedTimestamps
            })
                .eq('id', orderId)
                .eq('status', 'searching_driver')
                .is('driverId', null)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error("Este pedido ya fue tomado por otro repartidor.");
            }

            console.log("¡Pedido aceptado exitosamente con seguridad condicional!");
        } catch (error) {
            console.error("Error al aceptar pedido: ", error);
            throw error; // Lanzamos al frontend para mostrar la alerta
        }
    };

    // ═══════════════════════════════════════════════
    // Cancel Order (with validation)
    // ═══════════════════════════════════════════════
    const cancelOrder = async (orderId, actorId, reason = '') => {
        const order = orders.find(o => o.id === orderId);
        if (!order) throw new Error(`Pedido no encontrado: ${orderId}`);

        // Check if cancellation is allowed in current state
        const cancellableStates = ['created', 'confirmed', 'preparing', 'searching_driver'];
        if (!cancellableStates.includes(order.status)) {
            throw new Error(`No se puede cancelar un pedido en estado: ${order.status}`);
        }

        const now = new Date().toISOString();
        const mergedTimestamps = { ...(order.timestamps || {}), cancelledAt: now };

        await supabase.from('orders').update({
            status: 'cancelled',
            cancelReason: reason,
            updatedAt: now,
            timestamps: mergedTimestamps,
            statusHistory: [
                ...(order.statusHistory || []),
                { status: 'cancelled', timestamp: now, actor: actorId, reason }
            ]
        }).eq('id', orderId);
    };

    // ═══════════════════════════════════════════════
    // Record cash payment (driver registers amount received)
    // ═══════════════════════════════════════════════
    const recordCashPayment = async (orderId, amountReceived) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        const mergedPayment = { ...(order.payment || {}), cashCollected: amountReceived, status: 'collected', paidAt: new Date().toISOString() };

        await supabase.from('orders').update({
            payment: mergedPayment,
            updatedAt: new Date().toISOString(),
        }).eq('id', orderId);
    };

    const rateOrder = async (orderId, rating) => {
        await supabase.from('orders').update({
            rating,
            updatedAt: new Date().toISOString()
        }).eq('id', orderId);
    };

    const getOrdersByRole = (userId, role) => {
        switch (role) {
            case 'client':
                return orders.filter(o => o.clientId === userId);
            case 'merchant': {
                return orders.filter(o => o.merchantId === user?.merchantId);
            }
            case 'driver':
                return orders.filter(o => o.driverId === userId ||
                    (o.status === 'ready' || o.status === 'searching_driver'));
            case 'admin':
                return orders;
            default:
                return [];
        }
    };

    const getActiveOrders = (userId, role) => {
        const userOrders = getOrdersByRole(userId, role);
        return userOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
    };

    return (
        <OrderContext.Provider value={{
            orders, loading, createOrder, updateOrderStatus, acceptOrder,
            cancelOrder, recordCashPayment, rateOrder, getOrdersByRole, getActiveOrders,
            VALID_TRANSITIONS,
        }}>
            {children}
        </OrderContext.Provider>
    );
}

export const useOrders = () => {
    const context = useContext(OrderContext);
    if (!context) throw new Error('useOrders must be used within OrderProvider');
    return context;
};
