import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '../../contexts/OrderContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';
import { ArrowLeft, Navigation, Phone, MessageCircle, MapPin, Check, DollarSign, Package, ChevronRight, ExternalLink, ShieldAlert } from 'lucide-react';
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

    // Merchant state
    const [merchant, setMerchant] = useState(null);

    useEffect(() => {
        if (order?.merchantId) {
            supabase.from('merchants').select('*').eq('id', order.merchantId).single()
                .then(({ data }) => setMerchant(data))
                .catch(console.error);
        }
    }, [order?.merchantId]);

    if (!order) return <div className="app-container"><div className="loading-page"><div className="spinner" /></div></div>;

    const isDelivered = order.status === 'delivered';
    const isCash = order.payment?.method === 'cash';

    // Get client contact
    const clientPhone = order.deliveryAddress?.phone || '';

    // Action flow handler
    const handleStatusUpdate = async (newStatus) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            if (newStatus === 'delivered' && isCash && order.payment?.status !== 'collected') {
                setShowCashModal(true);
                setIsProcessing(false);
                return;
            }

            await updateOrderStatus(orderId, newStatus, user?.id || 'driver');
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
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setIsProcessing(false);
    };

    // Determine current phase and button text
    const getActionData = () => {
        switch (order.status) {
            case 'assigned':
            case 'searching_driver': // just in case
                return { label: 'LLEGUÉ AL RESTAURANTE', next: 'picked_up', instruction: 'Dirígete al restaurante', dest: merchant?.name };
            case 'picked_up':
                return { label: 'COMENZAR VIAJE', next: 'on_the_way', instruction: 'Recolecta el pedido', dest: merchant?.name };
            case 'on_the_way':
                return { label: 'ENTREGAR PEDIDO', next: 'delivered', instruction: 'Dirígete al cliente', dest: order.deliveryAddress?.street || 'Cliente' };
            default:
                return { label: 'ENTREGADO', next: null, instruction: 'Pedido completado', dest: '' };
        }
    };
    const actionData = getActionData();

    // Render Success View
    if (isDelivered) {
        return (
            <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
                <div style={{ padding: 24, paddingTop: 64, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 10px 30px rgba(16,185,129,0.3)' }}>
                        <Check size={64} color="white" strokeWidth={3} />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>¡Entrega completada!</h1>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: 40 }}>Has finalizado el viaje con éxito.</p>

                    <div style={{ width: '100%', background: 'white', borderRadius: 24, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Tus Ganancias</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>${order.totals?.deliveryFee?.toFixed(2)}</span>
                        </div>
                        {isCash && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Efectivo Cobrado</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>${order.totals?.total?.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <button onClick={() => navigate('/delivery')} style={{
                        marginTop: 'auto', width: '100%', padding: 18, background: '#ea580c', color: 'white', border: 'none', borderRadius: 16, fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(234,88,12,0.3)'
                    }}>
                        Listo para el siguiente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container" style={{ padding: 0, height: '100vh', overflow: 'hidden', position: 'relative' }}>
            {/* Fullscreen Map */}
            <div className="fullscreen-map-container" style={{ zIndex: 0 }}>
                <DeliveryMap
                    merchantId={order.merchantId}
                    deliveryAddress={order.deliveryAddress}
                    orderStatus={order.status}
                    height="100vh"
                    showNavigateButton={false}
                />
            </div>

            {/* Top Back Button & Instruction Card */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '16px 16px 0', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <button style={{
                        pointerEvents: 'auto', width: 48, height: 48, borderRadius: 16, background: 'white', border: 'none',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }} onClick={() => navigate('/delivery')}>
                        <ArrowLeft size={24} color="#0f172a" />
                    </button>
                    <div className="driver-dark-card" style={{ flex: 1, pointerEvents: 'auto' }}>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Siguiente instrucción</p>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Navigation size={18} color="#ea580c" />
                            {actionData.instruction}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Bottom Dark Sheet */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
                background: '#1c1c1e', color: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32,
                padding: '24px', boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                <div style={{ width: 40, height: 5, background: '#3f3f46', borderRadius: 3, margin: '0 auto 20px' }} />

                {/* Metrics */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid #27272a', paddingBottom: 20 }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#10b981' }}>~15<span style={{ fontSize: '1rem' }}>min</span></h2>
                        <p style={{ fontSize: '0.8rem', color: '#a1a1aa', margin: 0 }}>Tiempo estimado</p>
                    </div>
                    <div style={{ width: 1, background: '#27272a' }} />
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#ea580c' }}>1.2<span style={{ fontSize: '1rem' }}>km</span></h2>
                        <p style={{ fontSize: '0.8rem', color: '#a1a1aa', margin: 0 }}>Distancia restante</p>
                    </div>
                </div>

                {/* Order Details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 16, background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={24} color="#f8fafc" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{actionData.dest}</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#a1a1aa' }}>Pedido {order.orderNumber}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <a href={clientPhone ? `tel:+52${clientPhone}` : '#'} style={{ width: 40, height: 40, borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <Phone size={18} />
                        </a>
                        <a href={`https://wa.me/52${clientPhone}`} target="_blank" rel="noopener noreferrer" style={{ width: 40, height: 40, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <MessageCircle size={18} />
                        </a>
                    </div>
                </div>

                {/* Info Note (References or Modifiers if important) */}
                {order.deliveryAddress?.reference && actionData.next === 'delivered' && (
                    <div style={{ background: '#27272a', borderRadius: 12, padding: 12, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <MapPin size={20} color="#fbbf24" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: '0.85rem', color: '#e4e4e7', margin: 0, lineHeight: 1.4 }}>{order.deliveryAddress.reference}</p>
                    </div>
                )}

                {isCash && actionData.next === 'delivered' && (
                    <div style={{ background: '#451a03', border: '1px solid #78350f', borderRadius: 12, padding: 12, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                        <DollarSign size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: '0.9rem', color: '#fef3c7', margin: 0, fontWeight: 600 }}>Cobrar en efectivo: ${order.totals?.total?.toFixed(2)}</p>
                    </div>
                )}

                {/* Main Action Button */}
                <button
                    onClick={() => handleStatusUpdate(actionData.next)}
                    disabled={isProcessing}
                    style={{
                        width: '100%', padding: 18, borderRadius: 16, border: 'none',
                        background: '#ea580c', color: 'white', fontSize: '1.1rem', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        cursor: 'pointer', transition: 'transform 0.1s', opacity: isProcessing ? 0.7 : 1
                    }}
                    onMouseDown={(e) => !isProcessing && (e.currentTarget.style.transform = 'scale(0.98)')}
                    onMouseUp={(e) => !isProcessing && (e.currentTarget.style.transform = 'scale(1)')}
                    onMouseLeave={(e) => !isProcessing && (e.currentTarget.style.transform = 'scale(1)')}
                >
                    {isProcessing ? 'Procesando...' : actionData.label}
                    {!isProcessing && <ChevronRight size={20} />}
                </button>
            </div>

            {/* Cash Modal Overlay */}
            {showCashModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#1c1c1e', borderRadius: 24, width: '100%', maxWidth: 400, padding: 24, color: 'white', border: '1px solid #3f3f46' }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#451a03', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <DollarSign size={32} color="#f59e0b" />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0' }}>Cobro en Efectivo</h2>
                            <p style={{ fontSize: '0.9rem', color: '#a1a1aa', margin: 0 }}>Debes cobrar el total exacto</p>
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: 32 }}>
                            <p style={{ fontSize: '3rem', fontWeight: 900, color: '#f59e0b', margin: 0 }}>${order.totals?.total?.toFixed(2)}</p>
                        </div>

                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#a1a1aa', marginBottom: 8, fontWeight: 600 }}>¿Cuánto te pagó el cliente?</label>
                        <input
                            type="number"
                            value={cashAmount}
                            onChange={e => setCashAmount(e.target.value)}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '16px 20px', background: '#27272a', border: '2px solid #3f3f46', borderRadius: 16, color: 'white', fontSize: '1.25rem', fontWeight: 700, outline: 'none', marginBottom: 24, textAlign: 'center' }}
                            autoFocus
                        />

                        <button onClick={handleCashConfirm} disabled={isProcessing || !cashAmount} style={{
                            width: '100%', padding: 18, background: '#10b981', color: 'white', border: 'none', borderRadius: 16, fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', marginBottom: 12
                        }}>
                            {isProcessing ? 'Procesando...' : 'Confirmar Cobro'}
                        </button>
                        <button onClick={() => setShowCashModal(false)} style={{
                            width: '100%', padding: 18, background: 'transparent', color: '#a1a1aa', border: 'none', borderRadius: 16, fontSize: '1rem', fontWeight: 600, cursor: 'pointer'
                        }}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
