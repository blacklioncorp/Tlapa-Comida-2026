import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePromotions } from '../../contexts/PromotionContext';
import { MERCHANTS } from '../../data/seedData';
import {
    BarChart3, Store, Users, ShoppingBag, Settings, LogOut, DollarSign, LayoutGrid,
    Tag, Plus, Search, Edit3, Trash2, Copy, ToggleLeft, ToggleRight,
    Calendar, UserCheck, Clock, ShieldCheck, Percent, CreditCard, X, Save,
    Gift, TrendingUp, AlertCircle, ChevronDown, ChevronUp, Eye, EyeOff, Filter
, Truck } from 'lucide-react';

const DISCOUNT_TYPE_LABELS = {
    percentage: { label: 'Porcentaje', icon: '🏷️', suffix: '%' },
    fixed: { label: 'Monto fijo', icon: '💵', suffix: '$' },
    delivery: { label: 'Descuento envío', icon: '🛵', suffix: '%' },
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const EMPTY_PROMO = {
    code: '',
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscount: 50,
    minOrder: 0,
    isActive: true,
    conditions: {
        newUsersOnly: false,
        singleUse: false,
        maxTotalUses: null,
        specificMerchants: [],
        validFrom: '',
        validUntil: '',
        daysOfWeek: [],
        minItems: 0,
        paymentMethods: [],
    },
};

function PromoFormModal({ promo, onSave, onClose }) {
    const [form, setForm] = useState(promo ? {
        ...promo,
        conditions: { ...EMPTY_PROMO.conditions, ...promo.conditions },
    } : { ...EMPTY_PROMO });
    const [errors, setErrors] = useState({});

    const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
    const updateCond = (key, val) => setForm(prev => ({
        ...prev,
        conditions: { ...prev.conditions, [key]: val },
    }));

    const toggleDay = (day) => {
        const days = form.conditions.daysOfWeek || [];
        updateCond('daysOfWeek', days.includes(day) ? days.filter(d => d !== day) : [...days, day]);
    };

    const toggleMerchant = (mid) => {
        const ms = form.conditions.specificMerchants || [];
        updateCond('specificMerchants', ms.includes(mid) ? ms.filter(m => m !== mid) : [...ms, mid]);
    };

    const togglePayment = (method) => {
        const ms = form.conditions.paymentMethods || [];
        updateCond('paymentMethods', ms.includes(method) ? ms.filter(m => m !== method) : [...ms, method]);
    };

    const validate = () => {
        const e = {};
        if (!form.code.trim()) e.code = 'Requerido';
        if (!form.name.trim()) e.name = 'Requerido';
        if (form.discountValue <= 0) e.discountValue = 'Debe ser mayor a 0';
        if (form.discountType === 'percentage' && form.discountValue > 100) e.discountValue = 'Máximo 100%';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        const sanitized = {
            ...form,
            code: form.code.toUpperCase().replace(/\s+/g, ''),
            conditions: {
                ...form.conditions,
                maxTotalUses: form.conditions.maxTotalUses ? Number(form.conditions.maxTotalUses) : null,
                minItems: Number(form.conditions.minItems) || 0,
                validFrom: form.conditions.validFrom || null,
                validUntil: form.conditions.validUntil || null,
            },
        };
        onSave(sanitized);
    };

    const [showMerchants, setShowMerchants] = useState(false);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'white', borderRadius: 20, width: '90%', maxWidth: 680,
                maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 28px 20px', borderBottom: '1px solid var(--color-border-light)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    position: 'sticky', top: 0, background: 'white', zIndex: 10, borderRadius: '20px 20px 0 0',
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                            {promo ? '✏️ Editar Promoción' : '🎁 Nueva Promoción'}
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                            {promo ? 'Modifica los detalles de la promoción' : 'Configura el cupón y sus condiciones'}
                        </p>
                    </div>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}
                        style={{ width: 36, height: 36 }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ padding: '24px 28px' }}>
                    {/* === BASIC INFO === */}
                    <div style={{
                        background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                        borderRadius: 16, padding: 20, marginBottom: 24,
                        border: '1px solid var(--color-border-light)',
                    }}>
                        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tag size={16} color="var(--color-primary)" /> Información básica
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Código del cupón *</label>
                                <input className="form-input" placeholder="EJ: BIENVENIDA30"
                                    value={form.code} onChange={e => update('code', e.target.value.toUpperCase())}
                                    style={{ fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }} />
                                {errors.code && <span style={{ fontSize: '0.7rem', color: 'var(--color-error)' }}>{errors.code}</span>}
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Nombre interno *</label>
                                <input className="form-input" placeholder="Ej: Promo bienvenida"
                                    value={form.name} onChange={e => update('name', e.target.value)} />
                                {errors.name && <span style={{ fontSize: '0.7rem', color: 'var(--color-error)' }}>{errors.name}</span>}
                            </div>
                        </div>

                        <div className="form-group" style={{ margin: '14px 0 0' }}>
                            <label className="form-label" style={{ fontSize: '0.78rem' }}>Descripción visible al cliente</label>
                            <input className="form-input" placeholder="Ej: 20% de descuento en tu primer pedido"
                                value={form.description} onChange={e => update('description', e.target.value)} />
                        </div>
                    </div>

                    {/* === DISCOUNT CONFIG === */}
                    <div style={{
                        background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
                        borderRadius: 16, padding: 20, marginBottom: 24,
                        border: '1px solid #fde68a',
                    }}>
                        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Percent size={16} color="#d97706" /> Configuración del descuento
                        </h3>

                        {/* Type selector */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            {Object.entries(DISCOUNT_TYPE_LABELS).map(([key, dt]) => (
                                <button key={key} onClick={() => update('discountType', key)}
                                    style={{
                                        flex: 1, padding: '12px 8px', borderRadius: 12, border: 'none',
                                        background: form.discountType === key ? 'var(--color-primary)' : 'white',
                                        color: form.discountType === key ? 'white' : 'var(--color-text)',
                                        fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                                        boxShadow: form.discountType === key ? '0 4px 12px rgba(238,101,43,0.3)' : 'var(--shadow-sm)',
                                        transition: 'all 0.2s',
                                    }}>
                                    <span style={{ display: 'block', fontSize: '1.2rem', marginBottom: 4 }}>{dt.icon}</span>
                                    {dt.label}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>
                                    Valor ({DISCOUNT_TYPE_LABELS[form.discountType].suffix})
                                </label>
                                <input className="form-input" type="number" min="1"
                                    value={form.discountValue} onChange={e => update('discountValue', Number(e.target.value))} />
                                {errors.discountValue && <span style={{ fontSize: '0.7rem', color: 'var(--color-error)' }}>{errors.discountValue}</span>}
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Descuento máx ($)</label>
                                <input className="form-input" type="number" min="0"
                                    value={form.maxDiscount} onChange={e => update('maxDiscount', Number(e.target.value))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Pedido mínimo ($)</label>
                                <input className="form-input" type="number" min="0"
                                    value={form.minOrder} onChange={e => update('minOrder', Number(e.target.value))} />
                            </div>
                        </div>
                    </div>

                    {/* === CONDITIONS === */}
                    <div style={{
                        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                        borderRadius: 16, padding: 20, marginBottom: 24,
                        border: '1px solid #93c5fd',
                    }}>
                        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShieldCheck size={16} color="#2563eb" /> Condiciones de uso
                        </h3>

                        {/* Toggle conditions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                            {/* New users only */}
                            <label style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', background: form.conditions.newUsersOnly ? '#dcfce7' : 'white',
                                borderRadius: 12, cursor: 'pointer',
                                border: `2px solid ${form.conditions.newUsersOnly ? '#22c55e' : 'transparent'}`,
                                transition: 'all 0.2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <UserCheck size={18} color={form.conditions.newUsersOnly ? '#16a34a' : '#94a3b8'} />
                                    <div>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Solo usuarios nuevos</span>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                            Solo para clientes que nunca han hecho un pedido
                                        </p>
                                    </div>
                                </div>
                                <label className="toggle">
                                    <input type="checkbox" checked={form.conditions.newUsersOnly}
                                        onChange={e => updateCond('newUsersOnly', e.target.checked)} />
                                    <span className="toggle-slider" />
                                </label>
                            </label>

                            {/* Single use */}
                            <label style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', background: form.conditions.singleUse ? '#fef3c7' : 'white',
                                borderRadius: 12, cursor: 'pointer',
                                border: `2px solid ${form.conditions.singleUse ? '#f59e0b' : 'transparent'}`,
                                transition: 'all 0.2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Clock size={18} color={form.conditions.singleUse ? '#d97706' : '#94a3b8'} />
                                    <div>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Uso único por usuario</span>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                            Cada usuario solo puede usarlo una vez
                                        </p>
                                    </div>
                                </div>
                                <label className="toggle">
                                    <input type="checkbox" checked={form.conditions.singleUse}
                                        onChange={e => updateCond('singleUse', e.target.checked)} />
                                    <span className="toggle-slider" />
                                </label>
                            </label>
                        </div>

                        {/* Numeric conditions */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Límite global de usos (dejar vacío = sin límite)</label>
                                <input className="form-input" type="number" min="0" placeholder="Sin límite"
                                    value={form.conditions.maxTotalUses || ''} onChange={e => updateCond('maxTotalUses', e.target.value ? Number(e.target.value) : null)} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Mínimo de artículos en carrito</label>
                                <input className="form-input" type="number" min="0"
                                    value={form.conditions.minItems} onChange={e => updateCond('minItems', Number(e.target.value))} />
                            </div>
                        </div>

                        {/* Date range */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Calendar size={12} /> Válido desde
                                </label>
                                <input className="form-input" type="datetime-local"
                                    value={form.conditions.validFrom || ''} onChange={e => updateCond('validFrom', e.target.value)} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Calendar size={12} /> Válido hasta
                                </label>
                                <input className="form-input" type="datetime-local"
                                    value={form.conditions.validUntil || ''} onChange={e => updateCond('validUntil', e.target.value)} />
                            </div>
                        </div>

                        {/* Days of week */}
                        <div style={{ marginBottom: 16 }}>
                            <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: 8 }}>
                                Días de la semana (vacío = todos)
                            </label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {DAY_NAMES.map((name, i) => (
                                    <button key={i} onClick={() => toggleDay(i)}
                                        style={{
                                            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                                            background: (form.conditions.daysOfWeek || []).includes(i) ? 'var(--color-primary)' : 'white',
                                            color: (form.conditions.daysOfWeek || []).includes(i) ? 'white' : 'var(--color-text-secondary)',
                                            fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
                                            boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s',
                                        }}>
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Payment methods */}
                        <div style={{ marginBottom: 16 }}>
                            <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: 8 }}>
                                Métodos de pago (vacío = todos)
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[
                                    { id: 'cash', label: 'Efectivo', icon: '💵' },
                                    { id: 'mercadopago', label: 'Mercado Pago', icon: '💳' },
                                ].map(pm => (
                                    <button key={pm.id} onClick={() => togglePayment(pm.id)}
                                        style={{
                                            flex: 1, padding: '10px 12px', borderRadius: 10,
                                            background: (form.conditions.paymentMethods || []).includes(pm.id) ? '#dbeafe' : 'white',
                                            fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                                            boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            color: (form.conditions.paymentMethods || []).includes(pm.id) ? '#1e40af' : 'var(--color-text-secondary)',
                                            border: `2px solid ${(form.conditions.paymentMethods || []).includes(pm.id) ? '#3b82f6' : 'transparent'}`,
                                        }}>
                                        <span>{pm.icon}</span> {pm.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Specific merchants */}
                        <div>
                            <button onClick={() => setShowMerchants(!showMerchants)}
                                style={{
                                    width: '100%', padding: '10px 14px', borderRadius: 10,
                                    background: 'white', border: '1px solid var(--color-border-light)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-text)',
                                }}>
                                <span>
                                    🏪 Comercios específicos
                                    {(form.conditions.specificMerchants || []).length > 0 &&
                                        <span style={{ color: 'var(--color-primary)', marginLeft: 6 }}>
                                            ({form.conditions.specificMerchants.length} seleccionados)
                                        </span>
                                    }
                                </span>
                                {showMerchants ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {showMerchants && (
                                <div style={{
                                    marginTop: 8, background: 'white', borderRadius: 10,
                                    padding: 8, maxHeight: 160, overflow: 'auto',
                                    border: '1px solid var(--color-border-light)',
                                }}>
                                    <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', padding: '4px 8px', marginBottom: 4 }}>
                                        Dejar sin seleccionar = todos los comercios
                                    </p>
                                    {MERCHANTS.map(m => (
                                        <label key={m.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                                            background: (form.conditions.specificMerchants || []).includes(m.id) ? 'var(--color-primary-bg)' : 'transparent',
                                        }}>
                                            <input type="checkbox"
                                                checked={(form.conditions.specificMerchants || []).includes(m.id)}
                                                onChange={() => toggleMerchant(m.id)}
                                                style={{ accentColor: 'var(--color-primary)' }} />
                                            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{m.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active toggle */}
                    <label style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', background: form.isActive ? '#dcfce7' : '#fef2f2',
                        borderRadius: 14, cursor: 'pointer', marginBottom: 20,
                        border: `2px solid ${form.isActive ? '#22c55e' : '#fca5a5'}`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {form.isActive ? <Eye size={20} color="#16a34a" /> : <EyeOff size={20} color="#ef4444" />}
                            <div>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                    {form.isActive ? 'Promoción activa' : 'Promoción inactiva'}
                                </span>
                                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                    {form.isActive ? 'Los clientes pueden ver y usar este cupón' : 'Los clientes no verán este cupón'}
                                </p>
                            </div>
                        </div>
                        <label className="toggle">
                            <input type="checkbox" checked={form.isActive} onChange={e => update('isActive', e.target.checked)} />
                            <span className="toggle-slider" />
                        </label>
                    </label>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 28px 24px', borderTop: '1px solid var(--color-border-light)',
                    display: 'flex', justifyContent: 'flex-end', gap: 10,
                    position: 'sticky', bottom: 0, background: 'white', borderRadius: '0 0 20px 20px',
                }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Save size={16} /> {promo ? 'Guardar Cambios' : 'Crear Promoción'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ConditionChips({ promo }) {
    const cond = promo.conditions || {};
    const chips = [];

    if (cond.newUsersOnly) chips.push({ label: 'Nuevos usuarios', color: '#16a34a', bg: '#dcfce7', icon: '👤' });
    if (cond.singleUse) chips.push({ label: 'Uso único', color: '#d97706', bg: '#fef3c7', icon: '1️⃣' });
    if (cond.maxTotalUses) chips.push({ label: `Máx ${cond.maxTotalUses} usos`, color: '#7c3aed', bg: '#f5f3ff', icon: '🔢' });
    if (cond.validUntil) {
        const d = new Date(cond.validUntil);
        chips.push({ label: `Hasta ${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`, color: '#0369a1', bg: '#e0f2fe', icon: '📅' });
    }
    if (cond.daysOfWeek?.length > 0) {
        chips.push({ label: cond.daysOfWeek.map(d => DAY_NAMES[d]).join(', '), color: '#4338ca', bg: '#eef2ff', icon: '📆' });
    }
    if (cond.specificMerchants?.length > 0) {
        chips.push({ label: `${cond.specificMerchants.length} comercio(s)`, color: '#be185d', bg: '#fdf2f8', icon: '🏪' });
    }
    if (cond.paymentMethods?.length > 0) {
        chips.push({ label: cond.paymentMethods.map(m => m === 'cash' ? 'Efectivo' : 'M. Pago').join(', '), color: '#1e40af', bg: '#dbeafe', icon: '💳' });
    }
    if (promo.minOrder > 0) chips.push({ label: `Mín $${promo.minOrder}`, color: '#92400e', bg: '#fef3c7', icon: '🛒' });

    if (chips.length === 0) return <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Sin condiciones especiales</span>;

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {chips.map((c, i) => (
                <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                    fontSize: '0.68rem', color: c.color, background: c.bg,
                }}>
                    {c.icon} {c.label}
                </span>
            ))}
        </div>
    );
}

export default function AdminPromotions() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const {
        promotions, addPromotion, updatePromotion, deletePromotion,
        togglePromotion, duplicatePromotion, getStats,
    } = usePromotions();

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all | active | inactive
    const [editingPromo, setEditingPromo] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const stats = getStats();

    const filtered = useMemo(() => {
        return promotions.filter(p => {
            if (filterStatus === 'active' && !p.isActive) return false;
            if (filterStatus === 'inactive' && p.isActive) return false;
            if (search) {
                const s = search.toLowerCase();
                return p.code.toLowerCase().includes(s) ||
                    p.name.toLowerCase().includes(s) ||
                    p.description.toLowerCase().includes(s);
            }
            return true;
        });
    }, [promotions, search, filterStatus]);

    const handleSave = (data) => {
        if (editingPromo) {
            updatePromotion(editingPromo.id, data);
        } else {
            addPromotion(data);
        }
        setShowForm(false);
        setEditingPromo(null);
    };

    const handleEdit = (promo) => {
        setEditingPromo(promo);
        setShowForm(true);
    };

    const handleDelete = (id) => {
        deletePromotion(id);
        setDeleteConfirm(null);
    };

    return (
        <div className="admin-layout">
            {/* Sidebar */}
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
                    <button className="sidebar-link" onClick={() => navigate('/admin/delivery')}>
                        <Truck size={18} /> Repartidores
                        <Users size={18} /> Usuarios
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/orders')}>
                        <ShoppingBag size={18} /> Pedidos
                    </button>
                    <button className="sidebar-link active">
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

            {/* Main */}
            <main className="admin-main">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>🎁 Promociones y Cupones</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            Administra descuentos, condiciones y vigencia
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setEditingPromo(null); setShowForm(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', fontWeight: 700 }}>
                        <Plus size={18} /> Nueva Promoción
                    </button>
                </div>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                    {[
                        { label: 'Total', value: stats.total, icon: Tag, color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
                        { label: 'Activas', value: stats.active, icon: Eye, color: '#16a34a', bg: '#dcfce7' },
                        { label: 'Usos totales', value: stats.totalUses, icon: TrendingUp, color: '#2563eb', bg: '#dbeafe' },
                        { label: 'Expiradas', value: stats.expired, icon: Clock, color: '#dc2626', bg: '#fef2f2' },
                    ].map((kpi, i) => (
                        <div key={i} style={{
                            background: 'var(--color-surface)', borderRadius: 16, padding: 20,
                            boxShadow: 'var(--shadow-sm)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{kpi.label}</p>
                                    <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 4 }}>{kpi.value}</p>
                                </div>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <kpi.icon size={22} color={kpi.color} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
                    background: 'var(--color-surface)', padding: '12px 16px', borderRadius: 14,
                    boxShadow: 'var(--shadow-sm)',
                }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input className="form-input" placeholder="Buscar por código o nombre..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: 38 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {[
                            { key: 'all', label: 'Todas' },
                            { key: 'active', label: '✅ Activas' },
                            { key: 'inactive', label: '⏸️ Inactivas' },
                        ].map(f => (
                            <button key={f.key} onClick={() => setFilterStatus(f.key)}
                                style={{
                                    padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                    background: filterStatus === f.key ? 'var(--color-primary)' : 'var(--color-background)',
                                    color: filterStatus === f.key ? 'white' : 'var(--color-text-secondary)',
                                    fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s',
                                }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Promos List */}
                {filtered.length === 0 ? (
                    <div style={{
                        padding: 60, textAlign: 'center', background: 'var(--color-surface)',
                        borderRadius: 16, boxShadow: 'var(--shadow-sm)',
                    }}>
                        <span style={{ fontSize: 48 }}>🏷️</span>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: 16, marginBottom: 6 }}>No hay promociones</p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                            Crea tu primera promoción para atraer más clientes
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {filtered.map(promo => (
                            <div key={promo.id} style={{
                                background: 'var(--color-surface)', borderRadius: 16, overflow: 'hidden',
                                boxShadow: 'var(--shadow-sm)',
                                border: `2px solid ${promo.isActive ? 'transparent' : '#fecaca'}`,
                                opacity: promo.isActive ? 1 : 0.75,
                                transition: 'all 0.2s',
                            }}>
                                {/* Promo card header strip */}
                                <div style={{
                                    height: 4,
                                    background: promo.isActive
                                        ? promo.discountType === 'percentage' ? 'linear-gradient(90deg, #ee652b, #ff8a57)'
                                            : promo.discountType === 'delivery' ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                                                : 'linear-gradient(90deg, #22c55e, #4ade80)'
                                        : '#d1d5db',
                                }} />

                                <div style={{ padding: '18px 22px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        {/* Left */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                <span style={{
                                                    fontWeight: 800, fontSize: '1.05rem',
                                                    background: promo.isActive ? 'var(--color-primary-bg)' : '#f3f4f6',
                                                    color: promo.isActive ? 'var(--color-primary)' : '#6b7280',
                                                    padding: '4px 12px', borderRadius: 8, fontFamily: 'monospace', letterSpacing: 1,
                                                }}>
                                                    {promo.code}
                                                </span>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: '0.72rem',
                                                    background: promo.isActive ? '#dcfce7' : '#fef2f2',
                                                    color: promo.isActive ? '#16a34a' : '#dc2626',
                                                }}>
                                                    {promo.isActive ? 'Activa' : 'Inactiva'}
                                                </span>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: '0.72rem',
                                                    background: '#f0f9ff', color: '#0369a1',
                                                }}>
                                                    {DISCOUNT_TYPE_LABELS[promo.discountType]?.icon} {promo.discountValue}{DISCOUNT_TYPE_LABELS[promo.discountType]?.suffix}
                                                    {promo.maxDiscount ? ` (máx $${promo.maxDiscount})` : ''}
                                                </span>
                                            </div>
                                            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{promo.name}</p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                                                {promo.description}
                                            </p>

                                            {/* Conditions */}
                                            <ConditionChips promo={promo} />

                                            {/* Usage stats */}
                                            <div style={{
                                                display: 'flex', gap: 16, marginTop: 12,
                                                fontSize: '0.75rem', color: 'var(--color-text-muted)',
                                            }}>
                                                <span>📊 {promo.usageCount || 0} usos</span>
                                                <span>👥 {(promo.usedBy || []).length} usuarios</span>
                                                <span>📅 {new Date(promo.createdAt).toLocaleDateString('es-MX')}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <button className="btn btn-icon btn-ghost" title="Activar/Desactivar"
                                                onClick={() => togglePromotion(promo.id)}
                                                style={{ color: promo.isActive ? '#16a34a' : '#dc2626' }}>
                                                {promo.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                                            </button>
                                            <button className="btn btn-icon btn-ghost" title="Editar"
                                                onClick={() => handleEdit(promo)}
                                                style={{ color: 'var(--color-primary)' }}>
                                                <Edit3 size={18} />
                                            </button>
                                            <button className="btn btn-icon btn-ghost" title="Duplicar"
                                                onClick={() => duplicatePromotion(promo.id)}
                                                style={{ color: '#7c3aed' }}>
                                                <Copy size={18} />
                                            </button>
                                            <button className="btn btn-icon btn-ghost" title="Eliminar"
                                                onClick={() => setDeleteConfirm(promo.id)}
                                                style={{ color: '#dc2626' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Form Modal */}
            {showForm && (
                <PromoFormModal
                    promo={editingPromo}
                    onSave={handleSave}
                    onClose={() => { setShowForm(false); setEditingPromo(null); }}
                />
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)',
                }} onClick={() => setDeleteConfirm(null)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'white', borderRadius: 20, padding: 32, width: 400,
                        boxShadow: '0 25px 50px rgba(0,0,0,0.2)', textAlign: 'center',
                    }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%', background: '#fef2f2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px',
                        }}>
                            <AlertCircle size={32} color="#dc2626" />
                        </div>
                        <h3 style={{ fontWeight: 800, marginBottom: 8 }}>¿Eliminar promoción?</h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
                            Esta acción no se puede deshacer. La promoción se eliminará permanentemente.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} style={{ flex: 1 }}>
                                Cancelar
                            </button>
                            <button className="btn" onClick={() => handleDelete(deleteConfirm)}
                                style={{ flex: 1, background: '#dc2626', color: 'white', border: 'none', fontWeight: 700 }}>
                                <Trash2 size={16} /> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
