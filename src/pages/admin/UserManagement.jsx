import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart3, Store, Users, ShoppingBag, Settings, LogOut, Search, Shield, ShieldCheck, Ban, FileText, Star, X, Phone, Camera, Plus, Key, Bike, Truck, DollarSign, LayoutGrid, Gift, AlertTriangle, AlertCircle, CheckCircle2, Menu } from 'lucide-react';
import { supabase } from '../../supabase';
import AdvancedLocationPicker from '../../components/AdvancedLocationPicker';
import AdminSidebar from '../../components/admin/AdminSidebar';

const VEHICLE_BRANDS = [
    'Honda', 'Yamaha', 'Suzuki', 'Italika', 'Bajaj', 'Vento', 'KTM', 'TVS',
    'Nissan', 'Chevrolet', 'Volkswagen', 'Toyota', 'Kia', 'Ford', 'Mazda'
];

// SAMPLE_CLIENTS left intact here...
const SAMPLE_CLIENTS = [
    { id: 'c1', name: 'María Pérez', email: 'maria@ejemplo.com', orders: 12, spent: 2450, status: 'active', joined: '15 Jan 2024' },
    { id: 'c2', name: 'Juan García', email: 'juan@ejemplo.com', orders: 5, spent: 890, status: 'active', joined: '02 Feb 2024' },
    { id: 'c3', name: 'Luisa Mora', email: 'luisa@ejemplo.com', orders: 28, spent: 5600, status: 'blocked', joined: '10 Dec 2023' },
];

