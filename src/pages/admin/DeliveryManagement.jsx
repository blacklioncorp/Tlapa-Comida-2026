import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { supabase } from '../../supabase';
import { ALL_USERS } from '../../data/seedData';
import { BarChart3, Store, Users, ShoppingBag, Settings, LogOut, Search, Truck, DollarSign, LayoutGrid, Gift, User, CheckCircle, Navigation } from 'lucide-react';
import AdminLiveMap from '../../components/AdminLiveMap';

export default function DeliveryManagement() {
    const { logout } = useAuth();
    const { orders } = useOrders();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial load and Realtime sync
    useEffect(() => {
        let subscription = null;

        const fetchDrivers = async () => {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'driver');

            if (!error && data) {
                setDrivers(data);
            }
            setLoading(false);
        };

        fetchDrivers();

        // Realtime updates for online status and location
        subscription = supabase.channel('admin:drivers-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: 'role=eq.driver' }, () => {
                fetchDrivers();
            })
            .subscribe();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, []);

    // Active deliveries
    const activeDeliveries = orders.filter(o => ['assigned_to_driver', 'picked_up', 'on_the_way'].includes(o.status));

    const getDriverStats = (driverId) => {
        const myDeliveries = orders.filter(o => o.driverId === driverId && o.status === 'delivered');
        let saldoFavor = 0;
        let deudaEfectivo = 0;

        myDeliveries.forEach(o => {
            const fee = o.totals.deliveryFee || 0;
            const total = o.totals.total || 0;
            if (o.payment?.method === 'cash') deudaEfectivo += (total - fee);
            else saldoFavor += fee;
        });

        const activeOrder = activeDeliveries.find(o => o.driverId === driverId);

        return {
            todayDeliveries: myDeliveries.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length,
            balance: saldoFavor - deudaEfectivo,
            deudaEfectivo,
            saldoFavor,
            activeOrder
        };
    };

    const handleSettleDebt = (driverId, amount) => {
        if (window.confirm(`¿Confirmas que el repartidor entregó a la oficina la cantidad de $${amount.toFixed(2)} en efectivo?`)) {
            alert('Liquidación registrada exitosamente. (Falta conectar a backend)');
            // Here you'd insert a transaction in a 'driver_transactions' table in Supabase
        }
    };

    const filteredDrivers = drivers.filter(d =>
        !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.displayName?.toLowerCase().includes(search.toLowerCase())
    );

    const onlineCount = drivers.filter(d => d.isOnline).length;
    const totalDebt = drivers.reduce((sum, d) => sum + getDriverStats(d.id).deudaEfectivo, 0);

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
                    <button className="sidebar-link active" onClick={() => navigate('/admin/delivery')}>
                        <Truck size={18} /> Repartidores
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

            <main className="admin-main">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Gestión de Repartidores</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            {drivers.length} repartidores registrados · {onlineCount} en línea
                        </p>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>En Ruta (Activos)</p>
                        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>{activeDeliveries.length}</p>
                    </div>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Deuda Total en Calle</p>
                        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-error)' }}>
                            ${totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Disponibles (En línea)</p>
                        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-success)' }}>
                            {onlineCount - activeDeliveries.length}
                        </p>
                    </div>
                </div>

                {/* Interactive Map View */}
                <div style={{ background: 'var(--color-surface)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 24, padding: 20 }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Navigation size={18} color="var(--color-primary)" /> Mapa en Vivo
                    </h2>
                    <div style={{ width: '100%', height: 350, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border-light)' }}>
                        <AdminLiveMap height="100%" />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="search-bar" style={{ maxWidth: 320, flex: 1 }}>
                        <Search size={18} />
                        <input placeholder="Buscar repartidor..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                {/* Drivers Table */}
                <div style={{ background: 'var(--color-surface)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Repartidor</th>
                                <th>Estado</th>
                                <th>Carga Actual</th>
                                <th>Entregas Hoy</th>
                                <th>Recaudado (Deuda)</th>
                                <th>Saldo a Favor</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24 }}>Cargando...</td></tr>
                            ) : filteredDrivers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                                        No se encontraron repartidores
                                    </td>
                                </tr>
                            ) : (
                                filteredDrivers.map(driver => {
                                    const stats = getDriverStats(driver.id);

                                    return (
                                        <tr key={driver.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {driver.avatarUrl ?
                                                            <img src={driver.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> :
                                                            <User size={20} color="var(--color-primary)" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <span style={{ fontWeight: 700 }}>{driver.displayName || driver.name}</span>
                                                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{driver.phone || 'Sin télefono'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {driver.isOnline ?
                                                    <span className="badge badge-success"><CheckCircle size={12} /> En Línea</span> :
                                                    <span className="badge badge-secondary">Desconectado</span>
                                                }
                                            </td>
                                            <td>
                                                {stats.activeOrder ? (
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                                        Orden #{stats.activeOrder.orderNumber}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Libre</span>
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{stats.todayDeliveries} viajes</td>
                                            <td style={{ fontWeight: 800, color: stats.deudaEfectivo > 0 ? 'var(--color-error)' : 'inherit' }}>
                                                ${stats.deudaEfectivo.toFixed(2)}
                                            </td>
                                            <td style={{ fontWeight: 800, color: 'var(--color-success)' }}>
                                                ${stats.saldoFavor.toFixed(2)}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    {stats.deudaEfectivo > 0 && (
                                                        <button
                                                            className="btn btn-primary"
                                                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                            onClick={() => handleSettleDebt(driver.id, stats.deudaEfectivo)}
                                                        >
                                                            Liquidar
                                                        </button>
                                                    )}
                                                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                                                        Perfil
                                                    </button>
                                                </div>
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
