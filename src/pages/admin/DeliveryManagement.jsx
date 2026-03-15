import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { supabase } from '../../supabase';
import { ALL_USERS } from '../../data/seedData';
import { BarChart3, Store, Users, ShoppingBag, Settings, LogOut, Search, Eye, Filter, DollarSign, LayoutGrid, CloudRain, AlertTriangle, Truck, Clock, Zap, MapPin, Gift, Menu, X, FileText, Ban, CheckCircle, AlertCircle, User, Navigation } from 'lucide-react';
import AdminLiveMap from '../../components/AdminLiveMap';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function DeliveryManagement() {
    const { user, logout } = useAuth();
    const { orders } = useOrders();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    // Drawer State (Unified with UserManagement)
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [amountPaid, setAmountPaid] = useState('');
    const [isProcessingTopup, setIsProcessingTopup] = useState(false);
    
    // Top-up specific state
    const [selectedDriverForTopup, setSelectedDriverForTopup] = useState(null);
    const [topupAmount, setTopupAmount] = useState('');

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

    const handleTopup = async () => {
        const amount = parseFloat(topupAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Por favor ingresa un monto válido mayor a 0.");
            return;
        }

        setIsProcessingTopup(true);
        try {
            const { data, error } = await supabase.rpc('admin_topup_wallet', {
                p_driver_id: selectedDriverForTopup.id,
                p_amount: amount,
                p_admin_id: user?.id || null // Pass admin ID if available
            });

            if (error) throw error;
            
            alert(`Recarga de $${amount.toFixed(2)} exitosa.`);
            setSelectedDriverForTopup(null);
            setTopupAmount('');
        } catch (error) {
            console.error("Error topping up wallet:", error);
            alert("Error al intentar recargar el monedero: " + error.message);
        } finally {
            setIsProcessingTopup(false);
        }
    };

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

    const handleSettleDebt = async (driverId, amount) => {
        if (window.confirm(`¿Confirmas que el repartidor entregó a la oficina la cantidad de $${amount.toFixed(2)} en efectivo?`)) {
            try {
                const { error } = await supabase.from('users').update({
                    cashInHand: 0 // In a production system, this should be an RPC to record a transaction
                }).eq('id', driverId);

                if (error) throw error;
                alert('Liquidación registrada exitosamente.');
            } catch (error) {
                alert('Error al liquidar: ' + error.message);
            }
        }
    };

    const filteredDrivers = drivers.filter(d =>
        !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.displayName?.toLowerCase().includes(search.toLowerCase())
    );

    const onlineCount = drivers.filter(d => d.isOnline).length;
    const totalDebt = drivers.reduce((sum, d) => sum + getDriverStats(d.id).deudaEfectivo, 0);

    return (
        <div className="admin-layout">
            <AdminSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="admin-main">
                <div className="admin-header-responsive" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Gestión de Repartidores</h1>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                {drivers.length} repartidores registrados · {onlineCount} en línea
                            </p>
                        </div>
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
                <div style={{ background: 'var(--color-surface)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', overflow: 'hidden', padding: '0 20px' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px' }}>
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
                                            <td style={{ fontWeight: 800 }}>
                                                ${(driver.walletBalance || 0).toFixed(2)}
                                            </td>
                                            <td style={{ fontWeight: 800, color: stats.deudaEfectivo > 0 ? 'var(--color-error)' : 'inherit' }}>
                                                ${stats.deudaEfectivo.toFixed(2)}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button
                                                        className="btn btn-success"
                                                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#10b981', color: 'white', border: 'none' }}
                                                        onClick={() => setSelectedDriverForTopup(driver)}
                                                    >
                                                        Recargar
                                                    </button>
                                                    {stats.deudaEfectivo > 0 && (
                                                        <button
                                                            className="btn btn-primary"
                                                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                            onClick={() => handleSettleDebt(driver.id, stats.deudaEfectivo)}
                                                        >
                                                            Liquidar
                                                        </button>
                                                    )}
                                                    <button 
                                                        className="btn btn-ghost"
                                                        style={{ padding: '6px 12px', fontSize: '0.8rem', border: '1px solid var(--color-border)' }}
                                                        onClick={() => { setSelectedDriver(driver); setIsDrawerOpen(true); }}
                                                    >
                                                        Expediente
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

            {/* Topup Modal */}
            {selectedDriverForTopup && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ background: 'white', padding: 24, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16 }}>
                            Recargar Monedero
                        </h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
                            Agrega saldo al monedero de <strong>{selectedDriverForTopup.displayName || selectedDriverForTopup.name}</strong> para el cobro automático de comisiones.
                        </p>
                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label className="form-label">Monto a recargar ($)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={topupAmount}
                                onChange={(e) => setTopupAmount(e.target.value)}
                                placeholder="Ej: 200"
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setSelectedDriverForTopup(null);
                                    setTopupAmount('');
                                }}
                                disabled={isProcessingTopup}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn"
                                style={{ background: '#10b981', color: 'white', border: 'none' }}
                                onClick={handleTopup}
                                disabled={isProcessingTopup || !topupAmount || topupAmount <= 0}
                            >
                                {isProcessingTopup ? 'Procesando...' : 'Confirmar Recarga'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DRIVER DRAWER / MODAL - Gestión (Unified with UserManagement) */}
            {isDrawerOpen && selectedDriver && (
                <>
                    <div
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
                        onClick={() => setIsDrawerOpen(false)}
                    />
                    <div style={{
                        position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', maxWidth: '100%',
                        background: 'white', zIndex: 1001, padding: 24, boxShadow: '-8px 0 24px rgba(0,0,0,0.1)',
                        display: 'flex', flexDirection: 'column', overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ margin: 0 }}>Gestión de Repartidor</h2>
                            <button className="btn btn-icon btn-ghost" onClick={() => setIsDrawerOpen(false)}><X size={20} /></button>
                        </div>

                        {/* Info Básica */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-primary-bg)', overflow: 'hidden' }}>
                                {selectedDriver.avatarUrl ? (
                                    <img src={selectedDriver.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🛵</div>}
                            </div>
                            <div>
                                <h3 style={{ margin: 0 }}>{selectedDriver.displayName}</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{selectedDriver.email}</p>
                                <span className={`badge badge-${selectedDriver.verification_status === 'approved' ? 'success' : 'warning'}`} style={{ marginTop: 4 }}>
                                    {selectedDriver.verification_status?.toUpperCase() || 'PENDIENTE'}
                                </span>
                            </div>
                        </div>

                        {/* Finanzas */}
                        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem' }}>
                                <DollarSign size={18} color="#10b981" /> Deuda en Efectivo
                            </h3>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Monto a favor de app</p>
                                    <h2 style={{ margin: 0, color: selectedDriver.isBlockedDueToCash ? 'var(--color-error)' : 'inherit' }}>
                                        ${(selectedDriver.cashInHand || 0).toFixed(2)}
                                    </h2>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Límite Permitido</p>
                                    <h4 style={{ margin: 0, color: 'var(--color-text-muted)' }}>${selectedDriver.maxCashLimit || 1000}</h4>
                                </div>
                            </div>

                            {selectedDriver.isBlockedDueToCash && (
                                <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, display: 'flex', gap: 8, marginBottom: 16 }}>
                                    <AlertCircle size={16} /> <span>Cuenta bloqueada por exceso de efectivo. Liquidar deuda para reactivar.</span>
                                </div>
                            )}

                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Registrar pago en oficina (MXN):</label>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <input
                                    type="number"
                                    className="form-input"
                                    style={{ flex: 1, height: '42px' }}
                                    value={amountPaid}
                                    onChange={(e) => setAmountPaid(e.target.value)}
                                    placeholder="Ej. 500"
                                />
                                <button 
                                    className="btn btn-primary" 
                                    style={{ whiteSpace: 'nowrap', height: '42px' }}
                                    onClick={async () => {
                                        if (!amountPaid || isNaN(amountPaid)) return;
                                        const newBalance = Math.max(0, (selectedDriver.cashInHand || 0) - parseFloat(amountPaid));
                                        const { error } = await supabase.from('users').update({ 
                                            cashInHand: newBalance,
                                            isBlockedDueToCash: newBalance > (selectedDriver.maxCashLimit || 1000)
                                        }).eq('id', selectedDriver.id);
                                        if (!error) {
                                            setAmountPaid('');
                                            setSelectedDriver(prev => ({ ...prev, cashInHand: newBalance }));
                                            alert('Abono registrado correctamente');
                                        }
                                    }}
                                >
                                    Abonar
                                </button>
                            </div>
                        </div>

                        {/* Documentos */}
                        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem' }}>
                                <FileText size={18} color="#3b82f6" /> Expediente Digital
                            </h3>

                            {selectedDriver.selfie_url && (
                                <div style={{ marginBottom: 16, textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>Fotografía de Perfil (Selfie)</p>
                                    <img
                                        src={selectedDriver.selfie_url}
                                        style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid #3b82f6' }}
                                        alt="Selfie"
                                    />
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                                {selectedDriver.driver_documents && Object.entries(selectedDriver.driver_documents).map(([key, url]) => (
                                    <a
                                        key={key}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: '8px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0',
                                            textDecoration: 'none', color: 'var(--color-text)', fontSize: '0.7rem',
                                            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600
                                        }}
                                    >
                                        <FileText size={14} /> {key.replace('_', ' ').toUpperCase()}
                                    </a>
                                ))}
                            </div>

                            {/* Manual Document Upload */}
                            <div style={{ marginBottom: 16, padding: '12px', background: '#f1f5f9', borderRadius: '8px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 8 }}>Subir Documento Manualmente</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <select 
                                        id="doc-type-select"
                                        className="form-input" 
                                        style={{ fontSize: '0.8rem', height: '36px' }}
                                    >
                                        <option value="ine_frente">INE Frente</option>
                                        <option value="ine_vuelta">INE Vuelta</option>
                                        <option value="licencia">Licencia de Conducir</option>
                                        <option value="rfc">RFC / Datos Fiscales</option>
                                        <option value="seguro">Seguro Vehicular</option>
                                        <option value="otros">Otros</option>
                                    </select>
                                    <input 
                                        type="file" 
                                        accept="image/*,.pdf" 
                                        style={{ fontSize: '0.75rem' }}
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            
                                            const docType = document.getElementById('doc-type-select').value;
                                            const fileName = `drivers/${selectedDriver.id}/${docType}_${Date.now()}_${file.name}`;
                                            
                                            try {
                                                const { data, error } = await supabase.storage
                                                    .from('driver-documents')
                                                    .upload(fileName, file);
                                                
                                                if (error) throw error;
                                                
                                                const { data: { publicUrl } } = supabase.storage
                                                    .from('driver-documents')
                                                    .getPublicUrl(fileName);
                                                
                                                const currentDocs = selectedDriver.driver_documents || {};
                                                const updatedDocs = { ...currentDocs, [docType]: publicUrl };
                                                
                                                const { error: updateError } = await supabase
                                                    .from('users')
                                                    .update({ driver_documents: updatedDocs })
                                                    .eq('id', selectedDriver.id);
                                                
                                                if (updateError) throw updateError;
                                                
                                                setSelectedDriver(prev => ({ ...prev, driver_documents: updatedDocs }));
                                                alert("Documento subido correctamente");
                                            } catch (err) {
                                                console.error(err);
                                                alert("Error al subir documento: " + err.message);
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    className="btn btn-outline"
                                    style={{ flex: 1, borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                                    onClick={async () => {
                                        if (window.confirm("¿Rechazar documentos? El repartidor deberá subirlos de nuevo.")) {
                                            await supabase.from('users').update({ verification_status: 'rejected' }).eq('id', selectedDriver.id);
                                            setIsDrawerOpen(false);
                                        }
                                    }}
                                >
                                    Rechazar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    onClick={async () => {
                                        if (window.confirm("¿Aprobar repartidor? Esto le permitirá recibir pedidos.")) {
                                            await supabase.from('users').update({
                                                verification_status: 'approved',
                                                isVerified: true
                                            }).eq('id', selectedDriver.id);
                                            setIsDrawerOpen(false);
                                        }
                                    }}
                                    disabled={selectedDriver.verification_status === 'approved'}
                                >
                                    Aprobar Alta
                                </button>
                            </div>
                        </div>

                        {/* Kill Switch */}
                        <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--color-border-light)' }}>
                            <button className="btn btn-error" style={{ width: '100%' }} onClick={async () => {
                                if (window.confirm("¿Suspender repartidor? No podrá recibir pedidos ni iniciar sesión.")) {
                                    await supabase.from('users').update({ isActive: false }).eq('id', selectedDriver.id);
                                    setIsDrawerOpen(false);
                                }
                            }}>
                                <Ban size={18} style={{ marginRight: 8, display: 'inline' }} /> Suspender Repartidor
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
