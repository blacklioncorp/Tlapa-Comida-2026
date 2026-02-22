import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart3, Store, Users, ShoppingBag, Settings, LogOut, Search, Shield, Ban, FileText, Star, X, Phone, Camera, Plus, Key, Bike, Truck, DollarSign, LayoutGrid, Gift, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../firebase';

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

    // Drawer State
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [amountPaid, setAmountPaid] = useState('');

    // Configuración del modal de Alta/Edición
    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
    const [driverForm, setDriverForm] = useState({
        name: '', email: '', phone: '', address: '',
        vehicleType: 'moto', vehicleBrand: '', vehiclePlates: '',
        isExclusive: false, assignedRestaurantId: ''
    });

    const [merchantsList, setMerchantsList] = useState([]);

    useEffect(() => {
        // Fetch Drivers
        const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snapshot) => {
            const data = [];
            snapshot.forEach(d => data.push({ id: d.id, ...d.data() }));
            setDrivers(data);
        });

        // Fetch Clients
        const unsubClients = onSnapshot(collection(db, 'users'), (snapshot) => {
            const data = [];
            snapshot.forEach(d => {
                const u = d.data();
                if (u.role === 'client') data.push({ id: d.id, ...u });
            });
            setClients(data);
        });

        // Use actual merchants database instead of seedData
        const unsubMerchants = onSnapshot(collection(db, 'restaurants'), (snapshot) => {
            const data = [];
            snapshot.forEach(d => data.push({ id: d.id, ...d.data() }));
            setMerchantsList(data);
        });

        return () => { unsubDrivers(); unsubClients(); unsubMerchants(); };
    }, []);

    // ── GESTIÓN KILL SWITCH UNIVERSAL ──
    const handleBlockUser = async (userId, collectionName, isCurrentlyBlocked) => {
        const action = isCurrentlyBlocked ? "Desbloquear" : "Bloquear";
        if (!window.confirm(`¿Estás seguro de ${action} a este usuario?`)) return;
        try {
            await updateDoc(doc(db, collectionName, userId), {
                isBlocked: !isCurrentlyBlocked,
                updatedAt: new Date().toISOString()
            });
            alert(`Usuario ${action.toLowerCase()}do exitosamente.`);
        } catch (e) { alert("Error al actualizar estado"); }
    };

    const handleVerifyDriver = async (driverId) => {
        if (!window.confirm("¿Aprobar los documentos de este repartidor para que pueda recibir viajes?")) return;
        try {
            await updateDoc(doc(db, 'drivers', driverId), {
                isVerified: true,
                updatedAt: new Date().toISOString()
            });
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
            const functions = getFunctions();
            const liquidate = httpsCallable(functions, 'liquidateDebt');
            await liquidate({ driverId: selectedDriver.id, amountPaid: Number(amountPaid) });
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
            await updateDoc(doc(db, 'drivers', selectedDriver.id), {
                isActive: false, // Opcional, dependiendo de la logica global de auth
                isOnline: false,
                isAvailable: false
            });
            alert("Repartidor suspendido y desconectado.");
            setIsDrawerOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveDriver = async (e) => {
        e.preventDefault();
        try {
            // Nota: En producción, lo ideal es crearle Auth account con Cloud Functions, 
            // aquí solo creamos el Documento Firestore de su Perfil Piloto para Onboarding
            const newDriverRef = doc(collection(db, 'drivers'));
            await updateDoc(newDriverRef, {
                ...driverForm,
                assignedRestaurantId: driverForm.isExclusive ? driverForm.assignedRestaurantId : null,
                isVerified: false,
                isBlocked: false,
                cashInHand: 0,
                maxCashLimit: 1000,
                isOnline: false,
                isAvailable: false,
                createdAt: new Date().toISOString()
            }, { merge: false }).catch(async () => {
                // Si falla update (no existe), usamos setDoc
                const { setDoc } = await import('firebase/firestore');
                await setDoc(newDriverRef, {
                    ...driverForm,
                    assignedRestaurantId: driverForm.isExclusive ? driverForm.assignedRestaurantId : null,
                    isVerified: false,
                    isBlocked: false,
                    cashInHand: 0,
                    maxCashLimit: 1000,
                    isOnline: false,
                    isAvailable: false,
                    createdAt: new Date().toISOString()
                });
            });
            alert("Repartidor registrado. Requiere aprobar sus documentos para operar.");
            setIsAddDriverOpen(false);
        } catch (error) {
            console.error(error);
            alert("Error al crear repartidor.");
        }
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
                    <button className="sidebar-link active">
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

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1>Gestión de Usuarios</h1>
                        <p>Control de clientes, flota de repartidores y exclusividad.</p>
                    </div>
                    {activeTab === 'drivers' && (
                        <button className="btn btn-primary" onClick={() => setIsAddDriverOpen(true)}>
                            <Plus size={18} /> Nuevo Repartidor
                        </button>
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
                                                    {u.isVerified ?
                                                        <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}><Shield size={14} /> Aprobado</span> :
                                                        <span style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={14} /> Pendiente</span>
                                                    }
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
                            <div className="form-group"><textarea required className="form-input" placeholder="Dirección de Residencia Completa" rows="2" value={driverForm.address} onChange={e => setDriverForm({ ...driverForm, address: e.target.value })}></textarea></div>

                            <h3 style={{ fontSize: '0.95rem', margin: '24px 0 16px', color: 'var(--color-primary)' }}>2. Vehículo Operativo</h3>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <select className="form-input form-select" value={driverForm.vehicleType} onChange={e => setDriverForm({ ...driverForm, vehicleType: e.target.value })}>
                                        <option value="moto">Motocicleta</option>
                                        <option value="bici">Bicicleta</option>
                                        <option value="auto">Automóvil</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}><input required type="text" className="form-input" placeholder="Marca/Modelo" value={driverForm.vehicleBrand} onChange={e => setDriverForm({ ...driverForm, vehicleBrand: e.target.value })} /></div>
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
                                <FileText size={18} color="#3b82f6" /> Documentos del Repartidor
                            </h3>
                            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                                <div style={{ minWidth: 120, height: 80, background: '#e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                                    INE (Frente)
                                </div>
                                <div style={{ minWidth: 120, height: 80, background: '#e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                                    INE (Reverso)
                                </div>
                                <div style={{ minWidth: 120, height: 80, background: '#e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                                    Licencia
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.75rem' }}>Ver Detalle</button>
                                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => handleVerifyDriver(selectedDriver.id)} disabled={selectedDriver.isVerified}>
                                    {selectedDriver.isVerified ? "✅ Verificado" : "Aprobar Docs"}
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
        </div>
    );
}
