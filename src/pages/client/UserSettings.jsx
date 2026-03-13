import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, User, MapPin, ShieldCheck, FileText, Info, LogOut, ChevronRight, Home, Trash2, Plus } from 'lucide-react';
import AdvancedLocationPicker from '../../components/AdvancedLocationPicker';

export default function UserSettings() {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    
    // View state: 'menu' | 'addresses'
    const [view, setView] = useState('menu');
    const [showAddressPicker, setShowAddressPicker] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    const handleAddAddress = async (newAddress) => {
        const savedAddresses = user?.savedAddresses || [];
        const updatedAddresses = [...savedAddresses, newAddress];
        try {
            await updateUser({ savedAddresses: updatedAddresses });
            setShowAddressPicker(false);
        } catch (error) {
            console.error("Error adding address:", error);
            alert("Error al guardar la dirección.");
        }
    };

    const handleDeleteAddress = async (indexToDelete) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta dirección?")) return;
        
        const savedAddresses = user?.savedAddresses || [];
        const updatedAddresses = savedAddresses.filter((_, i) => i !== indexToDelete);
        try {
            await updateUser({ savedAddresses: updatedAddresses });
        } catch (error) {
            console.error("Error deleting address:", error);
            alert("Error al eliminar la dirección.");
        }
    };

    if (view === 'addresses') {
        const savedAddresses = user?.savedAddresses || [];
        return (
            <div className="app-container" style={{ paddingBottom: 80, background: '#f5f5f5', minHeight: '100vh' }}>
                <div className="page-header sticky-header" style={{ background: 'white' }}>
                    <button className="btn btn-icon btn-ghost" onClick={() => setView('menu')}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1>Mis lugares favoritos</h1>
                </div>

                <div style={{ padding: 16 }}>
                    <button 
                        className="btn btn-block" 
                        onClick={() => setShowAddressPicker(true)}
                        style={{ background: 'white', color: 'var(--color-primary)', border: 'none', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12 }}
                    >
                        <Plus size={20} /> Agregar lugar favorito
                    </button>

                    {savedAddresses.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                            <MapPin size={40} color="#ccc" style={{ margin: '0 auto 16px' }} />
                            <p>Aún no tienes lugares guardados.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {savedAddresses.map((addr, index) => (
                                <div key={index} style={{ 
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '16px', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                                        <div style={{ background: '#f5f5f5', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {addr.label?.toLowerCase() === 'casa' ? <Home size={20} color="#ee652b" /> : <MapPin size={20} color="#ee652b" />}
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 4px' }}>{addr.label || 'Dirección Guardada'}</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>{addr.street}, {addr.colony}</p>
                                        </div>
                                    </div>
                                    <button 
                                        className="btn btn-icon btn-ghost" 
                                        onClick={() => handleDeleteAddress(index)}
                                    >
                                        <Trash2 size={20} color="#ccc" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {showAddressPicker && (
                    <AdvancedLocationPicker 
                        onClose={() => setShowAddressPicker(false)}
                        onSave={handleAddAddress}
                    />
                )}
            </div>
        );
    }

    // Main Menu View
    return (
        <div className="app-container" style={{ paddingBottom: 80, background: '#f5f5f5', minHeight: '100vh' }}>
            <div className="page-header" style={{ borderBottom: 'none', background: '#f5f5f5' }}>
                <button className="btn btn-icon btn-ghost" onClick={() => navigate('/')}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Configuración</h1>
            </div>

            <div style={{ padding: '0 16px' }}>
                <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 24, padding: '8px 0' }}>
                    
                    <button 
                        className="menu-row-item" 
                        onClick={() => navigate('/profile/identity')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}
                    >
                        <span style={{ fontSize: '1rem', color: '#1a1a1a' }}>Mi perfil</span>
                        <ChevronRight size={20} color="#ccc" />
                    </button>

                    <button 
                        className="menu-row-item" 
                        onClick={() => setView('addresses')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}
                    >
                        <span style={{ fontSize: '1rem', color: '#1a1a1a' }}>Mis lugares favoritos</span>
                        <ChevronRight size={20} color="#ccc" />
                    </button>

                    <button 
                        className="menu-row-item"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}
                    >
                        <span style={{ fontSize: '1rem', color: '#1a1a1a' }}>Privacidad</span>
                        <ChevronRight size={20} color="#ccc" />
                    </button>

                    <button 
                        className="menu-row-item"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}
                    >
                        <span style={{ fontSize: '1rem', color: '#1a1a1a' }}>Términos y Condiciones</span>
                        <ChevronRight size={20} color="#ccc" />
                    </button>

                    <button 
                        className="menu-row-item"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}
                    >
                        <span style={{ fontSize: '1rem', color: '#1a1a1a' }}>Acerca de Tlapa Food</span>
                        <ChevronRight size={20} color="#ccc" />
                    </button>

                    <button 
                        className="menu-row-item"
                        onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <span style={{ fontSize: '1rem', color: '#1a1a1a' }}>Cerrar sesión</span>
                        <ChevronRight size={20} color="#ccc" />
                    </button>
                </div>
            </div>
            
            <style>{`
                .menu-row-item:hover { background-color: #fafafa !important; }
                .menu-row-item:active { background-color: #f0f0f0 !important; }
            `}</style>
        </div>
    );
}
