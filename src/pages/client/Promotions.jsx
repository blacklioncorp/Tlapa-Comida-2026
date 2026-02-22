import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Tag, Copy, CheckCircle, Percent, Truck } from 'lucide-react';
import { usePromotions } from '../../contexts/PromotionContext';

export default function Promotions() {
    const navigate = useNavigate();
    const { promotions } = usePromotions();
    const [copiedId, setCopiedId] = useState(null);

    const activePromotions = promotions.filter(p => p.isActive);

    const handleCopy = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="app-container">
            <div className="page-header">
                <button className="btn btn-icon btn-ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Promociones</h1>
            </div>

            <div style={{ padding: '0 16px 20px' }}>
                <div style={{
                    background: 'linear-gradient(135deg, #ee652b, #ff8a57)',
                    borderRadius: 16,
                    padding: 24,
                    color: 'white',
                    marginBottom: 24,
                    boxShadow: '0 8px 24px rgba(238,101,43,0.3)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Descuentos exclusivos</h2>
                    <p style={{ opacity: 0.9 }}>Aprovecha estos cupones en tus próximos pedidos</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {activePromotions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                            <Tag size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
                            <p>No hay promociones activas en este momento.</p>
                        </div>
                    ) : (
                        activePromotions.map(promo => (
                            <div key={promo.id} className="card" style={{ overflow: 'hidden' }}>
                                <div style={{
                                    background: 'var(--color-primary-bg)',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    borderBottom: '1px solid rgba(0,0,0,0.05)'
                                }}>
                                    {promo.discountType === 'delivery' ? (
                                        <Truck size={18} color="var(--color-primary)" />
                                    ) : (
                                        <Percent size={18} color="var(--color-primary)" />
                                    )}
                                    <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9rem' }}>
                                        {promo.name}
                                    </span>
                                </div>
                                <div style={{ padding: 16 }}>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                                        {promo.description}
                                    </p>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'var(--color-background)',
                                        border: '1px dashed var(--color-border)',
                                        borderRadius: 8,
                                        padding: '8px 12px'
                                    }}>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', letterSpacing: 1 }}>
                                            {promo.code}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(promo.code, promo.id)}
                                            style={{
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                color: copiedId === promo.id ? 'var(--color-success)' : 'var(--color-primary)',
                                                fontWeight: 600,
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            {copiedId === promo.id ? (
                                                <>Copiado <CheckCircle size={16} /></>
                                            ) : (
                                                <>Copiar <Copy size={16} /></>
                                            )}
                                        </button>
                                    </div>

                                    {promo.conditions && (
                                        <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            {promo.conditions.minOrder && <span>• Mínimo ${promo.conditions.minOrder} </span>}
                                            {promo.conditions.newUsersOnly && <span>• Solo nuevos usuarios</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
