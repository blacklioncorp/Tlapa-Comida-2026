import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '../../contexts/OrderContext';
import { useAuth } from '../../contexts/AuthContext';
import { ORDER_STATUSES } from '../../data/seedData';
import { supabase } from '../../supabase';
import { ArrowLeft, Phone, MessageCircle, Check, XCircle, MapPin, Navigation } from 'lucide-react';
import DeliveryMap from '../../components/DeliveryMap';
import SmartETADisplay from '../../components/SmartETADisplay';
import WeatherBanner from '../../components/WeatherBanner';

// FSM steps in order for the progress stepper
const STEPS = ['created', 'confirmed', 'preparing', 'ready', 'searching_driver', 'assigned_to_driver', 'arrived_at_merchant', 'picked_up', 'on_the_way', 'delivered'];
const STEP_LABELS = {
    created: 'Pedido Recibido',
    confirmed: 'Restaurante Aceptó',
    preparing: 'En Cocina',
    ready: 'Empaquetado',
    searching_driver: 'Buscando Repartidor',
    assigned_to_driver: 'Repartidor Asignado',
    arrived_at_merchant: 'Repartidor en el Local',
    picked_up: 'Pedido en Camino',
    on_the_way: 'Cerca de tu Ubicación',
    delivered: '¡Entregado!',
};
const STEP_ICONS = {
    created: '📋',
    confirmed: '✅',
    preparing: '👨‍🍳',
    ready: '📦',
    searching_driver: '🔍',
    assigned_to_driver: '🛵',
    arrived_at_merchant: '📍',
    picked_up: '📦',
    on_the_way: '🚀',
    delivered: '🎉',
};

