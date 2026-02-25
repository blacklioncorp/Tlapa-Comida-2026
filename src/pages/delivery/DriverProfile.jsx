import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { MapPin, Clock, Wallet as WalletIcon, User, LogOut, ChevronRight, Star, Settings, ShieldQuestion, Car } from 'lucide-react';

export default function DriverProfile() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { orders } = useOrders();

    // Mock stats
    const myDeliveries = orders.filter(o => o.driverId === user?.id && o.status === 'delivered');
    const totalDeliveries = myDeliveries.length || 142; // default 142 if no data
    const rating = 4.8;
    const acceptanceRate = 95;

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error);
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
                        {/* Placeholder generic user avatar */}
                        <div style={{
                            width: '100%', height: '100%',
                            background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 448 512'%3E%3Cpath fill='%2364748b' d='M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z'/%3E%3C/svg%3E") no-repeat center center`,
                            backgroundSize: '50%', backgroundColor: '#e2e8f0'
                        }} />
                    </div>
                    <div>
                        <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Repartidor Activo</p>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{user?.name || 'Carlos M.'}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 20, width: 'fit-content' }}>
                            <Star size={14} color="#fbbf24" fill="#fbbf24" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{rating} Calificación</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px 100px' }}>
                {/* Stats Row */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
                    <div style={{ flex: 1, background: 'white', borderRadius: 20, padding: 16, border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                            <Star size={18} color="#f59e0b" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{acceptanceRate}%</h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Tasa de aceptación</p>
                    </div>
                    <div style={{ flex: 1, background: 'white', borderRadius: 20, padding: 16, border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                            <MapPin size={18} color="#10b981" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{totalDeliveries}</h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Viajes completados</p>
                    </div>
                </div>

                {/* Settings Menu */}
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 8px' }}>Configuración</h3>
                <div style={{ background: 'white', borderRadius: 24, padding: '8px 16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', marginBottom: 24 }}>

                    <button style={{ width: '100%', padding: '16px 0', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={20} color="#64748b" />
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>Detalles de la cuenta</span>
                        </div>
                        <ChevronRight size={20} color="#cbd5e1" />
                    </button>

                    <button style={{ width: '100%', padding: '16px 0', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Car size={20} color="#64748b" />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <span style={{ display: 'block', fontSize: '1rem', fontWeight: 600, color: '#334155' }}>Mi Vehículo</span>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Italika WS150 (AX-123)</span>
                            </div>
                        </div>
                        <ChevronRight size={20} color="#cbd5e1" />
                    </button>

                    <button style={{ width: '100%', padding: '16px 0', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Settings size={20} color="#64748b" />
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>Preferencias de App</span>
                        </div>
                        <ChevronRight size={20} color="#cbd5e1" />
                    </button>

                    <button style={{ width: '100%', padding: '16px 0', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
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

            {/* Bottom Nav */}
            <nav className="bottom-nav">
                <button className="bottom-nav-item" onClick={() => navigate('/delivery')}>
                    <MapPin size={22} style={{ marginBottom: 4 }} />
                    MAPA
                </button>
                <button className="bottom-nav-item">
                    <Clock size={22} style={{ marginBottom: 4 }} />
                    HISTORIAL
                </button>
                <button className="bottom-nav-item" onClick={() => navigate('/delivery/wallet')}>
                    <WalletIcon size={22} style={{ marginBottom: 4 }} />
                    CARTERA
                </button>
                <button className="bottom-nav-item active">
                    <User size={22} style={{ marginBottom: 4 }} />
                    PERFIL
                </button>
            </nav>
        </div>
    );
}
