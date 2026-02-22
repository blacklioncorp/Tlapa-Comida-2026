import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '../../contexts/OrderContext';
import { useAuth } from '../../contexts/AuthContext';
import { MERCHANTS, getMerchants } from '../../data/seedData';
import { ArrowLeft, Navigation, Phone, MessageCircle, MapPin, Check, DollarSign, Package, ChevronRight, ExternalLink } from 'lucide-react';
import DeliveryMap from '../../components/DeliveryMap';

export default function ActiveDelivery() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { orders, updateOrderStatus, recordCashPayment } = useOrders();
    const order = orders.find(o => o.id === orderId);

    // Cash payment modal state
    const [showCashModal, setShowCashModal] = useState(false);
    const [cashAmount, setCashAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!order) return <div className="app-container"><div className="loading-page"><div className="spinner" /></div></div>;

    const allMerchants = getMerchants();
    const merchant = allMerchants.find(m => m.id === order.merchantId) || MERCHANTS.find(m => m.id === order.merchantId);
    const isDelivered = order.status === 'delivered';
    const isCash = order.payment?.method === 'cash';

    // Build Google Maps navigation URL
    const getGoogleMapsUrl = (coords, label) => {
        if (coords?.lat && coords?.lng) {
            return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
        }
        if (label) {
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label + ', Tlapa de Comonfort, Guerrero')}`;
        }
        return null;
    };

    // Build WhatsApp share location URL
    const getWhatsAppLocationUrl = () => {
        const addr = order.deliveryAddress;
        const phone = addr?.phone || '';
        const text = `📍 Hola, soy tu repartidor de Tlapa Comida. Estoy en camino con tu pedido ${order.orderNumber}. Mi ubicación actual:`;
        return `https://wa.me/${phone ? '52' + phone : ''}?text=${encodeURIComponent(text)}`;
    };

    // Get client contact
    const clientPhone = order.deliveryAddress?.phone || '';

    const handleStatusUpdate = async (newStatus) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            // If delivering a cash order, show cash modal first
            if (newStatus === 'delivered' && isCash && order.payment?.status !== 'collected') {
                setShowCashModal(true);
                setIsProcessing(false);
                return;
            }

            await updateOrderStatus(orderId, newStatus, user?.id || 'driver');
            if (newStatus === 'delivered') {
                setTimeout(() => navigate('/delivery'), 1500);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setIsProcessing(false);
    };

    const handleCashConfirm = async () => {
        const amount = parseFloat(cashAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Ingresa un monto válido');
            return;
        }
        setIsProcessing(true);
        try {
            await recordCashPayment(orderId, amount);
            await updateOrderStatus(orderId, 'delivered', user?.id || 'driver');
            setShowCashModal(false);
            setTimeout(() => navigate('/delivery'), 1500);
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setIsProcessing(false);
    };

    // FSM-aware action buttons
    const getActionButton = () => {
        switch (order.status) {
            case 'picked_up':
                return { label: '🚀 En camino al cliente', next: 'on_the_way', color: '#2563eb' };
            case 'on_the_way':
                return { label: '✅ He entregado el pedido', next: 'delivered', color: '#16a34a' };
            default:
                return null;
        }
    };

    const actionButton = getActionButton();

    // Destination based on current status
    const pickupPhase = ['picked_up'].includes(order.status);
    const deliveryPhase = ['on_the_way'].includes(order.status);

    const merchantMapsUrl = getGoogleMapsUrl(merchant?.coordinates, merchant?.address?.street);
    const deliveryMapsUrl = getGoogleMapsUrl(order.deliveryAddress?.coordinates, order.deliveryAddress?.street);

    return (
        <div className="app-container">
            <div className="page-header">
                <button className="btn btn-icon btn-ghost" onClick={() => navigate('/delivery')}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Entrega Activa</h1>
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-primary)' }}>{order.orderNumber}</span>
            </div>

            <div style={{ padding: 16 }}>
                {/* Delivery Map */}
                <DeliveryMap
                    merchantId={order.merchantId}
                    deliveryAddress={order.deliveryAddress}
                    orderStatus={order.status}
                    height={220}
                    showNavigateButton={true}
                    style={{ marginBottom: 20 }}
                />

                {/* Current Status Banner */}
                {!isDelivered && (
                    <div style={{
                        background: pickupPhase ? 'var(--color-primary-bg)' : deliveryPhase ? '#dcfce7' : '#dbeafe',
                        borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <span style={{ fontSize: 24 }}>
                            {pickupPhase ? '📦' : deliveryPhase ? '🚀' : '🛵'}
                        </span>
                        <div>
                            <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                {pickupPhase ? 'Lleva el pedido al cliente' : deliveryPhase ? 'En camino al destino' : 'Pedido recogido'}
                            </p>
                            {isCash && (
                                <p style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 600 }}>
                                    💵 Cobrar ${order.totals?.total?.toFixed(2)} en efectivo
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Pickup Location */}
                <div style={{
                    background: 'var(--color-primary-bg)', borderRadius: 12, padding: 16, marginBottom: 12,
                    display: 'flex', alignItems: 'center', gap: 12,
                    opacity: deliveryPhase ? 0.6 : 1,
                }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <MapPin size={18} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Recoger en</p>
                        <p style={{ fontWeight: 700 }}>{merchant?.name}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{merchant?.address?.street}</p>
                    </div>
                    {merchantMapsUrl && (
                        <a href={merchantMapsUrl} target="_blank" rel="noopener noreferrer"
                            style={{
                                width: 36, height: 36, borderRadius: 8, background: '#4285F4',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                            <Navigation size={16} color="white" />
                        </a>
                    )}
                </div>

                {/* Delivery Location — PROMINENT */}
                <div style={{
                    background: '#dcfce7', borderRadius: 12, padding: 16, marginBottom: 12,
                    border: deliveryPhase ? '2px solid #16a34a' : '1px solid #bbf7d0',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 10, background: '#16a34a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <MapPin size={18} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Entregar en</p>
                            <p style={{ fontWeight: 700 }}>{order.deliveryAddress?.street || 'Centro, Tlapa'}</p>
                            {order.deliveryAddress?.colony && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{order.deliveryAddress.colony}</p>
                            )}
                        </div>
                        {deliveryMapsUrl && (
                            <a href={deliveryMapsUrl} target="_blank" rel="noopener noreferrer"
                                style={{
                                    width: 36, height: 36, borderRadius: 8, background: '#4285F4',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                <Navigation size={16} color="white" />
                            </a>
                        )}
                    </div>

                    {/* Reference — BIG AND PROMINENT */}
                    {order.deliveryAddress?.reference && (
                        <div style={{
                            marginTop: 12, padding: '10px 14px', borderRadius: 8,
                            background: '#f0fdf4', border: '1px dashed #86efac',
                        }}>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', marginBottom: 4, textTransform: 'uppercase' }}>
                                📝 Referencia
                            </p>
                            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#14532d', lineHeight: 1.4 }}>
                                {order.deliveryAddress.reference}
                            </p>
                        </div>
                    )}
                </div>

                {/* Contact Buttons */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {clientPhone && (
                        <a href={`tel:+52${clientPhone}`} className="btn btn-outline" style={{ flex: 1, fontSize: '0.8rem' }}>
                            <Phone size={14} /> Llamar cliente
                        </a>
                    )}
                    <a href={getWhatsAppLocationUrl()} target="_blank" rel="noopener noreferrer"
                        className="btn" style={{ flex: 1, background: '#25D366', color: 'white', fontSize: '0.8rem' }}>
                        <MessageCircle size={14} /> WhatsApp
                    </a>
                    {deliveryMapsUrl && (
                        <a href={deliveryMapsUrl} target="_blank" rel="noopener noreferrer"
                            className="btn" style={{ flex: 0.6, background: '#4285F4', color: 'white', fontSize: '0.8rem' }}>
                            <ExternalLink size={14} /> Maps
                        </a>
                    )}
                </div>

                {/* Order Items with modifiers */}
                <div style={{ background: 'var(--color-border-light)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.95rem' }}>
                        <Package size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        Productos ({order.items.length})
                    </h3>
                    {order.items.map((item, i) => (
                        <div key={i} style={{ marginBottom: 8, fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 600 }}>
                                    {item.quantity}x {item.name}
                                </span>
                                <span style={{ fontWeight: 600 }}>${item.subtotal?.toFixed?.(2) || item.subtotal}</span>
                            </div>
                            {/* Modifiers */}
                            {item.modifiers?.map((mod, mi) =>
                                mod.selected?.length > 0 && (
                                    <p key={mi} style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', paddingLeft: 16 }}>
                                        {mod.groupName}: {mod.selected.map(s => s.name).join(', ')}
                                    </p>
                                )
                            )}
                            {item.selectedExtras?.length > 0 && (
                                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', paddingLeft: 16 }}>
                                    + {item.selectedExtras.map(e => e.name).join(', ')}
                                </p>
                            )}
                            {item.removedIngredients?.length > 0 && (
                                <p style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, paddingLeft: 16 }}>
                                    ⛔ Sin: {item.removedIngredients.join(', ')}
                                </p>
                            )}
                            {item.notes && (
                                <p style={{ fontSize: '0.72rem', color: '#92400e', paddingLeft: 16, fontStyle: 'italic' }}>
                                    📝 {item.notes}
                                </p>
                            )}
                        </div>
                    ))}

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 8 }}>
                        {isCash && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>💵 Cobrar en efectivo</span>
                                <span style={{ fontWeight: 800, color: '#92400e' }}>${order.totals?.total?.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Tu ganancia</span>
                            <span style={{ fontWeight: 800, color: 'var(--color-success)' }}>${order.totals?.deliveryFee?.toFixed(0)}</span>
                        </div>
                    </div>
                </div>

                {/* FSM Action Button */}
                {actionButton && (
                    <button
                        className="btn btn-primary btn-block btn-lg"
                        style={{ background: actionButton.color, borderColor: actionButton.color }}
                        onClick={() => handleStatusUpdate(actionButton.next)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Procesando...' : actionButton.label}
                    </button>
                )}

                {/* Delivered State */}
                {isDelivered && (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <span style={{ fontSize: 64, display: 'block', marginBottom: 12 }}>🎉</span>
                        <h2 style={{ fontWeight: 800, marginBottom: 8 }}>¡Entrega completada!</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>
                            Ganaste ${order.totals?.deliveryFee?.toFixed(0)}
                        </p>
                        {isCash && order.payment?.cashCollected && (
                            <p style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                                💵 Efectivo cobrado: ${order.payment.cashCollected}
                            </p>
                        )}
                        <button className="btn btn-secondary" style={{ marginTop: 16 }}
                            onClick={() => navigate('/delivery')}>
                            Volver al inicio
                        </button>
                    </div>
                )}
            </div>

            {/* Cash Payment Modal */}
            {showCashModal && (
                <div className="modal-overlay" onClick={() => setShowCashModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
                        <div className="modal-handle" />
                        <div style={{ padding: 24, textAlign: 'center' }}>
                            <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>💵</span>
                            <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 8 }}>Cobro en Efectivo</h2>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>
                                Total del pedido:
                            </p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 20 }}>
                                ${order.totals?.total?.toFixed(2)}
                            </p>

                            <label style={{ display: 'block', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>
                                ¿Cuánto te pagó el cliente?
                            </label>
                            <div style={{ position: 'relative', marginBottom: 16 }}>
                                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--color-text-muted)' }}>$</span>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="0.00"
                                    value={cashAmount}
                                    onChange={e => setCashAmount(e.target.value)}
                                    autoFocus
                                    style={{ paddingLeft: 32, fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}
                                />
                            </div>

                            {cashAmount && parseFloat(cashAmount) > 0 && (
                                <div style={{
                                    padding: '8px 12px', borderRadius: 8, marginBottom: 16,
                                    background: parseFloat(cashAmount) >= order.totals?.total ? '#dcfce7' : '#fef2f2',
                                    fontSize: '0.8rem', fontWeight: 600,
                                    color: parseFloat(cashAmount) >= order.totals?.total ? '#166534' : '#991b1b',
                                }}>
                                    {parseFloat(cashAmount) >= order.totals?.total
                                        ? `✅ Cambio: $${(parseFloat(cashAmount) - order.totals.total).toFixed(2)}`
                                        : `⚠️ Faltan $${(order.totals.total - parseFloat(cashAmount)).toFixed(2)}`
                                    }
                                </div>
                            )}

                            {/* Quick amount buttons */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                                {[50, 100, 200, 500].map(amt => (
                                    <button key={amt} type="button"
                                        className="btn btn-ghost btn-sm"
                                        style={{
                                            border: '1px solid var(--color-border)', fontWeight: 700,
                                            background: cashAmount === String(amt) ? 'var(--color-primary-bg)' : 'white',
                                        }}
                                        onClick={() => setCashAmount(String(amt))}>
                                        ${amt}
                                    </button>
                                ))}
                                <button type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ border: '1px solid var(--color-border)', fontWeight: 700, color: 'var(--color-primary)' }}
                                    onClick={() => setCashAmount(String(order.totals?.total?.toFixed(2) || '0'))}>
                                    Exacto
                                </button>
                            </div>

                            <button
                                className="btn btn-primary btn-block btn-lg"
                                onClick={handleCashConfirm}
                                disabled={isProcessing || !cashAmount || parseFloat(cashAmount) <= 0}
                            >
                                {isProcessing ? 'Procesando...' : '✅ Confirmar Cobro y Entregar'}
                            </button>
                            <button
                                className="btn btn-ghost btn-block"
                                style={{ marginTop: 8 }}
                                onClick={() => setShowCashModal(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
