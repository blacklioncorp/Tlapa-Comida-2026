import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
        schedule: DEFAULT_SCHEDULE
    });

    useEffect(() => {
        const fetchMerchant = async () => {
            if (!merchantId) {
                setLoading(false);
                return;
            }
            try {
                const docRef = doc(db, 'restaurants', merchantId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setForm(prev => ({
                        ...prev,
                        ...data,
                        addressStreet: data.address?.street || data.addressStreet || '',
                        addressColony: data.address?.colony || data.addressColony || '',
                        schedule: data.schedule || DEFAULT_SCHEDULE,
                        prepTimeMinutes: data.prepTimeMinutes || 20,
                        isOpen: data.isOpen ?? true
                    }));
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
            const docRef = doc(db, 'restaurants', merchantId);
            await setDoc(docRef, {
                ...form,
                address: {
                    street: form.addressStreet,
                    colony: form.addressColony
                },
                updatedAt: serverTimestamp()
            }, { merge: true });

            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (error) {
            console.error("Error saving merchant settings:", error);
            alert("No se pudo guardar la configuración.");
        }
    };

    const handleEmergencyClose = async () => {
        if (!window.confirm("🚨 ¿ESTÁS SEGURO? Esto cerrará tu restaurante inmediatamente en la app de clientes, ignorando tus horarios normales.")) return;

        try {
            const docRef = doc(db, 'restaurants', merchantId);
            await setDoc(docRef, {
                isOpen: false,
                updatedAt: serverTimestamp()
            }, { merge: true });

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

                    {/* General Info */}
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Store size={20} color="var(--color-primary)" />
                            </div>
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Información Básica</h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nombre Comercial</label>
                            <input className="form-input" value={form.name} onChange={(e) => update('name', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Descripción o Eslogan</label>
                            <textarea className="form-input form-textarea" rows={2} value={form.description}
                                onChange={(e) => update('description', e.target.value)}
                                placeholder="La mejor pizza a la leña..." />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Teléfono de contacto</label>
                            <input className="form-input" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                        </div>
                    </div>

                    {/* Address */}
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MapPin size={20} color="#2563eb" />
                            </div>
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Ubicación</h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Calle y número</label>
                            <input className="form-input" value={form.addressStreet} onChange={(e) => update('addressStreet', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Barrio / Colonia</label>
                            <input className="form-input" value={form.addressColony} onChange={(e) => update('addressColony', e.target.value)} />
                        </div>
                    </div>

                    {/* Images */}
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Camera size={20} color="#9333ea" />
                            </div>
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Imágenes del Perfil</h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Enlace al Logo</label>
                            <input className="form-input" value={form.logoUrl} onChange={(e) => update('logoUrl', e.target.value)} />
                            {form.logoUrl && <img src={form.logoUrl} alt="Logo preview" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', marginTop: 8 }} />}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Enlace al Banner</label>
                            <input className="form-input" value={form.bannerUrl} onChange={(e) => update('bannerUrl', e.target.value)} />
                            {form.bannerUrl && <img src={form.bannerUrl} alt="Banner preview" style={{ width: '100%', height: 80, borderRadius: 8, objectFit: 'cover', marginTop: 8 }} />}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
