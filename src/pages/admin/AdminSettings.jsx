import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart3, Store, Users, ShoppingBag, Settings, LogOut, Save, Bell, Globe, DollarSign, Shield, Palette, Plus, X, Tag, LayoutGrid, Gift } from 'lucide-react';

export default function AdminSettings() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [saved, setSaved] = useState(false);

    // Push notifications
    const [pushTitle, setPushTitle] = useState('');
    const [pushMessage, setPushMessage] = useState('');
    const [pushTarget, setPushTarget] = useState('all');
    const [pushSent, setPushSent] = useState(false);
    const [pushHistory, setPushHistory] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('tlapa_push_history') || '[]');
        } catch { return []; }
    });

    const [settings, setSettings] = useState({
        platformName: 'Tlapa Comida',
        supportEmail: 'soporte@tlapacomida.com',
        supportPhone: '+52 757 123 4567',
        defaultCommission: 15,
        deliveryBaseFee: 20,
        deliveryPerKm: 5,
        maxDeliveryRadius: 8,
        minOrderAmount: 50,
        serviceFeePct: 5,
        enableNotifications: true,
        enableSounds: true,
        autoAssignDrivers: true,
        requireDriverDocs: true,
        maintenanceMode: false,
    });

    const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

    const handleSave = () => {
        localStorage.setItem('tlapa_admin_settings', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleSendPush = () => {
        if (!pushTitle.trim() || !pushMessage.trim()) return;
        const notification = {
            title: pushTitle,
            message: pushMessage,
            target: pushTarget,
            sentAt: new Date().toISOString(),
        };
        const updatedHistory = [notification, ...pushHistory];
        setPushHistory(updatedHistory);
        localStorage.setItem('tlapa_push_history', JSON.stringify(updatedHistory));
        setPushTitle('');
        setPushMessage('');
        setPushSent(true);
        setTimeout(() => setPushSent(false), 3000);
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
                    <button className="sidebar-link" onClick={() => navigate('/admin/users')}>
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
                    <button className="sidebar-link active">
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Ajustes de la Plataforma</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Configura los parámetros generales de Tlapa Comida</p>
                    </div>
                    <button className="btn btn-primary" onClick={handleSave}>
                        <Save size={16} /> Guardar Cambios
                    </button>
                </div>

                {saved && (
                    <div className="toast success" style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 999 }}>
                        ✅ Cambios guardados correctamente
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
                    {/* General */}
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Globe size={20} color="var(--color-primary)" />
                            </div>
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>General</h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nombre de la plataforma</label>
                            <input className="form-input" value={settings.platformName} onChange={(e) => update('platformName', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email de soporte</label>
                            <input className="form-input" type="email" value={settings.supportEmail} onChange={(e) => update('supportEmail', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Teléfono de soporte</label>
                            <input className="form-input" type="tel" value={settings.supportPhone} onChange={(e) => update('supportPhone', e.target.value)} />
                        </div>
                    </div>

                    {/* Fees */}
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <DollarSign size={20} color="var(--color-success)" />
                            </div>
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Tarifas y Comisiones</h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Comisión por defecto (%)</label>
                            <input className="form-input" type="number" min="0" max="50" value={settings.defaultCommission}
                                onChange={(e) => update('defaultCommission', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tarifa base de envío ($)</label>
                            <input className="form-input" type="number" min="0" value={settings.deliveryBaseFee}
                                onChange={(e) => update('deliveryBaseFee', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tarifa por km adicional ($)</label>
                            <input className="form-input" type="number" min="0" value={settings.deliveryPerKm}
                                onChange={(e) => update('deliveryPerKm', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Pedido mínimo ($)</label>
                            <input className="form-input" type="number" min="0" value={settings.minOrderAmount}
                                onChange={(e) => update('minOrderAmount', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Comisión de servicio (%)</label>
                            <input className="form-input" type="number" min="0" max="20" value={settings.serviceFeePct}
                                onChange={(e) => update('serviceFeePct', Number(e.target.value))} />
                        </div>
                    </div>

                    {/* Delivery */}
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Shield size={20} color="var(--color-info)" />
                            </div>
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Operación</h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Radio máximo de cobertura (km)</label>
                            <input className="form-input" type="number" min="1" max="50" value={settings.maxDeliveryRadius}
                                onChange={(e) => update('maxDeliveryRadius', Number(e.target.value))} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Auto-asignar repartidores</span>
                                <label className="toggle">
                                    <input type="checkbox" checked={settings.autoAssignDrivers} onChange={(e) => update('autoAssignDrivers', e.target.checked)} />
                                    <span className="toggle-slider" />
                                </label>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Requerir documentos de repartidor</span>
                                <label className="toggle">
                                    <input type="checkbox" checked={settings.requireDriverDocs} onChange={(e) => update('requireDriverDocs', e.target.checked)} />
                                    <span className="toggle-slider" />
                                </label>
                            </label>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bell size={20} color="var(--color-warning)" />
                            </div>
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Notificaciones</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notificaciones push</span>
                                <label className="toggle">
                                    <input type="checkbox" checked={settings.enableNotifications} onChange={(e) => update('enableNotifications', e.target.checked)} />
                                    <span className="toggle-slider" />
                                </label>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Sonidos de notificación</span>
                                <label className="toggle">
                                    <input type="checkbox" checked={settings.enableSounds} onChange={(e) => update('enableSounds', e.target.checked)} />
                                    <span className="toggle-slider" />
                                </label>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                <div>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-error)' }}>Modo mantenimiento</span>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Desactiva la app para usuarios</p>
                                </div>
                                <label className="toggle">
                                    <input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => update('maintenanceMode', e.target.checked)} />
                                    <span className="toggle-slider" />
                                </label>
                            </label>
                        </div>

                        {/* Push Notification Composer */}
                        <div style={{
                            borderTop: '1px solid var(--color-border-light)',
                            paddingTop: 20,
                        }}>
                            <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                📨 Enviar Notificación Push
                            </h4>
                            <div className="form-group">
                                <label className="form-label">Título</label>
                                <input
                                    className="form-input"
                                    placeholder="Ej: ¡Promoción especial!"
                                    value={pushTitle}
                                    onChange={(e) => setPushTitle(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mensaje</label>
                                <textarea
                                    className="form-input form-textarea"
                                    rows={3}
                                    placeholder="Escribe el contenido de la notificación..."
                                    value={pushMessage}
                                    onChange={(e) => setPushMessage(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Destinatarios</label>
                                <select
                                    className="form-input"
                                    value={pushTarget}
                                    onChange={(e) => setPushTarget(e.target.value)}
                                >
                                    <option value="all">👥 Todos los usuarios</option>
                                    <option value="clients">🛒 Solo clientes</option>
                                    <option value="merchants">🏪 Solo comercios</option>
                                    <option value="drivers">🛵 Solo repartidores</option>
                                </select>
                            </div>
                            <button
                                className="btn btn-primary btn-block"
                                disabled={!pushTitle.trim() || !pushMessage.trim()}
                                onClick={handleSendPush}
                                style={{ marginTop: 8 }}
                            >
                                📤 Enviar Notificación
                            </button>

                            {pushSent && (
                                <div style={{
                                    marginTop: 12, padding: '10px 14px', borderRadius: 10,
                                    background: '#dcfce7', color: '#16a34a',
                                    fontWeight: 600, fontSize: '0.85rem', textAlign: 'center',
                                }}>
                                    ✅ Notificación enviada correctamente
                                </div>
                            )}

                            {/* Notification History */}
                            {pushHistory.length > 0 && (
                                <div style={{ marginTop: 20 }}>
                                    <h5 style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                                        HISTORIAL DE NOTIFICACIONES
                                    </h5>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                                        {pushHistory.slice(0, 10).map((n, i) => (
                                            <div key={i} style={{
                                                padding: '10px 12px', borderRadius: 10,
                                                background: 'var(--color-background)',
                                                border: '1px solid var(--color-border-light)',
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{n.title}</span>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                                                        {new Date(n.sentAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>{n.message}</p>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                                    → {n.target === 'all' ? 'Todos' : n.target === 'clients' ? 'Clientes' : n.target === 'merchants' ? 'Comercios' : 'Repartidores'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>


                </div>
            </main>
        </div>
    );
}