export default function UserManagement() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('clients');
    const [searchTerm, setSearchTerm] = useState('');
    const [clients, setClients] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Drawer State
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [amountPaid, setAmountPaid] = useState('');

    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
    const [showDriverAddressPicker, setShowDriverAddressPicker] = useState(false);
    const [driverForm, setDriverForm] = useState({
        name: '', email: '', phone: '', address: '',
        vehicleType: 'moto', vehicleBrand: '', vehiclePlates: '',
        isExclusive: false, assignedRestaurantId: ''
    });

    const [merchantsList, setMerchantsList] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            const { data } = await supabase.from('users').select('*');
            if (data) {
                setClients(data.filter(u => u.role === 'client'));
                // Ensure all drivers are shown, even those pending verification
                setDrivers(data.filter(u => u.role === 'driver'));
            }
        };
        fetchUsers();

        const channelUsers = supabase.channel('public:users')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchUsers())
            .subscribe();

        const fetchMerchants = async () => {
            const { data } = await supabase.from('merchants').select('id, name');
            if (data) setMerchantsList(data);
        };
        fetchMerchants();

        const channelMerchants = supabase.channel('public:merchants')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'merchants' }, () => fetchMerchants())
            .subscribe();

        return () => {
            supabase.removeChannel(channelUsers);
            supabase.removeChannel(channelMerchants);
        };
    }, []);

    // ── GESTIÓN KILL SWITCH UNIVERSAL ──
    const handleBlockUser = async (userId, collectionName, isCurrentlyBlocked) => {
        const action = isCurrentlyBlocked ? "Desbloquear" : "Bloquear";
        if (!window.confirm(`¿Estás seguro de ${action} a este usuario?`)) return;
        try {
            await supabase.from('users').update({
                isBlocked: !isCurrentlyBlocked,
                updatedAt: new Date().toISOString()
            }).eq('id', userId);
            alert(`Usuario ${action.toLowerCase()}do exitosamente.`);
        } catch (e) { alert("Error al actualizar estado"); }
    };

    const handleVerifyDriver = async (driverId) => {
        if (!window.confirm("¿Aprobar los documentos de este repartidor para que pueda recibir viajes?")) return;
        try {
            await supabase.from('users').update({
                isVerified: true,
                updatedAt: new Date().toISOString()
            }).eq('id', driverId);
            alert("Repartidor verificado y aprobado.");
            setIsDrawerOpen(false);
        } catch (e) { alert("Error al verificar."); }
    };

    const handleLiquidate = async () => {
        if (!selectedDriver || !amountPaid || isNaN(amountPaid) || Number(amountPaid) <= 0) {
            alert("Ingresa un monto válido");
            return;
        }
        try {
            const newAmount = Math.max(0, (selectedDriver.cashInHand || 0) - Number(amountPaid));
            await supabase.from('users').update({
                cashInHand: newAmount
            }).eq('id', selectedDriver.id);

            alert(`Se liquidaron $${amountPaid} exitosamente.`);
            setAmountPaid('');
            setIsDrawerOpen(false);
        } catch (error) {
            console.error(error);
            alert("Hubo un error al procesar el pago. Verifica consolola.");
        }
    };

    const handleSuspend = async () => {
        if (!selectedDriver) return;
        if (!window.confirm("🚨 ¿MATAR SESIÓN? Esto desconectará al repartidor y le impedirá trabajar y recibir pedidos al instante.")) return;
        try {
            await supabase.from('users').update({
                isActive: false,
                isOnline: false,
                isAvailable: false
            }).eq('id', selectedDriver.id);
            alert("Repartidor suspendido y desconectado.");
            setIsDrawerOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveDriver = async (e) => {
        e.preventDefault();
        try {
            // Generate a valid UUID for the placeholder record
            // This will be replaced by the real Auth UUID when the user signs up
            const tempId = self.crypto?.randomUUID() || '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');

            const newDriver = {
                id: tempId.slice(0, 36), // Ensure it matches UUID length if using fallback
                displayName: driverForm.name,
                email: driverForm.email,
                phone: driverForm.phone,
                role: 'driver',
                isVerified: false,
                isBlocked: false,
                cashInHand: 0,
                vehicleAttributes: {
                    type: driverForm.vehicleType,
                    brand: driverForm.vehicleBrand,
                    plates: driverForm.vehiclePlates
                },
                isExclusive: driverForm.isExclusive,
                assignedRestaurantId: driverForm.assignedRestaurantId || null,
                createdAt: new Date().toISOString()
            };

            const { error } = await supabase.from('users').insert([newDriver]);
            if (error) throw error;

            alert("Perfil de repartidor guardado. El repartidor debe registrarse en la aplicación usando el mismo correo para que se enlacen sus datos operativos.");
            setIsAddDriverOpen(false);
            setDriverForm({
                name: '', email: '', phone: '', address: '',
                vehicleType: 'moto', vehicleBrand: '', vehiclePlates: '',
                isExclusive: false, assignedRestaurantId: ''
            });
        } catch (error) {
            console.error(error);
            alert("Error al guardar: " + error.message);
        }
    };

    return (
        <div className="admin-layout">
            <AdminSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="admin-main">
                <header className="admin-header admin-header-responsive">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1>Gestión de Usuarios</h1>
                            <p>Control de clientes, flota de repartidores y exclusividad.</p>
                        </div>
                    </div>
                    {activeTab === 'drivers' && (
                        <div className="admin-header-actions">
                            <button className="btn btn-primary" onClick={() => setIsAddDriverOpen(true)}>
                                <Plus size={18} /> Nuevo Repartidor
                            </button>
                        </div>
                    )}
                </header>

                <div className="admin-content">
                    <div className="card" style={{ marginBottom: 24, padding: '8px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className={`btn ${activeTab === 'clients' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setActiveTab('clients')}
                                style={{ flex: 1 }}
                            >
                                <Users size={18} /> Clientes
                            </button>
                            <button
                                className={`btn ${activeTab === 'drivers' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setActiveTab('drivers')}
                                style={{ flex: 1 }}
                            >
                                <Truck size={18} /> Repartidores
                            </button>
                        </div>
                    </div>

                    <div className="card no-padding overflow-hidden">
                        <table className="admin-table">
                            <thead>
                                {activeTab === 'clients' ? (
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Email</th>
                                        <th>Registro</th>
                                        <th>Status</th>
                                        <th>Bloqueo Universal</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th>Repartidor</th>
                                        <th>Flota</th>
                                        <th>Validación</th>
                                        <th>Efectivo a favor</th>
                                        <th>Acciones</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {activeTab === 'clients' ? (
                                    clients.map(u => (
                                        <tr key={u.id}>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{u.displayName || 'Sin Nombre'}</div>
                                            </td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{u.email}</td>
                                            <td style={{ fontSize: '0.85rem' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                                            <td>
                                                <span className={`status-badge ${!u.isBlocked ? 'status-delivered' : 'status-cancelled'}`}>
                                                    {!u.isBlocked ? 'Activo' : 'Suspendido'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-icon btn-ghost"
                                                    onClick={() => handleBlockUser(u.id, 'users', u.isBlocked)}
                                                    style={{ color: u.isBlocked ? '#10b981' : '#ef4444' }}
                                                >
                                                    {u.isBlocked ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    drivers.map(u => {
                                        const isOverLimit = u.isBlockedDueToCash || false;
                                        const isInternalFleet = !!u.assignedRestaurantId;
                                        const merchantName = merchantsList.find(m => m.id === u.assignedRestaurantId)?.name || 'Local';

                                        return (
                                            <tr key={u.id}>
                                                <td>
                                                    <div style={{ fontWeight: 700 }}>{u.displayName || u.name || 'Sin Nombre'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{u.phone || u.email}</div>
                                                </td>
                                                <td>
                                                    {isInternalFleet ?
                                                        <span className="badge badge-warning">Exclusivo: {merchantName}</span> :
                                                        <span className="badge badge-primary">Abierto (General)</span>
                                                    }
                                                </td>
                                                <td>
                                                    {u.verification_status === 'approved' || u.isVerified ? (
                                                        <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <ShieldCheck size={14} /> Aprobado
                                                        </span>
                                                    ) : u.verification_status === 'pending' ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <AlertCircle size={14} /> Pendiente
                                                            </span>
                                                            <button
                                                                className="btn btn-ghost"
                                                                style={{ fontSize: '0.65rem', padding: '2px 4px', height: 'auto', color: 'var(--color-primary)' }}
                                                                onClick={() => { setSelectedDriver(u); setIsDrawerOpen(true); }}
                                                            >
                                                                Ver Expediente
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <X size={14} /> Rechazado
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 800, color: isOverLimit ? 'var(--color-error)' : 'inherit' }}>
                                                        ${(u.cashInHand || 0).toFixed(2)}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button className="btn btn-icon btn-ghost" onClick={() => handleBlockUser(u.id, 'drivers', u.isBlocked)} style={{ color: u.isBlocked ? '#10b981' : '#ef4444' }}>
                                                            {u.isBlocked ? <CheckCircle2 size={18} title="Desbloquear" /> : <Ban size={18} title="Bloquear (Kill Switch)" />}
                                                        </button>
                                                        <button className="btn btn-primary btn-sm" onClick={() => { setSelectedDriver(u); setIsDrawerOpen(true); }}>
                                                            Gestionar
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
                </div>
            </main>

            {/* Modal Onboarding Repartidor */}
            {isAddDriverOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '90%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
                        <h2 style={{ marginBottom: 20, fontSize: '1.25rem', fontWeight: 800 }}>Alta de Repartidor Logístico</h2>

                        <form onSubmit={handleSaveDriver}>
                            <h3 style={{ fontSize: '0.95rem', marginBottom: 16, color: 'var(--color-primary)' }}>1. Datos Personales</h3>
                            <div className="form-group"><input required type="text" className="form-input" placeholder="Nombre completo" value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} /></div>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                <div style={{ flex: 1 }}><input required type="tel" className="form-input" placeholder="Teléfono" value={driverForm.phone} onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })} /></div>
                                <div style={{ flex: 1 }}><input required type="email" className="form-input" placeholder="Email (Inicio sesión)" value={driverForm.email} onChange={e => setDriverForm({ ...driverForm, email: e.target.value })} /></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Dirección de Residencia Completa</label>
                                <div
                                    onClick={() => setShowDriverAddressPicker(true)}
                                    style={{
                                        padding: '12px 16px',
                                        border: '2px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        background: 'var(--color-surface)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span style={{ color: driverForm.address ? 'inherit' : 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        {typeof driverForm.address === 'object' ? driverForm.address?.street : (driverForm.address || 'Toca para seleccionar ubicación GPS...')}
                                    </span>
                                    <span style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600 }}>Seleccionar Mapas</span>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '0.95rem', margin: '24px 0 16px', color: 'var(--color-primary)' }}>2. Vehículo Operativo</h3>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <select className="form-input form-select" value={driverForm.vehicleType} onChange={e => setDriverForm({ ...driverForm, vehicleType: e.target.value })}>
                                        <option value="moto">Motocicleta</option>
                                        <option value="bici">Bicicleta</option>
                                        <option value="auto">Automóvil</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <input required type="text" list="vehicle-brands" className="form-input" placeholder="Marca/Modelo" value={driverForm.vehicleBrand} onChange={e => setDriverForm({ ...driverForm, vehicleBrand: e.target.value })} />
                                    <datalist id="vehicle-brands">
                                        {VEHICLE_BRANDS.map(brand => <option key={brand} value={brand} />)}
                                    </datalist>
                                </div>
                            </div>
                            <div className="form-group"><input required type="text" className="form-input" placeholder="Placas (Ej. XY-123)" value={driverForm.vehiclePlates} onChange={e => setDriverForm({ ...driverForm, vehiclePlates: e.target.value })} /></div>

                            <h3 style={{ fontSize: '0.95rem', margin: '24px 0 16px', color: 'var(--color-primary)' }}>3. Asignación de Flota (Exclusividad)</h3>
                            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, cursor: 'pointer' }}>
                                    <div className="toggle">
                                        <input type="checkbox" checked={driverForm.isExclusive} onChange={e => setDriverForm({ ...driverForm, isExclusive: e.target.checked })} />
                                        <div className="toggle-slider"></div>
                                    </div>
                                    Es Repartidor Exclusivo (Flota Interna)
                                </label>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 8 }}>
                                    Si se activa, el repartidor <strong>solo</strong> recibirá viajes del restaurante indicado y el pago en efectivo no generará deuda con la App.
                                </p>

                                {driverForm.isExclusive && (
                                    <div style={{ marginTop: 16 }}>
                                        <select required className="form-input form-select" value={driverForm.assignedRestaurantId} onChange={e => setDriverForm({ ...driverForm, assignedRestaurantId: e.target.value })}>
                                            <option value="" disabled>-- Selecciona un Comercio --</option>
                                            {merchantsList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsAddDriverOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Crear Piloto</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DRIVER DRAWER / MODAL - Gestión */}
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
                            <h2 style={{ margin: 0 }}>Panel Operativo</h2>
                            <button className="btn btn-icon btn-ghost" onClick={() => setIsDrawerOpen(false)}><X size={20} /></button>
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
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="number"
                                    className="input"
                                    style={{ flex: 1 }}
                                    value={amountPaid}
                                    onChange={(e) => setAmountPaid(e.target.value)}
                                    placeholder="Ej. 500"
                                />
                                <button className="btn btn-primary" onClick={handleLiquidate}>Abonar</button>
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
                            <button className="btn btn-error" style={{ width: '100%' }} onClick={handleSuspend}>
                                <Ban size={18} style={{ marginRight: 8, display: 'inline' }} /> Suspender Repartidor (Kill Switch)
                            </button>
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 12 }}>
                                Esto forzará el cierre de su sesión y le impedirá operar.
                            </p>
                        </div>
                    </div>
                </>
            )}

            {showDriverAddressPicker && (
                <div style={{ position: 'fixed', zIndex: 9999 }}>
                    <AdvancedLocationPicker
                        onSave={(addr) => {
                            setDriverForm({ ...driverForm, address: addr });
                            setShowDriverAddressPicker(false);
                        }}
                        onClose={() => setShowDriverAddressPicker(false)}
                    />
                </div>
            )}
        </div>
    );
}
