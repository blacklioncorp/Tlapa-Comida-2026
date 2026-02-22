/**
 * SmartETADisplay — Dynamic ETA with factor breakdown
 * 
 * Shows the estimated delivery time considering:
 * - Restaurant preparation time
 * - Driver distance
 * - Weather delays
 * - Current merchant load
 */

import { useSmartDelivery } from '../contexts/SmartDeliveryContext';
import { Clock, CloudRain, Flame, Truck, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const FACTOR_ICONS = {
    load: '🔥',
    weather: '🌧️',
    distance: '🛵',
};

export default function SmartETADisplay({ merchantId, deliveryAddress, style = {} }) {
    const { getDynamicETA } = useSmartDelivery();
    const [expanded, setExpanded] = useState(false);

    const eta = getDynamicETA(merchantId, deliveryAddress);

    if (!eta) return null;

    const hasFactors = eta.factors.length > 0;

    return (
        <div style={{
            background: 'var(--color-primary-bg)',
            borderRadius: 12,
            padding: '14px 16px',
            ...style,
        }}>
            {/* Main ETA */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: hasFactors ? 'pointer' : 'default',
                }}
                onClick={() => hasFactors && setExpanded(!expanded)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Clock size={18} color="white" />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                            Tiempo estimado de entrega
                        </p>
                        <p style={{
                            fontSize: '1.3rem',
                            fontWeight: 800,
                            color: 'var(--color-primary)',
                            margin: 0,
                        }}>
                            {eta.displayRange} min
                        </p>
                    </div>
                </div>
                {hasFactors && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 8px',
                        borderRadius: 8,
                        background: 'rgba(238, 101, 43, 0.1)',
                    }}>
                        {eta.factors.map((f, i) => (
                            <span key={i} style={{ fontSize: '0.85rem' }}>{f.icon}</span>
                        ))}
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                )}
            </div>

            {/* Expanded factors */}
            {expanded && hasFactors && (
                <div style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(238, 101, 43, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}>
                    <p style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        margin: 0,
                    }}>
                        Factores que afectan el tiempo
                    </p>
                    {eta.factors.map((factor, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.6)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.9rem' }}>{factor.icon}</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                    {factor.label}
                                </span>
                            </div>
                            <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: 'var(--color-primary)',
                                background: 'var(--color-primary-bg)',
                                padding: '2px 8px',
                                borderRadius: 6,
                            }}>
                                {factor.impact}
                            </span>
                        </div>
                    ))}

                    {/* Time breakdown */}
                    <div style={{
                        marginTop: 4,
                        display: 'flex',
                        gap: 8,
                    }}>
                        <div style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '6px 8px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.5)',
                        }}>
                            <p style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>{eta.prepTime}m</p>
                            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: 0 }}>Preparación</p>
                        </div>
                        <div style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '6px 8px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.5)',
                        }}>
                            <p style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>{eta.pickupTime}m</p>
                            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: 0 }}>Recogida</p>
                        </div>
                        <div style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '6px 8px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.5)',
                        }}>
                            <p style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>{eta.deliveryTime}m</p>
                            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: 0 }}>Entrega</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
