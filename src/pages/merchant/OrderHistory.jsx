import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { ORDER_STATUSES } from '../../data/seedData';
import {
    LayoutDashboard, UtensilsCrossed, ShoppingBag, Settings,
    LogOut, Search, Calendar, Filter, Star, ArrowLeft
} from 'lucide-react';

export default function MerchantOrderHistory() {
    const { user, logout } = useAuth();
    const { orders } = useOrders();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState('all'); // all, today, week, month

    const merchantOrders = useMemo(() => {
        return orders
            .filter(o => o.merchantId === user?.merchantId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [orders, user?.merchantId]);

    const filteredOrders = useMemo(() => {
        return merchantOrders.filter(o => {
            const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
            const matchesSearch = !searchTerm ||
                o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.items?.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));

            let matchesDate = true;
            if (dateRange !== 'all') {
                const orderDate = new Date(o.createdAt);
                const now = new Date();
                if (dateRange === 'today') {
                    matchesDate = orderDate.toDateString() === now.toDateString();
                } else if (dateRange === 'week') {
                    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                    matchesDate = orderDate >= weekAgo;
                } else if (dateRange === 'month') {
                    matchesDate = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
                }
            }

            return matchesStatus && matchesSearch && matchesDate;
        });
    }, [merchantOrders, statusFilter, searchTerm, dateRange]);

    const totalRevenue = filteredOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + o.totals.total, 0);

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar" style={{ background: '#111827' }}>
                <div className="logo" style={{ color: 'white' }}>Tlapa <span>Commercio</span></div>
                <nav className="sidebar-nav">
                    <button className="sidebar-link" onClick={() => navigate('/merchant')} style={{ color: '#9ca3af' }}>
                        <LayoutDashboard size={18} /> Dashboard
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/merchant/menu')} style={{ color: '#9ca3af' }}>
                        <UtensilsCrossed size={18} /> Menú / Platillos
                    </button>
                    <button className="sidebar-link active" style={{ color: 'white' }}>
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
                        <h1>Historial de Pedidos</h1>
                        <p>Todos los pedidos de tu comercio.</p>
                    </div>
                </header>

                <div className="admin-content">
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Total pedidos</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{filteredOrders.length}</h3>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Completados</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>
                                {filteredOrders.filter(o => o.status === 'delivered').length}
                            </h3>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Ingresos</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                                ${totalRevenue.toLocaleString()}
                            </h3>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
                                <Search size={18} color="var(--color-text-muted)" />
                                <input
                                    type="text"
                                    placeholder="Buscar por # pedido o producto..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select
                                className="form-input"
                                style={{ width: 'auto', minWidth: 140 }}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Todos los estados</option>
                                <option value="delivered">✅ Entregados</option>
                                <option value="cancelled">❌ Cancelados</option>
                                <option value="created">🆕 Nuevos</option>
                                <option value="confirmed">✅ Confirmados</option>
                                <option value="preparing">🍳 En preparación</option>
                                <option value="ready">📦 Listos</option>
                                <option value="on_the_way">🚀 En camino</option>
                            </select>
                            <select
                                className="form-input"
                                style={{ width: 'auto', minWidth: 120 }}
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                            >
                                <option value="all">Todo el tiempo</option>
                                <option value="today">Hoy</option>
                                <option value="week">Esta semana</option>
                                <option value="month">Este mes</option>
                            </select>
                        </div>
                    </div>

                    {/* Orders Table */}
                    <div className="card no-padding overflow-hidden">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th># Pedido</th>
                                    <th>Productos</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                    <th>Fecha</th>
                                    <th>Calificación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                                            <span style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>📋</span>
                                            No se encontraron pedidos
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map(order => {
                                        const statusInfo = ORDER_STATUSES[order.status];
                                        return (
                                            <tr key={order.id}>
                                                <td style={{ fontWeight: 700 }}>{order.orderNumber || `#${order.id.slice(-5).toUpperCase()}`}</td>
                                                <td>
                                                    <div style={{ fontSize: '0.85rem' }}>
                                                        {order.items?.slice(0, 2).map(i => i.name).join(', ')}
                                                        {order.items?.length > 2 && ` +${order.items.length - 2} más`}
                                                    </div>
                                                </td>
                                                <td style={{ fontWeight: 700 }}>${order.totals?.total?.toFixed(0) || 0}</td>
                                                <td>
                                                    <span className={`badge badge-${statusInfo?.color || 'primary'}`}>
                                                        {statusInfo?.icon} {statusInfo?.label || order.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                    {new Date(order.createdAt).toLocaleDateString('es-MX', {
                                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </td>
                                                <td>
                                                    {order.rating ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Star size={14} fill="var(--color-warning)" color="var(--color-warning)" />
                                                            <span style={{ fontWeight: 700 }}>{order.rating}</span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
