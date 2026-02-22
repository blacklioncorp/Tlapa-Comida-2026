/**
 * MerchantLoadBadge — Shows restaurant saturation/load status
 * 
 * Displays a warning badge when a restaurant has too many active orders
 * Helps customers make informed decisions about wait times
 */

import { useSmartDelivery } from '../contexts/SmartDeliveryContext';
import { Clock, AlertTriangle, Flame } from 'lucide-react';

const LOAD_STYLES = {
    low: {
        bg: 'var(--color-success-bg)',
        color: 'var(--color-success)',
        border: 'transparent',
    },
    medium: {
        bg: '#fef3c7',
        color: '#92400e',
        border: '#fbbf24',
    },
    high: {
        bg: '#fee2e2',
        color: '#991b1b',
        border: '#f87171',
    },
    critical: {
        bg: '#fecaca',
        color: '#7f1d1d',
        border: '#ef4444',
    },
};

export default function MerchantLoadBadge({ merchantId, style = {}, showDetails = false }) {
    const { getMerchantLoad } = useSmartDelivery();
    const load = getMerchantLoad(merchantId);

    // Don't show anything for low load
    if (load.loadLevel === 'low') return null;

    const styles = LOAD_STYLES[load.loadLevel];

    return (
        <div style={{
            background: styles.bg,
            borderRadius: 10,
            padding: showDetails ? '12px 14px' : '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: `1px solid ${styles.border}`,
            ...style,
        }}>
            <span style={{ fontSize: showDetails ? '1rem' : '0.85rem' }}>
                {load.icon}
            </span>
            <div style={{ flex: 1 }}>
                <span style={{
                    fontSize: showDetails ? '0.8rem' : '0.7rem',
                    fontWeight: 700,
                    color: styles.color,
                }}>
                    {load.loadLevel === 'medium' && 'Demanda moderada'}
                    {load.loadLevel === 'high' && '¡Alta demanda!'}
                    {load.loadLevel === 'critical' && '🚨 Muy saturado'}
                </span>
                {showDetails && (
                    <p style={{
                        fontSize: '0.72rem',
                        color: styles.color,
                        opacity: 0.8,
                        margin: '2px 0 0',
                    }}>
                        {load.activeOrderCount} pedidos activos ·
                        {load.preparingCount > 0 && ` ${load.preparingCount} en preparación`}
                        {load.waitingCount > 0 && ` · ${load.waitingCount} en espera`}
                    </p>
                )}
            </div>
            {showDetails && (
                <span style={{
                    padding: '3px 8px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.6)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: styles.color,
                }}>
                    +{Math.round((load.prepTimeMultiplier - 1) * 100)}% tiempo
                </span>
            )}
        </div>
    );
}

/**
 * Inline text badge for use in cards/lists
 */
export function MerchantLoadInline({ merchantId }) {
    const { getMerchantLoad } = useSmartDelivery();
    const load = getMerchantLoad(merchantId);

    if (load.loadLevel === 'low') return null;

    const styles = LOAD_STYLES[load.loadLevel];

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 6,
            background: styles.bg,
            fontSize: '0.68rem',
            fontWeight: 700,
            color: styles.color,
        }}>
            {load.icon} {load.activeOrderCount} pedidos
        </span>
    );
}
