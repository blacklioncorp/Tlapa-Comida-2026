import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { supabase } from '../../supabase';
import { MapPin, Wallet as WalletIcon, User, LogOut, ChevronRight, Star, Settings, ShieldQuestion, Car, X, Save, Lock } from 'lucide-react';

export default function DriverProfile() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { orders } = useOrders();

    const [activeModal, setActiveModal] = useState(null); // 'account', 'vehicle', 'help'
    const [saving, setSaving] = useState(false);

    // Vehicle state (local for editing)
    const [vehicle, setVehicle] = useState({
        model: user?.driverMeta?.vehicleModel || 'Italika WS150',
        plate: user?.driverMeta?.plates || 'AX-123',
        color: user?.driverMeta?.vehicleColor || 'Negro'
    });

    // Mock stats
    const myDeliveries = orders.filter(o => o.driverId === user?.id && o.status === 'delivered');
    const rating = 4.8;

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const saveVehicle = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('users').update({
                driverMeta: {
                    ...user.driverMeta,
                    vehicleModel: vehicle.model,
                    plates: vehicle.plate,
                    vehicleColor: vehicle.color
                }
            }).eq('id', user.id);

            if (error) throw error;
            setActiveModal(null);
            alert("Vehículo actualizado correctamente.");
        } catch (err) {
            alert("Error al guardar: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', padding: 0 }}>
            {/* Header / Profile Card */}
            <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                padding: '48px 24px 32px',
                color: 'white',
                borderBottomLeftRadius: '32px',
                borderBottomRightRadius: '32px',
                position: 'relative',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
                <div style={{ position: 'absolute', right: -20, top: -20, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(238,101,43,0.15) 0%, transparent 70%)' }} />

                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 24px', textAlign: 'center' }}>Mi Perfil</h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%', background: '#334155',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '4px solid rgba(255,255,255,0.1)', flexShrink: 0,
                        overflow: 'hidden'
                    }}>
                        <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.name || 'Driver'}&background=random`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                        <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Repartidor Activo</p>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{user?.name || user?.displayName || 'Cargando...'}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 20, width: 'fit-content' }}>
                            <Star size={14} color="#fbbf24" fill="#fbbf24" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{rating} Calificación</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px 100px' }}>
                {/* Settings Menu */}
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 8px' }}>Configuración</h3>
                <div style={{ background: 'white', borderRadius: 24, padding: '8px 16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', marginBottom: 24 }}>

                    <button
                        onClick={() => setActiveModal('account')}
                        style={{ width: '100%', padding: '16px 0', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={20} color="#64748b" />
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>Detalles de la cuenta</span>
                        </div>
                        <ChevronRight size={20} color="#cbd5e1" />
                    </button>

                    <button
                        onClick={() => setActiveModal('vehicle')}
                        style={{ width: '100%', padding: '16px 0', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Car size={20} color="#64748b" />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <span style={{ display: 'block', fontSize: '1rem', fontWeight: 600, color: '#334155' }}>Mi Vehículo</span>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{vehicle.model} ({vehicle.plate})</span>
                            </div>
                        </div>
                        <ChevronRight size={20} color="#cbd5e1" />
                    </button>

                    <button
                        onClick={() => alert("Próximamente: Configura notificaciones y apariencia.")}
                        style={{ width: '100%', padding: '16px 0', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Settings size={20} color="#64748b" />
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>Preferencias de App</span>
                        </div>
                        <ChevronRight size={20} color="#cbd5e1" />
                    </button>

                    <button
                        onClick={() => navigate('/support')}
                        style={{ width: '100%', padding: '16px 0', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShieldQuestion size={20} color="#64748b" />
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>Centro de Ayuda</span>
                        </div>
                        <ChevronRight size={20} color="#cbd5e1" />
                    </button>

                </div>

                {/* Logout Button */}
                <button onClick={handleLogout} style={{
                    width: '100%', padding: '16px', borderRadius: '16px', background: '#fef2f2', border: '1px solid #fee2e2',
                    color: '#ef4444', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer'
                }}>
                    <LogOut size={20} />
                    Cerrar Sesión
                </button>
                <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Versión de la App 2.1.0 (Build 42)</p>
            </div>

            {/* MODALS */}
            {activeModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
                }}>
                    <div style={{
                        width: '100%', maxWidth: 500, background: 'white',
                        borderTopLeftRadius: 32, borderTopRightRadius: 32,
                        padding: '32px 24px 48px', position: 'relative',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <button
                            onClick={() => setActiveModal(null)}
                            style={{ position: 'absolute', right: 24, top: 24, border: 'none', background: '#f1f5f9', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <X size={18} color="#64748b" />
                        </button>

                        {activeModal === 'account' && (
                            <div>
                                <div style={{ marginBottom: 24 }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px' }}>Detalles de la cuenta</h3>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Información básica de tu perfil de repartidor.</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 16 }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>ID de Usuario</p>
                                        <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>{user?.id?.substring(0, 8)}...</p>
                                    </div>
                                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 16 }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Nombre Completo</p>
                                        <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>{user?.name || user?.displayName}</p>
                                    </div>
                                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 16 }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Correo Electrónico</p>
                                        <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>{user?.email}</p>
                                    </div>

                                    <button
                                        onClick={() => alert("Para cambiar tu contraseña, usa la opción 'Olvidé mi contraseña' en el login o contacta a soporte.")}
                                        style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, color: '#f97316', background: 'none', border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                                    >
                                        <Lock size={16} /> Cambiar Contraseña
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeModal === 'vehicle' && (
                            <div>
                                <div style={{ marginBottom: 24 }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px' }}>Mi Vehículo</h3>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Actualiza los datos del vehículo que usas para repartir.</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="form-group">
                                        <label className="form-label">Modelo del Vehículo</label>
                                        <input
                                            className="form-input"
                                            value={vehicle.model}
                                            onChange={(e) => setVehicle(prev => ({ ...prev, model: e.target.value }))}
                                            placeholder="Ej: Italika WS150"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Número de Placas</label>
                                        <input
                                            className="form-input"
                                            value={vehicle.plate}
                                            onChange={(e) => setVehicle(prev => ({ ...prev, plate: e.target.value.toUpperCase() }))}
                                            placeholder="Ej: AX-123"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Color</label>
                                        <input
                                            className="form-input"
                                            value={vehicle.color}
                                            onChange={(e) => setVehicle(prev => ({ ...prev, color: e.target.value }))}
                                            placeholder="Ej: Rojo"
                                        />
                                    </div>

                                    <button
                                        onClick={saveVehicle}
                                        disabled={saving}
                                        style={{
                                            marginTop: 12, width: '100%', background: '#1e293b', color: 'white',
                                            padding: 16, borderRadius: 16, border: 'none', fontWeight: 700,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                        }}
                                    >
                                        <Save size={20} />
                                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>

            {/* Bottom Nav */}
            <nav className="bottom-nav">
                <button className="bottom-nav-item" onClick={() => navigate('/delivery')}>
                    <MapPin size={22} style={{ marginBottom: 4 }} />
                    MAPA
                </button>
                <button className="bottom-nav-item" onClick={() => navigate('/delivery/wallet')}>
                    <WalletIcon size={22} style={{ marginBottom: 4 }} />
                    FINANZAS
                </button>
                <button className="bottom-nav-item active">
                    <User size={22} style={{ marginBottom: 4 }} />
                    PERFIL
                </button>
            </nav>
        </div>
    );
}
