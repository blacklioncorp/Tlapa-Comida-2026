import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';
import { ArrowLeft, User, Phone, MapPin, LogOut, Save, Trash2, Plus, Home } from 'lucide-react';
import AdvancedLocationPicker from '../../components/AdvancedLocationPicker';

export default function ProfileSettings() {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();
    
    // Form state
    const [name, setName] = useState(user?.displayName || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [savedAddresses, setSavedAddresses] = useState(user?.savedAddresses || []);
    
    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [showAddressPicker, setShowAddressPicker] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.displayName || '');
            setPhone(user.phone || '');
            setSavedAddresses(user.savedAddresses || []);
        }
    }, [user]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveMessage('');

        try {
            await updateUser({
                displayName: name,
                phone: phone
            });
            setSaveMessage('Perfil actualizado correctamente.');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            console.error("Error updating profile:", error);
            setSaveMessage('Error al actualizar el perfil.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddAddress = async (newAddress) => {
        const updatedAddresses = [...savedAddresses, newAddress];
        try {
            await updateUser({ savedAddresses: updatedAddresses });
            setSavedAddresses(updatedAddresses);
            setShowAddressPicker(false);
        } catch (error) {
            console.error("Error adding address:", error);
            alert("Error al guardar la dirección.");
        }
    };

    const handleDeleteAddress = async (indexToDelete) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta dirección?")) return;
        
        const updatedAddresses = savedAddresses.filter((_, i) => i !== indexToDelete);
        try {
            await updateUser({ savedAddresses: updatedAddresses });
            setSavedAddresses(updatedAddresses);
        } catch (error) {
            console.error("Error deleting address:", error);
            alert("Error al eliminar la dirección.");
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    return (
        <div className="app-container" style={{ paddingBottom: 80 }}>
            {/* Header */}
            <div className="page-header sticky-header">
                <button className="btn btn-icon btn-ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Mi Perfil</h1>
            </div>

            <div style={{ padding: 16 }}>
                {/* Profile Information Form */}
                <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={18} color="var(--color-primary)" />
                        Datos Personales
                    </h2>
                    
                    <form onSubmit={handleSaveProfile}>
                        <div className="form-group">
                            <label className="form-label">Correo electrónico</label>
                            <input 
                                className="form-input" 
                                type="email" 
                                value={user?.email || ''} 
                                disabled 
                                style={{ background: 'var(--color-surface-hover)', cursor: 'not-allowed' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                El correo electrónico no se puede cambiar.
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nombre completo</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input 
                                    className="form-input" 
                                    style={{ paddingLeft: 36 }}
                                    type="text" 
                                    placeholder="Tu nombre completo"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Teléfono</label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input 
                                    className="form-input" 
                                    style={{ paddingLeft: 36 }}
                                    type="tel" 
                                    placeholder="Número a 10 dígitos"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {saveMessage && (
                            <div style={{ 
                                padding: 12, 
                                borderRadius: 8, 
                                background: saveMessage.includes('Error') ? '#fef2f2' : '#ecfdf5',
                                color: saveMessage.includes('Error') ? '#991b1b' : '#065f46',
                                fontSize: '0.85rem',
                                marginBottom: 16,
                                fontWeight: 600
                            }}>
                                {saveMessage}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-primary btn-block"
                            disabled={isSaving || (!name && !phone)}
                        >
                            {isSaving ? 'Guardando...' : (
                                <>
                                    <Save size={18} /> Guardar Cambios
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Saved Addresses Section */}
                <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MapPin size={18} color="var(--color-primary)" />
                            Mis Direcciones
                        </h2>
                        <button 
                            className="btn btn-sm btn-ghost" 
                            onClick={() => setShowAddressPicker(true)}
                            style={{ color: 'var(--color-primary)' }}
                        >
                            <Plus size={16} /> Agregar
                        </button>
                    </div>

                    {savedAddresses.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed var(--color-border)', borderRadius: 12 }}>
                            <MapPin size={24} color="var(--color-text-muted)" style={{ margin: '0 auto 8px' }} />
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No tienes direcciones guardadas.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {savedAddresses.map((addr, index) => (
                                <div key={index} style={{ 
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: 12, border: '1px solid var(--color-border-light)', borderRadius: 12,
                                    background: 'var(--color-surface-hover)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                                        <div style={{ 
                                            width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-bg)', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                                        }}>
                                            {addr.label?.toLowerCase() === 'casa' ? <Home size={16} color="var(--color-primary)" /> : <MapPin size={16} color="var(--color-primary)" />}
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{addr.label || 'Dirección Guardada'}</p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{addr.street}, {addr.colony}</p>
                                        </div>
                                    </div>
                                    <button 
                                        className="btn btn-icon btn-ghost" 
                                        onClick={() => handleDeleteAddress(index)}
                                        style={{ color: 'var(--color-error)' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Logout Button */}
                <div style={{ marginTop: 32 }}>
                    <button 
                        className="btn btn-block" 
                        onClick={handleLogout}
                        style={{ 
                            background: '#fef2f2', 
                            color: '#dc2626', 
                            border: '1px solid #fecaca',
                            fontWeight: 700
                        }}
                    >
                        <LogOut size={18} /> Cerrar Sesión
                    </button>
                </div>
            </div>

            {/* Address Modal */}
            {showAddressPicker && (
                <AdvancedLocationPicker 
                    onClose={() => setShowAddressPicker(false)}
                    onSave={handleAddAddress}
                />
            )}
        </div>
    );
}
