import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, User, Phone, Save, Trash2, Mail, ShieldCheck } from 'lucide-react';

export default function ProfileSettings() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    
    // Form state
    const [name, setName] = useState(user?.displayName || '');
    const [phone, setPhone] = useState(user?.phone || '');
    
    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.displayName || '');
            setPhone(user.phone || '');
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

    const handleDeleteAccount = () => {
        if(window.confirm("¿Estás seguro que deseas solicitar la eliminación de tu cuenta? Esta acción es irreversible.")) {
            alert("Solicitud de eliminación enviada al soporte.");
        }
    };

    return (
        <div className="app-container" style={{ paddingBottom: 80, background: '#f5f5f5', minHeight: '100vh' }}>
            <div className="page-header sticky-header" style={{ background: 'white' }}>
                <button className="btn btn-icon btn-ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
            </div>

            <div style={{ padding: '0 16px', marginTop: -20, position: 'relative', zIndex: 10 }}>
                {/* Avatar and Verification Badge */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ 
                        width: 80, height: 80, borderRadius: '50%', background: '#dce8f4', margin: '0 auto 12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                    }}>
                        <User size={48} color="#94b2d1" style={{ marginTop: 12 }} />
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f5f5f5', padding: '6px 16px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 600 }}>
                        <ShieldCheck size={16} color="#0066ff" fill="#cce0ff" />
                        Identidad verificada
                    </div>
                </div>

                {/* Profile Information Form */}
                <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', padding: '16px 20px', marginBottom: 24 }}>
                    <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
                            <label style={{ color: '#1a1a1a', fontSize: '1rem', flexShrink: 0 }}>Nombre</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{ border: 'none', textAlign: 'right', fontSize: '1rem', color: '#666', outline: 'none', width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
                            <label style={{ color: '#1a1a1a', fontSize: '1rem', flexShrink: 0 }}>Teléfono</label>
                            <input 
                                type="tel" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                style={{ border: 'none', textAlign: 'right', fontSize: '1rem', color: '#666', outline: 'none', width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
                            <label style={{ color: '#1a1a1a', fontSize: '1rem', flexShrink: 0 }}>Correo electrónico</label>
                            <span style={{ fontSize: '1rem', color: '#ccc' }}>
                                {user?.email ? user.email.replace(/(.{2})(.*)(?=@)/, '$1***') : ''}
                            </span>
                        </div>

                        {saveMessage && (
                            <div style={{ 
                                padding: 12, borderRadius: 8, 
                                background: saveMessage.includes('Error') ? '#fef2f2' : '#ecfdf5',
                                color: saveMessage.includes('Error') ? '#dc2626' : '#059669',
                                fontSize: '0.85rem', textAlign: 'center', fontWeight: 600
                            }}>
                                {saveMessage}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-primary btn-block"
                            disabled={isSaving || !name}
                            style={{ borderRadius: 100, padding: 16, marginTop: 8 }}
                        >
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </form>
                </div>

                {/* Account Actions */}
                <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
                    <button 
                        onClick={() => navigate('/forgot-password')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <span style={{ fontSize: '1rem', color: '#1a1a1a' }}>Cambiar mi contraseña</span>
                        <ChevronRight size={20} color="#ccc" />
                    </button>
                    <button 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <span style={{ fontSize: '1rem', color: '#1a1a1a' }}>Mis dispositivos</span>
                        <ChevronRight size={20} color="#ccc" />
                    </button>
                </div>

                <div style={{ marginTop: 24 }}>
                    <button 
                        onClick={handleDeleteAccount}
                        className="btn btn-block"
                        style={{ background: 'white', color: '#ee652b', border: 'none', borderRadius: 100, padding: 16, fontSize: '1rem', fontWeight: 600, display: 'flex', justifyContent: 'center' }}
                    >
                        Eliminar mi cuenta
                    </button>
                </div>

            </div>
        </div>
    );
}

const ChevronRight = ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
    </svg>
);
