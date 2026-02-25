import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { ORDER_STATUSES } from '../../data/seedData';
import { supabase } from '../../supabase';
import {
    LayoutDashboard, UtensilsCrossed, Clock, CheckCircle2,
    ArrowRight, Star, TrendingUp, DollarSign, LogOut,
    Settings, ShoppingBag, Bell, AlertCircle, Power, Volume2, VolumeX,
    ChevronRight, Package, MapPin, Phone
} from 'lucide-react';

// New order notification sound (we create a simple beep)
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.3;
        osc.start();
        // Three beeps
        setTimeout(() => { gain.gain.value = 0; }, 200);
        setTimeout(() => { gain.gain.value = 0.3; }, 400);
        setTimeout(() => { gain.gain.value = 0; }, 600);
        setTimeout(() => { gain.gain.value = 0.3; }, 800);
        setTimeout(() => { osc.stop(); ctx.close(); }, 1100);
    } catch (e) {
        console.warn('Could not play notification sound:', e);
    }
}

export default function MerchantDashboard() {
    const { user, logout } = useAuth();
    const { orders, updateOrderStatus, cancelOrder } = useOrders();
    const navigate = useNavigate();
    const prevNewOrderCount = useRef(0);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Find the merchant associated with the logged-in user
    const [merchantData, setMerchantData] = useState(null);
    const [isOpen, setIsOpen] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        const fetchMerchant = async () => {
            if (!user?.merchantId) return;
            try {
                const { data, error } = await supabase.from('merchants').select('*').eq('id', user.merchantId).single();
                if (data) {
                    setMerchantData(data);
                    setIsOpen(data.status === 'open' || data.isOpen === true);
                }
            } catch (err) {
                console.error("Error loading merchant stats:", err);
            }
        };
        fetchMerchant();
    }, [user?.merchantId]);

    // Toggle online/offline
    const toggleOnline = async () => {
        if (!merchantData) return;
        const newVal = !isOpen;
        setIsOpen(newVal); // Optimistic UI update
        try {
            const { error } = await supabase.from('merchants').update({
                status: newVal ? 'open' : 'closed',
                isOpen: newVal
            }).eq('id', merchantData.id);
            if (error) throw error;
        } catch (err) {
            console.error("Failed to toggle online status:", err);
            setIsOpen(!newVal); // Revert on failure
        }
    };

    // Filter orders for this merchant
    const merchantOrders = orders.filter(o => o.merchantId === user?.merchantId);
    const activeOrders = merchantOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
    const newOrders = activeOrders.filter(o => o.status === 'created');
    const preparingOrders = activeOrders.filter(o => o.status === 'preparing');
    const confirmedOrders = activeOrders.filter(o => o.status === 'confirmed');
    const readyOrders = activeOrders.filter(o => ['ready', 'searching_driver'].includes(o.status));
    const todayDelivered = merchantOrders.filter(o => o.status === 'delivered');

    // Play notification when new orders arrive
    useEffect(() => {
        if (newOrders.length > prevNewOrderCount.current && soundEnabled) {
            playNotificationSound();
        }
        prevNewOrderCount.current = newOrders.length;
    }, [newOrders.length, soundEnabled]);

    const handleTransition = async (orderId, newStatus) => {
        setProcessingId(orderId);
        try {
            await updateOrderStatus(orderId, newStatus, user?.id || 'merchant');
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setProcessingId(null);
    };

    const handleReject = async (orderId) => {
        if (!window.confirm('¿Rechazar este pedido? El cliente será notificado.')) return;
        setProcessingId(orderId);
        try {
            await cancelOrder(orderId, user?.id || 'merchant', 'Rechazado por el restaurante');
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setProcessingId(null);
    };

    // FSM-aware action for each order
    const getOrderAction = (order) => {
        switch (order.status) {
            case 'created':
                return { label: '✅ Aceptar', next: 'confirmed', color: '#16a34a', canReject: true };
            case 'confirmed':
                return { label: '👨‍🍳 Preparando', next: 'preparing', color: '#2563eb' };
            case 'preparing':
                return { label: '📦 Listo', next: 'ready', color: '#f59e0b' };
            case 'ready':
                return { label: '🔍 Buscar repartidor', next: 'searching_driver', color: '#8b5cf6' };
            default:
                return null;
        }
    };

    const kpis = [
        { label: 'Pedidos Hoy', value: merchantOrders.length, icon: ShoppingBag, color: 'var(--color-primary)' },
        { label: 'Ingresos', value: `$${todayDelivered.reduce((sum, o) => sum + (o.totals?.subtotal || 0), 0).toLocaleString()}`, icon: DollarSign, color: 'var(--color-success)' },
        { label: 'Rating', value: merchantData?.rating || '5.0', icon: Star, color: 'var(--color-warning)' },
        { label: 'En curso', value: activeOrders.length, icon: Clock, color: 'var(--color-info)' },
    ];

    // Render a single order card
    const renderOrderCard = (order) => {
        const statusInfo = ORDER_STATUSES[order.status];
        const action = getOrderAction(order);
        const isCash = order.payment?.method === 'cash';
        const isNew = order.status === 'created';
        const minutesAgo = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000);

        return (
            <div key={order.id} style={{
                padding: 16, border: isNew ? '1px solid #bbf7d0' : '1px solid var(--color-border-light)',
                borderLeft: isNew ? '6px solid #16a34a' : '1px solid var(--color-border-light)',
                borderRadius: 12, background: isNew ? '#f0fdf4' : 'white',
                animation: isNew ? 'softAlert 2.5s infinite' : undefined,
                transition: 'all 0.3s ease',
            }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                            {order.orderNumber || `#${order.id.slice(-5).toUpperCase()}`}
                        </span>
                        <span className={`badge badge-${statusInfo?.color || 'primary'}`} style={{ fontSize: '0.65rem' }}>
                            {statusInfo?.icon} {statusInfo?.label || order.status}
                        </span>
                        {isCash && (
                            <span style={{
                                padding: '2px 6px', borderRadius: 4, background: '#fef3c7',
                                fontSize: '0.6rem', fontWeight: 700, color: '#92400e',
                            }}>
                                💵 Efectivo
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        hace {minutesAgo} min
                    </span>
                </div>

                {/* Items summary */}
                <div style={{ marginBottom: 8 }}>
                    {order.items.map((item, i) => (
                        <div key={i} style={{ fontSize: '0.82rem', marginBottom: 2 }}>
                            <span style={{ fontWeight: 600 }}>{item.quantity}x</span>{' '}
                            <span>{item.name}</span>
                            {item.modifiers?.map((mod, mi) =>
                                mod.selected?.length > 0 && (
                                    <span key={mi} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                        {' '}({mod.groupName}: {mod.selected.map(s => s.name).join(', ')})
                                    </span>
                                )
                            )}
                            {item.removedIngredients?.length > 0 && (
                                <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>
                                    {' '}⛔ Sin: {item.removedIngredients.join(', ')}
                                </span>
                            )}
                        </div>
                    ))}
                    {order.notes && (
                        <p style={{ fontSize: '0.72rem', color: '#92400e', fontStyle: 'italic', marginTop: 4 }}>
                            📝 "{order.notes}"
                        </p>
                    )}
                </div>

                {/* Delivery address + reference */}
                {order.deliveryAddress && (
                    <div style={{
                        fontSize: '0.75rem', color: 'var(--color-text-secondary)',
                        display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8,
                        padding: '6px 8px', borderRadius: 6, background: '#f9fafb',
                    }}>
                        <MapPin size={12} style={{ marginTop: 2, flexShrink: 0, color: 'var(--color-primary)' }} />
                        <div>
                            <span style={{ fontWeight: 600 }}>{order.deliveryAddress.street}</span>
                            {order.deliveryAddress.reference && (
                                <span style={{ display: 'block', fontSize: '0.7rem', fontStyle: 'italic', color: '#6b7280' }}>
                                    Ref: {order.deliveryAddress.reference}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Total + Action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-primary)' }}>
                        ${order.totals?.total?.toFixed?.(2) || order.totals?.total}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {action?.canReject && (
                            <button
                                className="btn btn-sm"
                                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', fontWeight: 700 }}
                                onClick={() => handleReject(order.id)}
                                disabled={processingId === order.id}
                            >
                                ✕ Rechazar
                            </button>
                        )}
                        {action && (
                            <button
                                className="btn btn-sm"
                                style={{ background: action.color, color: 'white', border: 'none', fontWeight: 700, minWidth: 120 }}
                                onClick={() => handleTransition(order.id, action.next)}
                                disabled={processingId === order.id}
                            >
                                {processingId === order.id ? '...' : action.label}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar" style={{ background: '#111827' }}>
                <div className="logo" style={{ color: 'white' }}>Tlapa <span>Comercio</span></div>
                <nav className="sidebar-nav">
                    <button className="sidebar-link active" style={{ color: 'white' }}>
                        <LayoutDashboard size={18} /> Dashboard
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/merchant/menu')} style={{ color: '#9ca3af' }}>
                        <UtensilsCrossed size={18} /> Menú / Platillos
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/merchant/orders')} style={{ color: '#9ca3af' }}>
                        <ShoppingBag size={18} /> Historial Pedidos
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/merchant/settings')} style={{ color: '#9ca3af' }}>
                        <Settings size={18} /> Ajustes Local
                    </button>
                </nav>
                <div style={{ marginTop: 'auto' }}>
                    <button className="sidebar-link" onClick={logout} style={{ color: '#ef4444' }}>
                        <LogOut size={18} /> Cerrar sesión
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1>Panel de {merchantData?.name || 'Comercio'}</h1>
                        <p>
                            {newOrders.length > 0 ? (
                                <span style={{ color: '#16a34a', fontWeight: 700 }}>
                                    🔔 {newOrders.length} pedido{newOrders.length !== 1 ? 's' : ''} nuevo{newOrders.length !== 1 ? 's' : ''} esperando
                                </span>
                            ) : (
                                `${activeOrders.length} pedido${activeOrders.length !== 1 ? 's' : ''} activo${activeOrders.length !== 1 ? 's' : ''}`
                            )}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {/* Sound toggle */}
                        <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            title={soundEnabled ? 'Silenciar notificaciones' : 'Activar notificaciones'}
                        >
                            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        </button>
                        {/* Online/Offline Toggle */}
                        <button
                            onClick={toggleOnline}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 16px', borderRadius: 12,
                                border: `2px solid ${isOpen ? '#16a34a' : '#ef4444'}`,
                                background: isOpen ? '#dcfce7' : '#fee2e2',
                                cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                color: isOpen ? '#16a34a' : '#ef4444',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            <Power size={16} />
                            {isOpen ? '🟢 Abierto' : '🔴 Cerrado'}
                        </button>
                    </div>
                </header>

                <div className="admin-content">
                    {/* KPI Cards */}
                    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
                        {kpis.map((kpi, i) => (
                            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${kpi.color}15`, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <kpi.icon size={24} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>{kpi.label}</p>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{kpi.value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* New Orders — TOP PRIORITY */}
                    {newOrders.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Bell size={18} color="#16a34a" />
                                Nuevos Pedidos ({newOrders.length})
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {newOrders.map(renderOrderCard)}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
                        {/* Active Orders — grouped by status */}
                        <div>
                            {/* Confirmed — needs to start preparing */}
                            {confirmedOrders.length > 0 && (
                                <div style={{ marginBottom: 20 }}>
                                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 10, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        ✅ Confirmados ({confirmedOrders.length})
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {confirmedOrders.map(renderOrderCard)}
                                    </div>
                                </div>
                            )}

                            {/* Preparing — cooking */}
                            {preparingOrders.length > 0 && (
                                <div style={{ marginBottom: 20 }}>
                                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 10, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        👨‍🍳 En preparación ({preparingOrders.length})
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {preparingOrders.map(renderOrderCard)}
                                    </div>
                                </div>
                            )}

                            {/* Ready — waiting for driver */}
                            {readyOrders.length > 0 && (
                                <div style={{ marginBottom: 20 }}>
                                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 10, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        📦 Listos / Buscando repartidor ({readyOrders.length})
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {readyOrders.map(renderOrderCard)}
                                    </div>
                                </div>
                            )}

                            {activeOrders.length === 0 && (
                                <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                                    <AlertCircle size={40} color="var(--color-text-muted)" style={{ marginBottom: 16 }} />
                                    <p style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>No hay pedidos activos en este momento.</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                        Los nuevos pedidos aparecerán aquí con un sonido de notificación 🔔
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Summary / Stats */}
                        <div>
                            <div className="card" style={{ marginBottom: 20 }}>
                                <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Rendimiento</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Tiempo promedio</span>
                                            <span style={{ fontWeight: 700 }}>24 min</span>
                                        </div>
                                        <div style={{ height: 6, background: 'var(--color-border-light)', borderRadius: 3 }}>
                                            <div style={{ height: '100%', width: '70%', background: 'var(--color-primary)', borderRadius: 3 }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Calidad comida</span>
                                            <span style={{ fontWeight: 700 }}>4.9/5.0</span>
                                        </div>
                                        <div style={{ height: 6, background: 'var(--color-border-light)', borderRadius: 3 }}>
                                            <div style={{ height: '100%', width: '95%', background: '#10b981', borderRadius: 3 }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Entregas hoy</span>
                                            <span style={{ fontWeight: 700 }}>{todayDelivered.length}</span>
                                        </div>
                                        <div style={{ height: 6, background: 'var(--color-border-light)', borderRadius: 3 }}>
                                            <div style={{ height: '100%', width: `${Math.min(100, todayDelivered.length * 10)}%`, background: '#f59e0b', borderRadius: 3 }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Completed */}
                            <div className="card">
                                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12 }}>Últimos completados</h3>
                                {todayDelivered.length === 0 ? (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Sin entregas completadas hoy</p>
                                ) : (
                                    todayDelivered.slice(0, 5).map(order => (
                                        <div key={order.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 0', borderBottom: '1px solid var(--color-border-light)',
                                            fontSize: '0.82rem',
                                        }}>
                                            <span style={{ fontWeight: 600 }}>{order.orderNumber}</span>
                                            <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                                                ${order.totals?.total?.toFixed(0)} ✓
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
