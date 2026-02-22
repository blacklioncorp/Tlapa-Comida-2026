import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { useSmartDelivery } from '../../contexts/SmartDeliveryContext';
import { MERCHANTS, ORDER_STATUSES, ALL_USERS } from '../../data/seedData';
import { rankDriversByProximity } from '../../services/SmartOrderManager';
import {
    BarChart3, Store, Users, ShoppingBag, Settings, LogOut, Search, Eye,
    Filter, DollarSign, LayoutGrid, CloudRain, AlertTriangle, Truck, Clock, Zap, MapPin, Gift
} from 'lucide-react';
import WeatherBanner from '../../components/WeatherBanner';

export default function OrdersManagement() {
    const { logout } = useAuth();
    const { orders, updateOrderStatus, assignDriver } = useOrders();
    const { weather, isRaining, getMerchantLoad, getOverloadedMerchants, getDriverRanking } = useSmartDelivery();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showDriverModal, setShowDriverModal] = useState(false);

    const statuses = ['all', ...Object.keys(ORDER_STATUSES)];

    const filtered = orders.filter(o => {
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        const matchesSearch = !search ||
            o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
            MERCHANTS.find(m => m.id === o.merchantId)?.name.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.totals.total, 0);
    const totalCommission = orders.filter(o => o.status === 'delivered').reduce((s, o) => {
        const merchant = MERCHANTS.find(m => m.id === o.merchantId);
        return s + (o.totals.subtotal * (merchant?.commissionRate || 0.15));
    }, 0);

    const overloaded = getOverloadedMerchants();
    const activeCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
    const avgWaitTime = orders
        .filter(o => !['delivered', 'cancelled'].includes(o.status))
        .reduce((sum, o) => sum + (Date.now() - new Date(o.createdAt).getTime()) / 60000, 0);
    const avgWait = activeCount > 0 ? Math.round(avgWaitTime / activeCount) : 0;

    // Smart assign driver to order
    const handleSmartAssign = (orderId) => {
        setSelectedOrder(orderId);
        setShowDriverModal(true);
    };

    const handleAssignDriver = (orderId, driverId) => {
        assignDriver(orderId, driverId);
        setShowDriverModal(false);
        setSelectedOrder(null);
    };

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="logo">Tlapa <span>Comida</span></div>
                <nav className="sidebar-nav">
                    <button className="sidebar-link" onClick={() => navigate('/admin')}>
                        <BarChart3 size={18} /> Dashboard
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/merchants')}>
                        <Store size={18} /> Comercios
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/categories')}>
                        <LayoutGrid size={18} /> Categorías
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/users')}>
                        <Users size={18} /> Usuarios
                    </button>
                    <button className="sidebar-link active">
                        <ShoppingBag size={18} /> Pedidos
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/promotions')}>
                        <Gift size={18} /> Promociones
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/finance')}>
                        <DollarSign size={18} /> Finanzas
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/settings')}>
                        <Settings size={18} /> Ajustes
                    </button>
                </nav>
                <div style={{ marginTop: 'auto' }}>
                    <button className="sidebar-link" onClick={logout}>
                        <LogOut size={18} /> Cerrar sesión
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Gestión de Pedidos</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            {orders.length} pedidos registrados · {activeCount} activos
                        </p>
                    </div>
                    {/* Weather indicator */}
                    {weather && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 16px', borderRadius: 12,
                            background: isRaining ? '#dbeafe' : 'var(--color-border-light)',
                            fontSize: '0.85rem', fontWeight: 600,
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>{weather.condition.icon}</span>
                            <span>{weather.temperature}°C · {weather.condition.label}</span>
                            {isRaining && (
                                <span style={{
                                    padding: '2px 8px', borderRadius: 6,
                                    background: '#93c5fd', color: '#1e3a8a',
                                    fontSize: '0.72rem', fontWeight: 700,
                                }}>
                                    +{Math.round((weather.condition.delayMultiplier - 1) * 100)}% demora
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Alerts Bar */}
                {(overloaded.length > 0 || isRaining) && (
                    <div style={{
                        display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap',
                    }}>
                        {isRaining && (
                            <div style={{
                                flex: 1, minWidth: 280,
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '12px 16px', borderRadius: 12,
                                background: 'linear-gradient(135deg, #dbeafe, #93c5fd)',
                                border: '1px solid #60a5fa',
                            }}>
                                <CloudRain size={20} color="#1e40af" />
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e3a8a' }}>
                                        {weather?.condition?.label} — Entregas afectadas
                                    </p>
                                    <p style={{ fontSize: '0.72rem', color: '#1e40af' }}>
                                        Tiempos aumentados ~{Math.round((weather?.condition?.delayMultiplier - 1) * 100)}% ·
                                        Recargo envío +${weather?.condition?.deliverySurcharge || 0}
                                    </p>
                                </div>
                            </div>
                        )}
                        {overloaded.map(ml => (
                            <div key={ml.merchant.id} style={{
                                flex: 1, minWidth: 280,
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '12px 16px', borderRadius: 12,
                                background: ml.loadLevel === 'critical' ?
                                    'linear-gradient(135deg, #fecaca, #fca5a5)' :
                                    'linear-gradient(135deg, #fef3c7, #fde68a)',
                                border: `1px solid ${ml.loadLevel === 'critical' ? '#f87171' : '#fbbf24'}`,
                            }}>
                                <AlertTriangle size={20} color={ml.loadLevel === 'critical' ? '#991b1b' : '#92400e'} />
                                <div>
                                    <p style={{
                                        fontWeight: 700, fontSize: '0.82rem',
                                        color: ml.loadLevel === 'critical' ? '#991b1b' : '#92400e',
                                    }}>
                                        {ml.merchant.name} — {ml.loadLevel === 'critical' ? '🚨 Saturado' : '⚠️ Alta demanda'}
                                    </p>
                                    <p style={{
                                        fontSize: '0.72rem',
                                        color: ml.loadLevel === 'critical' ? '#7f1d1d' : '#78350f',
                                    }}>
                                        {ml.activeOrderCount} pedidos activos · {ml.preparingCount} preparando ·
                                        +{Math.round((ml.prepTimeMultiplier - 1) * 100)}% tiempo prep.
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total Pedidos</p>
                        <p style={{ fontSize: '1.75rem', fontWeight: 800 }}>{orders.length}</p>
                    </div>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Entregados</p>
                        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-success)' }}>
                            {orders.filter(o => o.status === 'delivered').length}
                        </p>
                    </div>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Ingresos</p>
                        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                            ${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Espera Promedio</p>
                        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: avgWait > 30 ? 'var(--color-error)' : 'var(--color-info)' }}>
                            {avgWait} min
                        </p>
                    </div>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Comisiones</p>
                        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-info)' }}>
                            ${totalCommission.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="search-bar" style={{ maxWidth: 320, flex: 1 }}>
                        <Search size={18} />
                        <input placeholder="Buscar por # o restaurante..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="pills-container" style={{ flex: 1 }}>
                        {statuses.map(s => (
                            <button key={s} className={`pill ${statusFilter === s ? 'active' : ''}`}
                                onClick={() => setStatusFilter(s)}>
                                {s === 'all' ? 'Todos' : ORDER_STATUSES[s]?.icon + ' ' + (ORDER_STATUSES[s]?.label || s)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div style={{ background: 'var(--color-surface)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Pedido</th>
                                <th>Restaurante</th>
                                <th>Cliente</th>
                                <th>Productos</th>
                                <th>Total</th>
                                <th>Pago</th>
                                <th>Estado</th>
                                <th>Repartidor</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                                        <span style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>📋</span>
                                        No hay pedidos {statusFilter !== 'all' ? 'con este estado' : 'registrados'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(order => {
                                    const merchant = MERCHANTS.find(m => m.id === order.merchantId);
                                    const statusInfo = ORDER_STATUSES[order.status];
                                    const merchantLoad = getMerchantLoad(order.merchantId);
                                    const driver = order.driverId ? ALL_USERS.find(u => u.id === order.driverId) : null;
                                    const needsDriver = ['ready', 'searching_driver'].includes(order.status) && !order.driverId;

                                    return (
                                        <tr key={order.id}>
                                            <td style={{ fontWeight: 700 }}>{order.orderNumber}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {merchant && <img src={merchant.logoUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />}
                                                    <div>
                                                        <span>{merchant?.name || '—'}</span>
                                                        {merchantLoad.loadLevel !== 'low' && (
                                                            <span style={{
                                                                display: 'block',
                                                                fontSize: '0.65rem',
                                                                fontWeight: 700,
                                                                color: merchantLoad.loadLevel === 'critical' ? '#991b1b' : '#92400e',
                                                            }}>
                                                                {merchantLoad.icon} {merchantLoad.activeOrderCount} pedidos
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--color-text-secondary)' }}>
                                                {order.deliveryAddress?.street || 'Centro'}
                                            </td>
                                            <td>{order.items.length} items</td>
                                            <td style={{ fontWeight: 700 }}>${order.totals.total.toFixed(0)}</td>
                                            <td>
                                                <span className={`badge ${order.payment.method === 'cash' ? 'badge-success' : 'badge-info'}`}>
                                                    {order.payment.method === 'cash' ? '💵 Efectivo' : '💳 MercadoPago'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${statusInfo?.color || 'primary'}`}>
                                                    {statusInfo?.icon} {statusInfo?.label || order.status}
                                                </span>
                                            </td>
                                            <td>
                                                {driver ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{
                                                            width: 24, height: 24, borderRadius: '50%',
                                                            background: 'var(--color-primary-bg)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            overflow: 'hidden',
                                                        }}>
                                                            {driver.avatarUrl ? (
                                                                <img src={driver.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <Truck size={12} color="var(--color-primary)" />
                                                            )}
                                                        </div>
                                                        <span style={{ fontSize: '0.78rem' }}>{driver.displayName}</span>
                                                    </div>
                                                ) : needsDriver ? (
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                                                        onClick={() => handleSmartAssign(order.id)}
                                                    >
                                                        <Zap size={12} /> Asignar
                                                    </button>
                                                ) : (
                                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                                {new Date(order.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                                <br />
                                                {new Date(order.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Smart Driver Assignment Modal */}
                {showDriverModal && selectedOrder && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000,
                    }}>
                        <div style={{
                            background: 'white', borderRadius: 20, padding: 24,
                            maxWidth: 480, width: '90%', maxHeight: '80vh', overflow: 'auto',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>🛵 Asignar Repartidor</h3>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowDriverModal(false)} style={{ fontSize: '1.2rem' }}>✕</button>
                            </div>

                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                                Repartidores ordenados por cercanía al restaurante
                            </p>

                            {(() => {
                                const order = orders.find(o => o.id === selectedOrder);
                                if (!order) return null;
                                const driverRanking = getDriverRanking(order.merchantId);

                                return driverRanking.map((dr, index) => (
                                    <div key={dr.driver.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '12px 14px', borderRadius: 12, marginBottom: 8,
                                        background: index === 0 ? 'var(--color-success-bg)' : 'var(--color-border-light)',
                                        border: index === 0 ? '2px solid var(--color-success)' : '1px solid var(--color-border)',
                                        opacity: dr.isBusy ? 0.5 : 1,
                                    }}>
                                        {/* Rank */}
                                        <div style={{
                                            width: 28, height: 28, borderRadius: '50%',
                                            background: index === 0 ? 'var(--color-success)' : 'var(--color-text-muted)',
                                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 800, fontSize: '0.8rem', flexShrink: 0,
                                        }}>
                                            {index + 1}
                                        </div>

                                        {/* Avatar */}
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '50%',
                                            overflow: 'hidden', flexShrink: 0,
                                            background: 'var(--color-primary-bg)',
                                        }}>
                                            {dr.driver.avatarUrl ? (
                                                <img src={dr.driver.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛵</div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{dr.driver.displayName}</span>
                                                {dr.isBusy && (
                                                    <span style={{
                                                        padding: '1px 6px', borderRadius: 4,
                                                        background: '#fecaca', color: '#991b1b',
                                                        fontSize: '0.6rem', fontWeight: 700,
                                                    }}>Ocupado</span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                                <span>📍 {dr.distance.toFixed(1)} km</span>
                                                <span>⏱️ ~{dr.estimatedPickupMinutes} min</span>
                                                <span>{dr.vehicleType === 'moto' ? '🏍️' : '🚲'} {dr.vehicleType}</span>
                                                <span>⭐ {dr.rating}</span>
                                            </div>
                                        </div>

                                        {/* Assign button */}
                                        <button
                                            className="btn btn-primary"
                                            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                                            onClick={() => handleAssignDriver(selectedOrder, dr.driver.id)}
                                            disabled={dr.isBusy}
                                        >
                                            Asignar
                                        </button>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