export default function OrderTracking() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { orders, cancelOrder } = useOrders();
    const order = orders.find(o => o.id === orderId);
    const [cancelling, setCancelling] = useState(false);

    if (!order) {
        return (
            <div className="app-container">
                <div className="loading-page">
                    <div className="spinner" />
                    <p>Cargando pedido...</p>
                </div>
            </div>
        );
    }

    const [merchant, setMerchant] = useState(null);
    const [driver, setDriver] = useState(null);

    useEffect(() => {
        if (!order) return;
        if (order.merchantId && !merchant) {
            supabase.from('merchants').select('*').eq('id', order.merchantId).single().then(({ data }) => setMerchant(data));
        }
        if (order.driverId && !driver) {
            supabase.from('users').select('*').eq('id', order.driverId).single().then(({ data }) => setDriver(data));
        }
    }, [order?.merchantId, order?.driverId]);

    const isCancelled = order.status === 'cancelled';
    const isDelivered = order.status === 'delivered';
    const isFinal = isDelivered || isCancelled;

    // Can the client cancel? Only in early states
    const canCancel = ['created', 'confirmed'].includes(order.status);

    const currentStepIndex = isCancelled ? -1 : STEPS.indexOf(order.status);

    // Get driver info
    const driverPhoto = driver?.photoURL || driver?.avatarUrl || null;

    const handleCancel = async () => {
        if (!canCancel) return;
        if (!window.confirm('¿Estás seguro de que quieres cancelar tu pedido?')) return;
        setCancelling(true);
        try {
            await cancelOrder(orderId, user?.id || 'client', 'Cancelado por el cliente');
        } catch (err) {
            alert('No se pudo cancelar: ' + err.message);
        }
        setCancelling(false);
    };

    return (
        <div className="app-container">
            <div className="page-header">
                <button className="btn btn-icon btn-ghost" onClick={() => navigate('/')}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Seguimiento</h1>
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                    {order.orderNumber}
                </span>
            </div>

            <div style={{ padding: 16 }}>
                {/* Cancelled Banner */}
                {isCancelled && (
                    <div style={{
                        background: '#fef2f2', borderRadius: 12, padding: 16, marginBottom: 20,
                        display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                        <XCircle size={24} color="#ef4444" />
                        <div>
                            <h3 style={{ fontWeight: 700, color: '#991b1b' }}>Pedido Cancelado</h3>
                            {order.cancelReason && (
                                <p style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: 4 }}>{order.cancelReason}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Delivery Map */}
                {!isCancelled && (
                    <DeliveryMap
                        merchantId={order.merchantId}
                        deliveryAddress={order.deliveryAddress}
                        orderStatus={order.status}
                        height={220}
                    />
                )}

                {/* Smart ETA */}
                {!isFinal && (
                    <>
                        <WeatherBanner compact={false} />
                        <SmartETADisplay
                            merchantId={order.merchantId}
                            deliveryAddress={order.deliveryAddress}
                            style={{ marginBottom: 20 }}
                        />
                    </>
                )}

                {/* Current Status Highlight */}
                {!isCancelled && (
                    <div style={{
                        background: isDelivered ? '#dcfce7' : 'var(--color-primary-bg)',
                        borderRadius: 12, padding: 16, marginBottom: 20,
                        textAlign: 'center',
                    }}>
                        <span style={{ fontSize: 32 }}>{STEP_ICONS[order.status] || '📋'}</span>
                        <h2 style={{
                            fontWeight: 800, fontSize: '1.1rem', marginTop: 8,
                            color: isDelivered ? '#166534' : 'var(--color-primary)',
                        }}>
                            {STEP_LABELS[order.status] || ORDER_STATUSES[order.status]?.label || order.status}
                        </h2>
                        {order.payment?.method === 'cash' && !isDelivered && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                💵 Pago en efectivo al momento de la entrega — ${order.totals?.total?.toFixed(2)}
                            </p>
                        )}
                    </div>
                )}

                {/* Status Stepper */}
                {!isCancelled && (
                    <div className="status-stepper">
                        {STEPS.map((step, i) => {
                            const isCompleted = i < currentStepIndex;
                            const isActive = i === currentStepIndex;
                            const historyEntry = (order.statusHistory || []).find(h => h.status === step);
                            return (
                                <div key={step} className={`status-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                                    <div className="step-dot">
                                        {isCompleted ? <Check size={14} /> : isActive ?
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} /> : null}
                                    </div>
                                    <div className="step-info">
                                        <h4 style={{ color: isCompleted || isActive ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                                            {STEP_LABELS[step]}
                                        </h4>
                                        {historyEntry && (
                                            <span>
                                                {new Date(historyEntry.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Delivery Address Info */}
                {order.deliveryAddress && (
                    <div style={{
                        background: 'var(--color-border-light)', borderRadius: 12, padding: 16, marginTop: 20,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <MapPin size={18} color="var(--color-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                    {order.deliveryAddress.street}
                                </p>
                                {order.deliveryAddress.colony && (
                                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                        {order.deliveryAddress.colony}
                                    </p>
                                )}
                                {order.deliveryAddress.reference && (
                                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                                        📝 {order.deliveryAddress.reference}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Driver Info */}
                {driver && ['picked_up', 'on_the_way', 'searching_driver'].includes(order.status) && (
                    <div style={{
                        background: 'var(--color-surface)', borderRadius: 12, padding: 16,
                        border: '1px solid var(--color-border-light)', marginTop: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: '50%',
                                overflow: 'hidden',
                                background: 'var(--color-primary-bg)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {driverPhoto ? (
                                    <img src={driverPhoto} alt={driver.displayName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: 20 }}>🛵</span>
                                )}
                            </div>
                            <div>
                                <h4 style={{ fontWeight: 700 }}>{driver.displayName}</h4>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    {driver.vehicleType === 'moto' ? '🏍️ Moto' : '🚲 Bici'} · {driver.phone}
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <a href={`tel:+52${driver.phone}`}
                                className="btn btn-icon btn-secondary" style={{ width: 40, height: 40 }}>
                                <Phone size={16} />
                            </a>
                            <a
                                href={`https://wa.me/52${driver.phone}?text=Hola, soy el cliente del pedido ${order.orderNumber}`}
                                target="_blank" rel="noopener noreferrer"
                                className="btn btn-icon" style={{ width: 40, height: 40, background: '#25D366', color: 'white' }}
                            >
                                <MessageCircle size={16} />
                            </a>
                        </div>
                    </div>
                )}

                {/* Cancel button */}
                {canCancel && (
                    <button
                        className="btn btn-block"
                        onClick={handleCancel}
                        disabled={cancelling}
                        style={{
                            marginTop: 20, background: 'white', color: '#ef4444',
                            border: '1.5px solid #fca5a5', fontWeight: 600,
                        }}
                    >
                        {cancelling ? 'Cancelando...' : '✕ Cancelar Pedido'}
                    </button>
                )}

                {/* Delivered — Rate */}
                {isDelivered && !order.rating && (
                    <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 24 }}
                        onClick={() => navigate(`/rating/${order.id}`)}>
                        ⭐ Califica tu experiencia
                    </button>
                )}

                {/* Order Summary */}
                <div style={{ marginTop: 24, background: 'var(--color-border-light)', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.95rem' }}>
                        {merchant?.name || 'Restaurante'} — Resumen
                    </h3>
                    {order.items.map((item, i) => (
                        <div key={i} style={{ marginBottom: 8, fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>
                                    {item.quantity}x {item.name}
                                </span>
                                <span style={{ fontWeight: 600 }}>${item.subtotal?.toFixed?.(2) || item.subtotal}</span>
                            </div>
                            {/* Show modifiers */}
                            {item.modifiers?.map((mod, mi) =>
                                mod.selected?.length > 0 && (
                                    <p key={mi} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', paddingLeft: 16 }}>
                                        {mod.groupName}: {mod.selected.map(s => s.name).join(', ')}
                                    </p>
                                )
                            )}
                            {item.selectedExtras?.length > 0 && (
                                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', paddingLeft: 16 }}>
                                    + {item.selectedExtras.map(e => e.name).join(', ')}
                                </p>
                            )}
                            {item.removedIngredients?.length > 0 && (
                                <p style={{ fontSize: '0.7rem', color: '#ef4444', paddingLeft: 16 }}>
                                    Sin: {item.removedIngredients.join(', ')}
                                </p>
                            )}
                        </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
                            <span>${order.totals?.subtotal?.toFixed?.(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Envío</span>
                            <span>${order.totals?.deliveryFee?.toFixed?.(2)}</span>
                        </div>
                        {order.totals?.discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4, color: 'var(--color-success)' }}>
                                <span>Descuento</span>
                                <span>-${order.totals.discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: 4 }}>
                            <span>Total</span>
                            <span style={{ color: 'var(--color-primary)' }}>${order.totals?.total?.toFixed?.(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment method badge */}
                <div style={{
                    marginTop: 16, padding: '10px 16px', borderRadius: 8,
                    background: order.payment?.method === 'cash' ? '#fef9c3' : '#dbeafe',
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: '0.8rem', fontWeight: 600,
                    color: order.payment?.method === 'cash' ? '#92400e' : '#1e40af',
                }}>
                    {order.payment?.method === 'cash' ? '💵' : '💳'}
                    {order.payment?.method === 'cash' ? 'Pago en efectivo' : 'Mercado Pago'}
                    {order.payment?.status === 'collected' && ' — Cobrado ✓'}
                    {order.payment?.status === 'pending_cash' && ' — Pendiente al entregar'}
                </div>
            </div>
        </div>
    );
}
