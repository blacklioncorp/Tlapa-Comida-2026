import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    runTransaction
} from 'firebase/firestore';
import { MERCHANTS } from '../data/seedData';
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
    'searching_driver': ['picked_up', 'cancelled'],
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

    // Sync orders from Firestore — optimized per role to minimize reads
    useEffect(() => {
        if (!user) {
            setOrders([]);
            setLoading(false);
            return;
        }

        let unsubscribe = null;

        const buildQuery = () => {
            if (user.role === 'admin') {
                // Admin sees recent orders (limit to keep reads manageable)
                return query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
            } else if (user.role === 'merchant') {
                // Merchant: only their orders, only active statuses
                return query(
                    collection(db, 'orders'),
                    where('merchantId', '==', user.merchantId),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );
            } else if (user.role === 'driver') {
                // Driver: only orders available for pickup + their active order
                return query(
                    collection(db, 'orders'),
                    where('status', 'in', ['searching_driver', 'picked_up', 'on_the_way']),
                    orderBy('createdAt', 'desc'),
                    limit(20)
                );
            } else {
                // Client: only their own orders
                return query(
                    collection(db, 'orders'),
                    where('clientId', '==', user.id),
                    orderBy('createdAt', 'desc'),
                    limit(20)
                );
            }
        };

        const startListening = () => {
            if (unsubscribe) return; // already listening
            const q = buildQuery();
            unsubscribe = onSnapshot(q, (snapshot) => {
                const ordersData = snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt || new Date().toISOString(),
                    updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() || d.data().updatedAt || new Date().toISOString(),
                }));
                setOrders(ordersData);
                setLoading(false);
            }, (err) => {
                console.warn('[OrderContext] Listener error:', err.message);
                setLoading(false);
            });
        };

        const stopListening = () => {
            if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        };

        // Pause listener when tab is hidden to save reads
        const handleVisibility = () => {
            document.hidden ? stopListening() : startListening();
        };

        document.addEventListener('visibilitychange', handleVisibility);
        startListening();

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
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'orders'), orderData);
        return { id: docRef.id, ...orderData };
    };

    // ═══════════════════════════════════════════════
    // Update Order Status (with FSM validation)
    // ═══════════════════════════════════════════════
    const updateOrderStatus = async (orderId, newStatus, actorId = 'system') => {
        const order = orders.find(o => o.id === orderId);
        if (!order) throw new Error(`Pedido no encontrado: ${orderId}`);

        // Validate FSM transition
        validateTransition(order.status, newStatus);

        const orderRef = doc(db, 'orders', orderId);
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
            updatedAt: serverTimestamp(),
            statusHistory: [
                ...(order.statusHistory || []),
                { status: newStatus, timestamp: now, actor: actorId }
            ],
        };

        // Set specific timestamp
        const tsField = timestampMap[newStatus];
        if (tsField) {
            updateData[`timestamps.${tsField}`] = now;
        }

        // If delivered and cash payment, mark as collected
        if (newStatus === 'delivered' && order.payment?.method === 'cash') {
            updateData['payment.status'] = 'collected';
            updateData['payment.paidAt'] = now;
        }

        await updateDoc(orderRef, updateData);
    };

    // ═══════════════════════════════════════════════
    // Accept Order (Seguridad de Concurrencia con Transaction)
    // ═══════════════════════════════════════════════
    const acceptOrder = async (orderId, driverId) => {
        const orderRef = doc(db, 'orders', orderId);

        try {
            await runTransaction(db, async (transaction) => {
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists()) {
                    throw new Error("El pedido ya no existe.");
                }

                const data = orderDoc.data();

                // Validación Crítica: Si ya no está buscando repartidor o ya tiene asignado a otro, fallar.
                if (data.status !== 'searching_driver' || data.driverId) {
                    throw new Error("Este pedido ya fue tomado por otro repartidor.");
                }

                const now = new Date().toISOString();
                const history = [...(data.statusHistory || [])];

                // Añadimos el nuevo estado al historial
                history.push({
                    status: 'assigned_to_driver', // Usando tu flujo mencionado
                    timestamp: now,
                    actor: driverId
                });

                // Ejecutamos la transacción bloqueando el pedido para los demás
                transaction.update(orderRef, {
                    driverId: driverId,
                    status: 'assigned_to_driver',
                    updatedAt: serverTimestamp(),
                    statusHistory: history,
                    'timestamps.assignedToDriverAt': now,
                });
            });

            console.log("¡Pedido aceptado exitosamente con seguridad transaccional!");
        } catch (error) {
            console.error("Transacción fallida: ", error);
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

        const orderRef = doc(db, 'orders', orderId);
        const now = new Date().toISOString();

        await updateDoc(orderRef, {
            status: 'cancelled',
            cancelReason: reason,
            updatedAt: serverTimestamp(),
            'timestamps.cancelledAt': now,
            statusHistory: [
                ...(order.statusHistory || []),
                { status: 'cancelled', timestamp: now, actor: actorId, reason }
            ],
        });
    };

    // ═══════════════════════════════════════════════
    // Record cash payment (driver registers amount received)
    // ═══════════════════════════════════════════════
    const recordCashPayment = async (orderId, amountReceived) => {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            'payment.cashCollected': amountReceived,
            'payment.status': 'collected',
            'payment.paidAt': new Date().toISOString(),
            updatedAt: serverTimestamp(),
        });
    };

    const rateOrder = async (orderId, rating) => {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            rating,
            updatedAt: serverTimestamp()
        });
    };

    const getOrdersByRole = (userId, role) => {
        switch (role) {
            case 'client':
                return orders.filter(o => o.clientId === userId);
            case 'merchant': {
                const merchant = MERCHANTS.find(m => m.ownerId === userId);
                return merchant ? orders.filter(o => o.merchantId === merchant.id) : [];
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
