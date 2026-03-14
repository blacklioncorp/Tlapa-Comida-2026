import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { ORDER_STATUSES } from '../../data/seedData';
import MerchantSidebar from '../../components/merchant/MerchantSidebar';
import LiveOrderTrackingModal from '../../components/merchant/LiveOrderTrackingModal';
import {
    Search, Star, Menu, ChevronDown, ChevronUp, MapPin, User, Bike, Package
} from 'lucide-react';

export default function MerchantOrderHistory() {
    const { user, logout } = useAuth();
    const { orders } = useOrders();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState('all');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [trackingOrder, setTrackingOrder] = useState(null);

    const toggleExpand = (orderId) => {
        setExpandedOrderId(prev => prev === orderId ? null : orderId);
    };

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
            <MerchantSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="admin-main">
                <header className="admin-header responsive-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1>Historial de Pedidos</h1>
                            <p>Todos los pedidos de tu comercio.</p>
                        </div>
                    </div>
                </header>

                <div className="admin-content">
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16, marginBottom: 24 }}>
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
                                    <th></th>
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
                                            <React.Fragment key={order.id}>
                                                <tr
                                                    onClick={() => toggleExpand(order.id)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        background: expandedOrderId === order.id ? '#f8fafc' : 'white',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{order.orderNumber || `#${order.id.slice(-5).toUpperCase()}`}</td>
                                                    <td>
                                                        <div style={{ fontSize: '0.85rem' }}>
                                                            {order.items?.slice(0, 2).map(i => i.name).join(', ')}
                                                            {order.items?.length > 2 && ` +${order.items.length - 2} más`}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: 800 }}>${order.totals?.total?.toFixed(0) || 0}</td>
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
                                                    <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                                                        {expandedOrderId === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </td>
                                                </tr>
                                                
                                                {/* Expanded Details Row */}
                                                {expandedOrderId === order.id && (
                                                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-primary)' }}>
                                                        <td colSpan="7" style={{ padding: '0 24px 24px' }}>
                                                            <div style={{
                                                                borderTop: '1px solid var(--color-border-light)',
                                                                paddingTop: 20,
                                                                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24
                                                            }}>
                                                                {/* Column 1: Customer & Delivery Info */}
                                                                <div>
                                                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <User size={16} /> Datos del Cliente
                                                                    </h4>
                                                                    <div style={{ background: 'white', padding: 16, borderRadius: 12, border: '1px solid var(--color-border-light)' }}>
                                                                        <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{order.customerName || 'Cliente Invitado'}</p>
                                                                        {order.customerPhone && <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>📞 {order.customerPhone}</p>}
                                                                        
                                                                        <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border-light)' }}>
                                                                            <MapPin size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                                                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                                                {order.deliveryAddress?.street || 'Dirección no especificada'}
                                                                                <br/>
                                                                                {order.deliveryAddress?.colony && <span style={{ fontWeight: 600 }}>{order.deliveryAddress.colony}</span>}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Column 2: Order Items Summary */}
                                                                <div>
                                                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <Package size={16} /> Resumen del Pedido
                                                                    </h4>
                                                                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border-light)', maxHeight: 200, overflowY: 'auto' }}>
                                                                        {order.items?.map((item, idx) => (
                                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < order.items.length - 1 ? '1px solid var(--color-border-light)' : 'none' }}>
                                                                                <div>
                                                                                    <span style={{ fontWeight: 700, color: 'var(--color-primary)', marginRight: 8 }}>{item.quantity}x</span>
                                                                                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.name}</span>
                                                                                    {item.modifiers?.length > 0 && (
                                                                                        <p style={{ margin: '4px 0 0 24px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                                                            {item.modifiers.map(m => m.name).join(', ')}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>${(item.price * item.quantity).toFixed(2)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Column 3: Logistics & Status */}
                                                                <div>
                                                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <Bike size={16} /> Logística y Entrega
                                                                    </h4>
                                                                    <div style={{ background: 'white', padding: 16, borderRadius: 12, border: '1px solid var(--color-border-light)' }}>
                                                                        {order.driverId ? (
                                                                            <div>
                                                                                <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--color-success)' }}>Repartidor Asignado</p>
                                                                                <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>El pedido está en ruta hacia el cliente.</p>
                                                                                
                                                                                {/* Map tracking placeholder link / button */}
                                                                                {(order.status === 'on_the_way' || order.status === 'ready') && (
                                                                                    <button 
                                                                                        onClick={(e) => { e.stopPropagation(); setTrackingOrder(order); }}
                                                                                        style={{ width: '100%', padding: '8px 12px', background: 'var(--color-background)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                                                                    >
                                                                                        <MapPin size={16} /> Ver en Mapa
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div>
                                                                                <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--color-warning)' }}>Sin Repartidor</p>
                                                                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>El sistema aún está buscando un conductor disponible para esta entrega.</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {trackingOrder && (
                <LiveOrderTrackingModal
                    order={trackingOrder}
                    onClose={() => setTrackingOrder(null)}
                />
            )}
        </div>
    );
}
