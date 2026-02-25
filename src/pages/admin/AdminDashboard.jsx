import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { useSmartDelivery } from '../../contexts/SmartDeliveryContext';
import { useState, useEffect } from 'react';
import { ORDER_STATUSES } from '../../data/seedData';
import { supabase } from '../../supabase';
import { BarChart3, ShoppingBag, Store, Truck, Users, Settings, LogOut, TrendingUp, DollarSign, LayoutGrid, CloudRain, AlertTriangle, Gift } from 'lucide-react';

export default function AdminDashboard() {
    const { logout } = useAuth();
    const { orders } = useOrders();
    const { weather, isRaining, getOverloadedMerchants } = useSmartDelivery();
    const navigate = useNavigate();
    const overloaded = getOverloadedMerchants();

    const totalSales = orders.filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + o.totals.total, 0);
    const todayOrders = orders.filter(o => {
        const today = new Date().toDateString();
        return new Date(o.createdAt).toDateString() === today;
    }).length;

    const [merchants, setMerchants] = useState([]);
    useEffect(() => {
        supabase.from('merchants').select('*').then(({ data }) => setMerchants(data || []));
    }, []);

    const kpis = [
        { label: 'Ventas Totales', value: `$${totalSales.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`, change: '+12.5%', positive: true, icon: TrendingUp },
        { label: 'Pedidos Hoy', value: todayOrders || orders.length, change: '+8.2%', positive: true, icon: ShoppingBag },
        { label: 'Comercios Activos', value: merchants.filter(m => m.status === 'open' || m.isOpen).length, change: '', positive: true, icon: Store },
        { label: 'Repartidores', value: '3', change: '2 en línea', positive: true, icon: Truck },
    ];

    // Weekly chart data
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const weekData = weekDays.map(() => Math.round(Math.random() * 5000 + 2000));
    const maxVal = Math.max(...weekData);

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="logo">Tlapa <span>Comida</span></div>
                <nav className="sidebar-nav">
                    <button className="sidebar-link active">
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
                    <button className="sidebar-link" onClick={() => navigate('/admin/orders')}>
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

            {/* Main */}
            <main className="admin-main">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Dashboard</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Bienvenido al panel de administración</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {weather && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 14px', borderRadius: 10,
                                background: isRaining ? '#dbeafe' : 'var(--color-border-light)',
                                fontSize: '0.82rem', fontWeight: 600,
                            }}>
                                <span style={{ fontSize: '1.1rem' }}>{weather.condition.icon}</span>
                                <span>{weather.temperature}°C</span>
                                {isRaining && (
                                    <span style={{
                                        padding: '2px 6px', borderRadius: 6,
                                        background: '#93c5fd', color: '#1e3a8a',
                                        fontSize: '0.68rem', fontWeight: 700,
                                    }}>Entregas afectadas</span>
                                )}
                            </div>
                        )}
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                </div>

                {/* Overload alerts */}
                {overloaded.length > 0 && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                        {overloaded.map(ml => (
                            <div key={ml.merchant.id} style={{
                                flex: 1, minWidth: 260,
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', borderRadius: 12,
                                background: ml.loadLevel === 'critical' ? '#fecaca' : '#fef3c7',
                                border: `1px solid ${ml.loadLevel === 'critical' ? '#f87171' : '#fbbf24'}`,
                            }}>
                                <AlertTriangle size={18} color={ml.loadLevel === 'critical' ? '#991b1b' : '#92400e'} />
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: '0.8rem', color: ml.loadLevel === 'critical' ? '#991b1b' : '#92400e' }}>
                                        {ml.merchant.name} — {ml.activeOrderCount} pedidos activos
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* KPIs */}
                <div className="kpi-grid">
                    {kpis.map((kpi, i) => (
                        <div key={i} className="kpi-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span className="kpi-label">{kpi.label}</span>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8,
                                    background: 'var(--color-primary-bg)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <kpi.icon size={18} color="var(--color-primary)" />
                                </div>
                            </div>
                            <div className="kpi-value">{kpi.value}</div>
                            {kpi.change && <div className={`kpi-change ${kpi.positive ? 'positive' : 'negative'}`}>{kpi.change}</div>}
                        </div>
                    ))}
                </div>

                {/* Weekly Chart */}
                <div style={{
                    background: 'var(--color-surface)', borderRadius: 16, padding: 24,
                    boxShadow: 'var(--shadow-sm)', marginBottom: 24,
                }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 24 }}>Ventas de la Semana</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: 160, gap: 16 }}>
                        {weekData.map((val, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                                    ${(val / 1000).toFixed(1)}k
                                </span>
                                <div style={{
                                    width: '100%', height: `${(val / maxVal) * 120}px`,
                                    background: `linear-gradient(to top, var(--color-primary), var(--color-primary-light))`,
                                    borderRadius: 8,
                                    opacity: 0.7 + (i / weekDays.length) * 0.3,
                                }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{weekDays[i]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Orders Table */}
                <div style={{
                    background: 'var(--color-surface)', borderRadius: 16,
                    boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
                }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-light)' }}>
                        <h3 style={{ fontWeight: 700 }}>Pedidos Recientes</h3>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Pedido</th>
                                <th>Restaurante</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                                        No hay pedidos registrados
                                    </td>
                                </tr>
                            ) : (
                                orders.slice(0, 10).map(order => {
                                    const merchant = merchants.find(m => m.id === order.merchantId);
                                    const statusInfo = ORDER_STATUSES[order.status];
                                    return (
                                        <tr key={order.id}>
                                            <td style={{ fontWeight: 700 }}>{order.orderNumber}</td>
                                            <td>{merchant?.name || '-'}</td>
                                            <td style={{ fontWeight: 600 }}>${order.totals.total.toFixed(0)}</td>
                                            <td>
                                                <span className={`badge badge-${statusInfo?.color || 'primary'}`}>
                                                    {statusInfo?.label || order.status}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>
                                                {new Date(order.createdAt).toLocaleDateString('es-MX')}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
