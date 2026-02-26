import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { supabase } from '../../supabase';
import {
    BarChart3, Store, Users, ShoppingBag, Settings, LogOut,
    DollarSign, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight,
    Building2, Bike, Smartphone, Filter, Download, ChevronDown, ChevronUp,
    CircleDollarSign, Scale, Receipt, Percent, LayoutGrid, Gift
, Truck } from 'lucide-react';

export default function FinanceDashboard() {
    const { logout } = useAuth();
    const { orders } = useOrders();
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all'); // all, week, month
    const [expandedMerchant, setExpandedMerchant] = useState(null);
    const [expandedDriver, setExpandedDriver] = useState(null);
    const [activeSection, setActiveSection] = useState('overview'); // overview, merchants, drivers
    const [merchants, setMerchants] = useState([]);

    useEffect(() => {
        supabase.from('merchants').select('*').then(({ data }) => setMerchants(data || []));
    }, []);

    // Filter orders by time period
    const filteredOrders = useMemo(() => {
        const now = new Date();
        return orders.filter(o => {
            if (filter === 'all') return true;
            const orderDate = new Date(o.createdAt);
            if (filter === 'today') {
                return orderDate.toDateString() === now.toDateString();
            }
            if (filter === 'week') {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return orderDate >= weekAgo;
            }
            if (filter === 'month') {
                return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }, [orders, filter]);

    // Delivered orders (completed transactions)
    const completedOrders = filteredOrders.filter(o => o.status === 'delivered');
    const allOrders = filteredOrders;

    // ---- FINANCIAL CALCULATIONS ----

    // Total generated revenue (everything the client paid)
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.totals?.total || 0), 0);
    const completedRevenue = completedOrders.reduce((sum, o) => sum + (o.totals?.total || 0), 0);

    // Breakdown per order
    const calculateOrderFinancials = (order) => {
        const merchant = merchants.find(m => m.id === order.merchantId);
        const subtotal = order.totals?.subtotal || 0;
        const deliveryFee = order.totals?.deliveryFee || 0;
        const serviceFee = order.totals?.serviceFee || 0;
        const discount = order.totals?.discount || 0;
        const total = order.totals?.total || 0;
        const commissionRate = merchant?.commissionRate || 0.15;

        // Commission the platform earns from the merchant
        const platformCommission = subtotal * commissionRate;

        // What the merchant receives (subtotal - commission)
        const merchantEarnings = subtotal - platformCommission;

        // What the driver receives (delivery fee)
        const driverEarnings = deliveryFee;

        // What the platform earns (commission + service fee)
        const platformEarnings = platformCommission + serviceFee;

        return {
            total,
            subtotal,
            deliveryFee,
            serviceFee,
            discount,
            platformCommission,
            merchantEarnings,
            driverEarnings,
            platformEarnings,
            commissionRate,
            merchantId: order.merchantId,
            merchantName: merchant?.name || 'Desconocido',
            driverId: order.driverId,
        };
    };

    // Aggregate totals
    const financials = useMemo(() => {
        let totals = {
            totalGenerated: 0,
            merchantTotal: 0,
            driverTotal: 0,
            platformTotal: 0,
            commissions: 0,
            serviceFees: 0,
            deliveryFees: 0,
            discounts: 0,
            subtotals: 0,
        };

        const perMerchant = {};
        const perDriver = {};

        allOrders.forEach(order => {
            const fin = calculateOrderFinancials(order);
            totals.totalGenerated += fin.total;
            totals.merchantTotal += fin.merchantEarnings;
            totals.driverTotal += fin.driverEarnings;
            totals.platformTotal += fin.platformEarnings;
            totals.commissions += fin.platformCommission;
            totals.serviceFees += fin.serviceFee;
            totals.deliveryFees += fin.deliveryFee;
            totals.discounts += fin.discount;
            totals.subtotals += fin.subtotal;

            // Per merchant
            if (!perMerchant[fin.merchantId]) {
                const m = merchants.find(mm => mm.id === fin.merchantId);
                perMerchant[fin.merchantId] = {
                    id: fin.merchantId,
                    name: fin.merchantName,
                    logoUrl: m?.logoUrl || '',
                    commissionRate: fin.commissionRate,
                    totalOrders: 0,
                    revenue: 0,
                    commission: 0,
                    earnings: 0,
                    deliveredOrders: 0,
                    pendingOrders: 0,
                    owedToMerchant: 0, // what platform owes merchant
                    paidToMerchant: 0,
                };
            }
            perMerchant[fin.merchantId].totalOrders++;
            perMerchant[fin.merchantId].revenue += fin.subtotal;
            perMerchant[fin.merchantId].commission += fin.platformCommission;
            perMerchant[fin.merchantId].earnings += fin.merchantEarnings;
            if (order.status === 'delivered') {
                perMerchant[fin.merchantId].deliveredOrders++;
                perMerchant[fin.merchantId].owedToMerchant += fin.merchantEarnings;
            } else {
                perMerchant[fin.merchantId].pendingOrders++;
            }

            // Per driver
            if (order.driverId) {
                if (!perDriver[order.driverId]) {
                    perDriver[order.driverId] = {
                        id: order.driverId,
                        name: order.driverId,
                        totalDeliveries: 0,
                        totalEarnings: 0,
                        owedToDriver: 0,
                        paidToDriver: 0,
                    };
                }
                perDriver[order.driverId].totalDeliveries++;
                perDriver[order.driverId].totalEarnings += fin.driverEarnings;
                if (order.status === 'delivered') {
                    perDriver[order.driverId].owedToDriver += fin.driverEarnings;
                }
            }
        });

        return { totals, perMerchant: Object.values(perMerchant), perDriver: Object.values(perDriver) };
    }, [allOrders]);

    const { totals, perMerchant, perDriver } = financials;

    // Donut chart data for revenue distribution
    const donutSegments = [
        { label: 'Comercio', value: totals.merchantTotal, color: '#3b82f6' },
        { label: 'Repartidor', value: totals.driverTotal, color: '#f59e0b' },
        { label: 'Plataforma', value: totals.platformTotal, color: '#10b981' },
    ];
    const donutTotal = donutSegments.reduce((s, seg) => s + seg.value, 0);

    // Build SVG donut
    const buildDonut = () => {
        if (donutTotal === 0) return null;
        const radius = 70;
        const cx = 90;
        const cy = 90;
        const circumference = 2 * Math.PI * radius;
        let offset = 0;

        return (
            <svg width="180" height="180" viewBox="0 0 180 180">
                {donutSegments.map((seg, i) => {
                    const pct = seg.value / donutTotal;
                    const dashLength = pct * circumference;
                    const el = (
                        <circle key={i}
                            cx={cx} cy={cy} r={radius}
                            fill="none" stroke={seg.color} strokeWidth="24"
                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="round"
                            style={{ transition: 'all 0.6s ease' }}
                        />
                    );
                    offset += dashLength;
                    return el;
                })}
                <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 18, fontWeight: 800, fill: 'var(--color-text)' }}>
                    ${donutTotal.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </text>
                <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--color-text-muted)' }}>
                    Total generado
                </text>
            </svg>
        );
    };

    const fmt = (val) => `$${val.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const fmtPct = (val) => `${(val * 100).toFixed(1)}%`;

    return (
        <div className="admin-layout">
            {/* Sidebar */}
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
                    <button className="sidebar-link" onClick={() => navigate('/admin/delivery')}>
                        <Truck size={18} /> Repartidores
                        <Users size={18} /> Usuarios
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/orders')}>
                        <ShoppingBag size={18} /> Pedidos
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/promotions')}>
                        <Gift size={18} /> Promociones
                    </button>
                    <button className="sidebar-link active">
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
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>💰 Finanzas</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Balanza de ingresos y deudas</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[
                            { key: 'all', label: 'Todo' },
                            { key: 'today', label: 'Hoy' },
                            { key: 'week', label: '7 días' },
                            { key: 'month', label: 'Este mes' },
                        ].map(f => (
                            <button key={f.key}
                                className={`pill ${filter === f.key ? 'active' : ''}`}
                                onClick={() => setFilter(f.key)}
                                style={{ fontSize: '0.8rem' }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Revenue KPIs */}
                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
                    <div className="kpi-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span className="kpi-label">Total Generado</span>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <DollarSign size={18} color="var(--color-primary)" />
                            </div>
                        </div>
                        <div className="kpi-value">{fmt(totals.totalGenerated)}</div>
                        <div className="kpi-change positive">{allOrders.length} pedidos</div>
                    </div>
                    <div className="kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span className="kpi-label">Para Comercios</span>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Building2 size={18} color="#3b82f6" />
                            </div>
                        </div>
                        <div className="kpi-value" style={{ color: '#3b82f6' }}>{fmt(totals.merchantTotal)}</div>
                        <div className="kpi-change positive">
                            {donutTotal > 0 ? fmtPct(totals.merchantTotal / donutTotal) : '0%'} del total
                        </div>
                    </div>
                    <div className="kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span className="kpi-label">Para Repartidores</span>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bike size={18} color="#f59e0b" />
                            </div>
                        </div>
                        <div className="kpi-value" style={{ color: '#f59e0b' }}>{fmt(totals.driverTotal)}</div>
                        <div className="kpi-change positive">
                            {donutTotal > 0 ? fmtPct(totals.driverTotal / donutTotal) : '0%'} del total
                        </div>
                    </div>
                    <div className="kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span className="kpi-label">Para la Plataforma</span>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Smartphone size={18} color="#10b981" />
                            </div>
                        </div>
                        <div className="kpi-value" style={{ color: '#10b981' }}>{fmt(totals.platformTotal)}</div>
                        <div className="kpi-change positive">
                            {donutTotal > 0 ? fmtPct(totals.platformTotal / donutTotal) : '0%'} del total
                        </div>
                    </div>
                </div>

                {/* Revenue Distribution Chart + Desglose */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                    {/* Donut Chart */}
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📊 Distribución de Ingresos</h3>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
                            {allOrders.length > 0 ? buildDonut() : (
                                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                                    <Receipt size={40} strokeWidth={1} />
                                    <p style={{ marginTop: 8 }}>Sin pedidos aún</p>
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {donutSegments.map((seg, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 14, height: 14, borderRadius: 4, background: seg.color, flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{seg.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                {fmt(seg.value)} ({donutTotal > 0 ? fmtPct(seg.value / donutTotal) : '0%'})
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Desglose detallado */}
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📋 Desglose Detallado</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { label: 'Subtotal (comida)', value: totals.subtotals, icon: '🍽️', color: 'var(--color-text)' },
                                { label: 'Tarifas de envío', value: totals.deliveryFees, icon: '🛵', color: '#f59e0b' },
                                { label: 'Tarifas de servicio', value: totals.serviceFees, icon: '📱', color: '#10b981' },
                                { label: 'Comisiones cobradas', value: totals.commissions, icon: '💼', color: '#8b5cf6' },
                                { label: 'Descuentos otorgados', value: -totals.discounts, icon: '🏷️', color: 'var(--color-error)' },
                            ].map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 14px', borderRadius: 10,
                                    background: i % 2 === 0 ? 'var(--color-background)' : 'transparent',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: 18 }}>{item.icon}</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.label}</span>
                                    </div>
                                    <span style={{ fontWeight: 800, color: item.color, fontSize: '0.95rem' }}>
                                        {item.value >= 0 ? fmt(item.value) : `-${fmt(Math.abs(item.value))}`}
                                    </span>
                                </div>
                            ))}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '14px', borderRadius: 10,
                                background: 'var(--color-primary-bg)', borderTop: '2px solid var(--color-primary)',
                                marginTop: 4,
                            }}>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>💰 Total cobrado al cliente</span>
                                <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.1rem' }}>{fmt(totals.totalGenerated)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                    <button className={`pill ${activeSection === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveSection('overview')}>
                        <Scale size={14} /> Balanza General
                    </button>
                    <button className={`pill ${activeSection === 'merchants' ? 'active' : ''}`}
                        onClick={() => setActiveSection('merchants')}>
                        <Store size={14} /> Por Comercio ({perMerchant.length})
                    </button>
                    <button className={`pill ${activeSection === 'drivers' ? 'active' : ''}`}
                        onClick={() => setActiveSection('drivers')}>
                        <Bike size={14} /> Por Repartidor ({perDriver.length})
                    </button>
                </div>

                {/* Balanza General */}
                {activeSection === 'overview' && (
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Scale size={20} /> Balanza de Deudas
                        </h3>
                        {allOrders.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                                <p>Realiza pedidos para ver la balanza financiera</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                                {/* Debemos a Comercios */}
                                <div style={{
                                    padding: 20, borderRadius: 14, textAlign: 'center',
                                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                    border: '1px solid #bfdbfe',
                                }}>
                                    <Building2 size={28} color="#3b82f6" style={{ marginBottom: 8 }} />
                                    <p style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600, marginBottom: 4 }}>
                                        Debemos a Comercios
                                    </p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1d4ed8' }}>
                                        {fmt(perMerchant.reduce((s, m) => s + m.owedToMerchant, 0))}
                                    </p>
                                    <p style={{ fontSize: '0.7rem', color: '#3b82f6', marginTop: 4 }}>
                                        Ventas completadas - comisiones
                                    </p>
                                </div>

                                {/* Debemos a Repartidores */}
                                <div style={{
                                    padding: 20, borderRadius: 14, textAlign: 'center',
                                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                    border: '1px solid #fde68a',
                                }}>
                                    <Bike size={28} color="#f59e0b" style={{ marginBottom: 8 }} />
                                    <p style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600, marginBottom: 4 }}>
                                        Debemos a Repartidores
                                    </p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>
                                        {fmt(perDriver.reduce((s, d) => s + d.owedToDriver, 0))}
                                    </p>
                                    <p style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: 4 }}>
                                        Tarifas de envío entregados
                                    </p>
                                </div>

                                {/* Ganancia neta plataforma */}
                                <div style={{
                                    padding: 20, borderRadius: 14, textAlign: 'center',
                                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                                    border: '1px solid #a7f3d0',
                                }}>
                                    <Smartphone size={28} color="#10b981" style={{ marginBottom: 8 }} />
                                    <p style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600, marginBottom: 4 }}>
                                        Ganancia Plataforma
                                    </p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>
                                        {fmt(totals.platformTotal)}
                                    </p>
                                    <p style={{ fontSize: '0.7rem', color: '#10b981', marginTop: 4 }}>
                                        Comisiones + tarifas servicio
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Resumen */}
                        {allOrders.length > 0 && (
                            <div style={{
                                marginTop: 20, padding: 16, borderRadius: 12,
                                background: 'var(--color-background)', border: '1px solid var(--color-border-light)',
                            }}>
                                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>📊 Resumen de flujo de dinero</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <ArrowDownRight size={16} color="#3b82f6" /> Clientes pagan total
                                        </span>
                                        <strong style={{ color: 'var(--color-primary)' }}>{fmt(totals.totalGenerated)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingLeft: 24, color: 'var(--color-text-muted)' }}>
                                        <span>↳ Comida (subtotal)</span>
                                        <span>{fmt(totals.subtotals)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingLeft: 24, color: 'var(--color-text-muted)' }}>
                                        <span>↳ Envío</span>
                                        <span>{fmt(totals.deliveryFees)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingLeft: 24, color: 'var(--color-text-muted)' }}>
                                        <span>↳ Servicio</span>
                                        <span>{fmt(totals.serviceFees)}</span>
                                    </div>
                                    {totals.discounts > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingLeft: 24, color: 'var(--color-error)' }}>
                                            <span>↳ Descuentos</span>
                                            <span>-{fmt(totals.discounts)}</span>
                                        </div>
                                    )}
                                    <hr style={{ border: 'none', borderTop: '1px dashed var(--color-border-light)', margin: '4px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <ArrowUpRight size={16} color="#3b82f6" /> Pagar a comercios
                                        </span>
                                        <strong style={{ color: '#3b82f6' }}>{fmt(totals.merchantTotal)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <ArrowUpRight size={16} color="#f59e0b" /> Pagar a repartidores
                                        </span>
                                        <strong style={{ color: '#f59e0b' }}>{fmt(totals.driverTotal)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <CircleDollarSign size={16} color="#10b981" /> Queda para la plataforma
                                        </span>
                                        <strong style={{ color: '#10b981' }}>{fmt(totals.platformTotal)}</strong>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Per Merchant Balances */}
                {activeSection === 'merchants' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {perMerchant.length === 0 ? (
                            <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                Sin datos de comercios aún
                            </div>
                        ) : perMerchant.sort((a, b) => b.earnings - a.earnings).map(m => (
                            <div key={m.id} style={{
                                background: 'var(--color-surface)', borderRadius: 14,
                                boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
                            }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '16px 20px', cursor: 'pointer',
                                }} onClick={() => setExpandedMerchant(expandedMerchant === m.id ? null : m.id)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 10, overflow: 'hidden',
                                            background: 'var(--color-primary-bg)',
                                        }}>
                                            {m.logoUrl ? (
                                                <img src={m.logoUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Store size={20} color="var(--color-primary)" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{m.name}</h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                {m.totalOrders} pedidos · Comisión {(m.commissionRate * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, color: '#3b82f6' }}>{fmt(m.owedToMerchant)}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>por pagar</div>
                                        </div>
                                        {expandedMerchant === m.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>

                                {expandedMerchant === m.id && (
                                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--color-border-light)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, paddingTop: 16 }}>
                                            <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: 'var(--color-background)' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Ventas brutas</div>
                                                <div style={{ fontWeight: 800 }}>{fmt(m.revenue)}</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: '#f5f3ff' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#7c3aed', marginBottom: 4 }}>Comisión Tlapa</div>
                                                <div style={{ fontWeight: 800, color: '#7c3aed' }}>-{fmt(m.commission)}</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: '#eff6ff' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#3b82f6', marginBottom: 4 }}>Neto comercio</div>
                                                <div style={{ fontWeight: 800, color: '#3b82f6' }}>{fmt(m.earnings)}</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: '#ecfdf5' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#059669', marginBottom: 4 }}>Entregados</div>
                                                <div style={{ fontWeight: 800, color: '#059669' }}>{m.deliveredOrders}</div>
                                            </div>
                                        </div>
                                        {/* Balance bar */}
                                        <div style={{ marginTop: 16 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6 }}>
                                                <span style={{ color: '#7c3aed', fontWeight: 600 }}>Comisión Tlapa ({(m.commissionRate * 100).toFixed(0)}%)</span>
                                                <span style={{ color: '#3b82f6', fontWeight: 600 }}>Para el comercio</span>
                                            </div>
                                            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--color-border-light)' }}>
                                                <div style={{ width: `${m.revenue > 0 ? (m.commission / m.revenue) * 100 : 0}%`, background: '#8b5cf6', transition: 'width 0.5s' }} />
                                                <div style={{ flex: 1, background: '#3b82f6', transition: 'width 0.5s' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Per Driver Balances */}
                {activeSection === 'drivers' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {perDriver.length === 0 ? (
                            <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                Sin entregas registradas aún
                            </div>
                        ) : perDriver.sort((a, b) => b.totalEarnings - a.totalEarnings).map(d => (
                            <div key={d.id} style={{
                                background: 'var(--color-surface)', borderRadius: 14,
                                boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
                            }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '16px 20px', cursor: 'pointer',
                                }} onClick={() => setExpandedDriver(expandedDriver === d.id ? null : d.id)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Bike size={20} color="#d97706" />
                                        </div>
                                        <div>
                                            <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{d.name}</h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                {d.totalDeliveries} entregas
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, color: '#f59e0b' }}>{fmt(d.owedToDriver)}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>por pagar</div>
                                        </div>
                                        {expandedDriver === d.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>

                                {expandedDriver === d.id && (
                                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--color-border-light)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, paddingTop: 16 }}>
                                            <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: 'var(--color-background)' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Total entregas</div>
                                                <div style={{ fontWeight: 800 }}>{d.totalDeliveries}</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: '#fffbeb' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#d97706', marginBottom: 4 }}>Ganancia total</div>
                                                <div style={{ fontWeight: 800, color: '#d97706' }}>{fmt(d.totalEarnings)}</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: '#fef2f2' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#dc2626', marginBottom: 4 }}>Deuda pendiente</div>
                                                <div style={{ fontWeight: 800, color: '#dc2626' }}>{fmt(d.owedToDriver)}</div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                            Promedio por entrega: {d.totalDeliveries > 0 ? fmt(d.totalEarnings / d.totalDeliveries) : '$0'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
