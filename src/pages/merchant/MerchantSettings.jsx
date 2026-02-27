import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';
import {
    LayoutDashboard, UtensilsCrossed, ShoppingBag, Settings,
    LogOut, Save, Store, Clock, MapPin, Camera, AlertOctagon
} from 'lucide-react';

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const DEFAULT_SCHEDULE = {
    0: { active: false, open: '09:00', close: '22:00' },
    1: { active: true, open: '09:00', close: '22:00' },
    2: { active: true, open: '09:00', close: '22:00' },
    3: { active: true, open: '09:00', close: '22:00' },
    4: { active: true, open: '09:00', close: '22:00' },
    5: { active: true, open: '09:00', close: '23:00' },
    6: { active: true, open: '09:00', close: '23:00' },
};

export default function MerchantSettings() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    // Password state
    const [newPassword, setNewPassword] = useState('');
    const [passwordStatus, setPasswordStatus] = useState('');

    const merchantId = user?.merchantId;

    const [form, setForm] = useState({
        name: '',
        description: '',
        phone: '',
        deliveryTime: '20-30',
        deliveryFee: 20,
        minOrder: 100,
        addressStreet: '',
        addressColony: '',
        image: '',
        bannerUrl: '',
        logoUrl: '',
        isOpen: true,
        prepTimeMinutes: 20,
        schedule: DEFAULT_SCHEDULE,
        primaryColor: '#e14a27', // Default Tlapa color
    });

    // Freemium limits
    const [customizationAttempts, setCustomizationAttempts] = useState(0);
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        const fetchMerchant = async () => {
            if (!merchantId) {
                setLoading(false);
                return;
            }
            try {
                const { data, error } = await supabase.from('merchants').select('*').eq('id', merchantId).single();
                if (data && !error) {
                    setForm(prev => ({
                        ...prev,
                        ...data,
                        addressColony: data.address?.colony || data.addressColony || '',
                        schedule: data.schedule || DEFAULT_SCHEDULE,
                        prepTimeMinutes: data.prepTimeMinutes || 20,
                        isOpen: data.isOpen ?? true,
                        primaryColor: data.brandData?.primaryColor || '#e14a27',
                    }));
                    setCustomizationAttempts(data.customizationAttempts || 0);
                    setIsPremium(data.isPremium || false);
                }
            } catch (error) {
                console.error("Error fetching merchant data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMerchant();
    }, [merchantId]);

    const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleScheduleChange = (dayIndex, field, value) => {
        setForm(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [dayIndex]: {
                    ...prev.schedule[dayIndex],
                    [field]: value
                }
            }
        }));
    };

    const handleSave = async () => {
        if (!merchantId) return;
        try {
            // Determine if customization was attempted (Identity visual fields)
            const isEditingIdentity = true; // We save everything together for now
            let newAttempts = customizationAttempts;

            // If they are not premium and editing identity, increment their counter
            if (isEditingIdentity && !isPremium) {
                newAttempts += 1;
            }

            const { error } = await supabase.from('merchants').update({
                name: form.name,
                description: form.description,
                phone: form.phone,
                deliveryTime: form.deliveryTime,
                deliveryFee: form.deliveryFee,
                minOrder: form.minOrder,
                isOpen: form.isOpen,
                prepTimeMinutes: form.prepTimeMinutes,
                schedule: form.schedule,
                address: JSON.stringify({
                    street: form.addressStreet,
                    colony: form.addressColony
                }),
                brandData: {
                    primaryColor: form.primaryColor,
                    logoUrl: form.logoUrl,
                    bannerUrl: form.bannerUrl
                },
                customizationAttempts: newAttempts,
                updatedAt: new Date().toISOString()
            }).eq('id', merchantId);

            if (error) throw error;

            setCustomizationAttempts(newAttempts);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (error) {
            console.error("Error saving merchant settings:", error);
            alert("No se pudo guardar la configuración.");
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            setPasswordStatus('error:La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setPasswordStatus('loading:Actualizando...');

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            setPasswordStatus('success:Contraseña actualizada con éxito.');
            setNewPassword('');
            setTimeout(() => setPasswordStatus(''), 4000);
        } catch (error) {
            console.error(error);
            setPasswordStatus('error:No se pudo actualizar la contraseña. Reintenta.');
        }
    };

    const handleEmergencyClose = async () => {
        if (!window.confirm("🚨 ¿ESTÁS SEGURO? Esto cerrará tu restaurante inmediatamente en la app de clientes, ignorando tus horarios normales.")) return;

        try {
            const { error } = await supabase.from('merchants').update({
                isOpen: false,
                updatedAt: new Date().toISOString()
            }).eq('id', merchantId);

            if (error) throw error;

            setForm(prev => ({ ...prev, isOpen: false }));
            alert("Tienda CERRADA. Ya no estás visible para nuevos pedidos.");
        } catch (error) {
            console.error("Error en cierre de emergencia:", error);
            alert("Hubo un error al intentar cerrar la tienda.");
        }
    };

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Cargando ajustes del local...</div>;
    }

    if (!merchantId) {
        return (
            <div className="admin-layout">
                <main className="admin-main">
                    <div style={{ textAlign: 'center', padding: 80 }}>
                        <span style={{ fontSize: 64 }}>🏪</span>
                        <h2 style={{ marginTop: 16 }}>No se encontró el comercio asociado.</h2>
                        <p>Por favor contacta a soporte.</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar" style={{ background: '#111827' }}>
                <div className="logo" style={{ color: 'white' }}>Tlapa <span>Commercio</span></div>
                <nav className="sidebar-nav">
                    <button className="sidebar-link" onClick={() => navigate('/merchant')} style={{ color: '#9ca3af' }}>
                        <LayoutDashboard size={18} /> Dashboard
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/merchant/menu')} style={{ color: '#9ca3af' }}>
                        <UtensilsCrossed size={18} /> Menú / Platillos
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/merchant/orders')} style={{ color: '#9ca3af' }}>
                        <ShoppingBag size={18} /> Historial Pedidos
                    </button>
                    <button className="sidebar-link active" style={{ color: 'white' }}>
                        <Settings size={18} /> Ajustes Local
                    </button>
                </nav>
                <div style={{ marginTop: 'auto' }}>
                    <button className="sidebar-link" onClick={logout} style={{ color: '#ef4444' }}>
                        <LogOut size={18} /> Cerrar sesión
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Ajustes del Local</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Configura horarios y disponibilidad (Sincronizado con Firebase)</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {form.isOpen && (
                            <button className="btn btn-error" onClick={handleEmergencyClose} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertOctagon size={16} /> CIERRE DE EMERGENCIA
                            </button>
                        )}
                        <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Save size={16} /> Guardar Cambios
                        </button>
                    </div>
                </div>

                {saved && (
                    <div className="toast success" style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 999 }}>
                        ✅ Cambios guardados en la nube
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24 }}>

                    {/* Disponibilidad Global (Switch) */}
                    <div style={{ gridColumn: '1 / -1', background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        {/* Online/Offline Toggle */}
                        <div style={{
                            padding: 20, borderRadius: 12,
                            background: form.isOpen ? '#dcfce7' : '#fee2e2',
                            border: `2px solid ${form.isOpen ? '#16a34a' : '#ef4444'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div>
                                <h4 style={{ fontWeight: 800, fontSize: '1.2rem', color: form.isOpen ? '#16a34a' : '#ef4444' }}>
                                    {form.isOpen ? '🟢 Restaurante Abierto (Recibiendo Pedidos)' : '🔴 Restaurante Cerrado (Pausado)'}
                                </h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                    {form.isOpen ? 'Los clientes pueden ver tu menú y hacer pedidos según tu horario.' : 'Has bloqueado la entrada de pedidos. Nadie podrá comprarte hasta que vuelvas a abrir.'}
                                </p>
                            </div>
                            <label className="toggle" style={{ transform: 'scale(1.2)' }}>
                                <input type="checkbox" checked={form.isOpen} onChange={(e) => update('isOpen', e.target.checked)} />
                                <span className="toggle-slider" />
                            </label>
                        </div>
                    </div>

                    {/* Schedule (Horarios) */}
                    <div style={{ gridColumn: '1 / -1', background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Clock size={20} color="#16a34a" />
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Horarios Operativos</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Define en qué horas de la semana se permiten pedidos.</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {DAYS_OF_WEEK.map((dayName, index) => {
                                const dayData = form.schedule[index] || DEFAULT_SCHEDULE[index];
                                return (
                                    <div key={index} style={{
                                        display: 'flex', alignItems: 'center', gap: 16,
                                        padding: '12px 16px', borderRadius: 12,
                                        background: dayData.active ? 'var(--color-background)' : '#f3f4f6',
                                        border: '1px solid var(--color-border-light)'
                                    }}>
                                        <div style={{ width: 100, fontWeight: 600, color: dayData.active ? 'inherit' : 'var(--color-text-muted)' }}>
                                            {dayName}
                                        </div>

                                        <label className="toggle">
                                            <input type="checkbox" checked={dayData.active} onChange={(e) => handleScheduleChange(index, 'active', e.target.checked)} />
                                            <span className="toggle-slider" />
                                        </label>

                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, opacity: dayData.active ? 1 : 0.5, pointerEvents: dayData.active ? 'auto' : 'none' }}>
                                            <input
                                                type="time"
                                                className="form-input"
                                                value={dayData.open}
                                                onChange={(e) => handleScheduleChange(index, 'open', e.target.value)}
                                                style={{ width: 120 }}
                                            />
                                            <span style={{ color: 'var(--color-text-muted)' }}>a</span>
                                            <input
                                                type="time"
                                                className="form-input"
                                                value={dayData.close}
                                                onChange={(e) => handleScheduleChange(index, 'close', e.target.value)}
                                                style={{ width: 120 }}
                                            />
                                        </div>
                                        {!dayData.active && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-error)', fontWeight: 600 }}>Cerrado</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Delivery Options */}
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShoppingBag size={20} color="#d97706" />
                            </div>
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Preparación y Entrega</h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tiempo Base de Preparación (Minutos)</label>
                            <input className="form-input" type="number" min="5" value={form.prepTimeMinutes} onChange={(e) => update('prepTimeMinutes', Number(e.target.value))} />
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Ayuda a estimar mejor cuándo llegará el repartidor.</p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rango estimado mostrado al cliente (ej: 20-30 min)</label>
                            <input className="form-input" value={form.deliveryTime} onChange={(e) => update('deliveryTime', e.target.value)} placeholder="Ej: 20-30" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Costo de envío ($)</label>
                                <input className="form-input" type="number" min="0" value={form.deliveryFee}
                                    onChange={(e) => update('deliveryFee', Number(e.target.value))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Pedido mínimo ($)</label>
                                <input className="form-input" type="number" min="0" value={form.minOrder}
                                    onChange={(e) => update('minOrder', Number(e.target.value))} />
                            </div>
                        </div>
                    </div>

                    {/* === IDENTIDAD VISUAL Y FREEMIUM === */}
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)', gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Store size={20} color="var(--color-primary)" />
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Identidad del Local</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Nombre, descripción y diseño visual.</p>
                                </div>
                            </div>

                            {/* Freemium Badge */}
                            {!isPremium && customizationAttempts >= 1 ? (
                                <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '6px 12px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    🔒 Cambios Agotados (Cuenta Gratis)
                                </div>
                            ) : !isPremium ? (
                                <div style={{ background: '#dbeafe', color: '#1d4ed8', padding: '6px 12px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700 }}>
                                    Dispones de 1 modificación gratis
                                </div>
                            ) : (
                                <div style={{ background: '#fef3c7', color: '#b45309', padding: '6px 12px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Star size={16} fill="currentColor" /> LOCAL PREMIUM
                                </div>
                            )}
                        </div>

                        {/* Lock Overlay Content */}
                        <div style={{ opacity: (!isPremium && customizationAttempts >= 1) ? 0.6 : 1, pointerEvents: (!isPremium && customizationAttempts >= 1) ? 'none' : 'auto', transition: 'all 0.3s' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>

                                <div>
                                    <div className="form-group">
                                        <label className="form-label">Nombre Comercial</label>
                                        <input className="form-input" value={form.name} onChange={(e) => update('name', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Descripción o Eslogan</label>
                                        <textarea className="form-input form-textarea" rows={3} value={form.description}
                                            onChange={(e) => update('description', e.target.value)}
                                            placeholder="La mejor pizza a la leña..." />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Color Principal de tu Marca</label>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <input type="color" value={form.primaryColor} onChange={(e) => update('primaryColor', e.target.value)} style={{ width: 50, height: 40, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                                            <span style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{form.primaryColor}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="form-group">
                                        <label className="form-label">Enlace al Logo (Opcional)</label>
                                        <input className="form-input" value={form.logoUrl} onChange={(e) => update('logoUrl', e.target.value)} placeholder="https://..." />
                                        {form.logoUrl && <img src={form.logoUrl} alt="Logo preview" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', marginTop: 8 }} />}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Enlace al Banner (Fondo de tu tienda)</label>
                                        <input className="form-input" value={form.bannerUrl} onChange={(e) => update('bannerUrl', e.target.value)} placeholder="https://..." />
                                        {form.bannerUrl && <img src={form.bannerUrl} alt="Banner preview" style={{ width: '100%', height: 100, borderRadius: 8, objectFit: 'cover', marginTop: 8 }} />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Upgrade CTA */}
                        {!isPremium && customizationAttempts >= 1 && (
                            <div style={{ marginTop: 24, padding: 20, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, textAlign: 'center' }}>
                                <h4 style={{ color: '#92400e', fontWeight: 800, marginBottom: 8, fontSize: '1.1rem' }}>Desbloquea la Personalización Total</h4>
                                <p style={{ color: '#b45309', marginBottom: 16, fontSize: '0.9rem' }}>
                                    Ya has consumido tu cambio gratuito de diseño. Si deseas actualizar tu logo, nombre, frases o colores representativos de manera ilimitada, contacta al administrador de Tlapa Comida para adquirir la insignia <strong>Premium</strong>.
                                </p>
                                <button className="btn btn-primary" style={{ background: '#d97706', color: 'white' }} onClick={() => alert("Comunícate por WhatsApp con tu agente de Tlapa Comida solicitando el paquete PREMIUM.")}>Contactar Soporte</button>
                            </div>
                        )}
                    </div>
                    {/* === FIN IDENTIDAD VISUAL === */}

                    {/* === SEGURIDAD Y ACCESO === */}
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)', gridColumn: '1 / -1', marginTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Settings size={20} color="#374151" />
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Seguridad de la Cuenta</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Cambia tu contraseña para acceder a Tlapa Comida.</p>
                            </div>
                        </div>

                        <div className="form-group" style={{ maxWidth: 400 }}>
                            <label className="form-label">Nueva Contraseña</label>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <input
                                    className="form-input"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Min. 6 caracteres"
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={handleChangePassword}
                                    disabled={passwordStatus.startsWith('loading')}
                                >
                                    Actualizar
                                </button>
                            </div>

                            {passwordStatus && (
                                <p style={{
                                    marginTop: 8,
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: passwordStatus.startsWith('error') ? 'var(--color-error)' : 'var(--color-success)'
                                }}>
                                    {passwordStatus.split(':')[1]}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
