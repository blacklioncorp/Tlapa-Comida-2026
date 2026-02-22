/**
 * WeatherBanner — Shows current weather conditions and delivery impact
 * 
 * Displays a banner at the top of the page when weather affects deliveries:
 * - Rain, storms, fog → Yellow/red warning with adjusted ETA info
 * - Clear weather → No banner (or optional compact display)
 */

import { useSmartDelivery } from '../contexts/SmartDeliveryContext';
import { CloudRain, CloudSun, Sun, Zap, CloudFog, Snowflake } from 'lucide-react';

const WEATHER_ICONS = {
    clear: Sun,
    cloudy: CloudSun,
    fog: CloudFog,
    drizzle: CloudRain,
    rain: CloudRain,
    heavy_rain: CloudRain,
    storm: Zap,
};

const WEATHER_GRADIENTS = {
    clear: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    cloudy: 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
    fog: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
    drizzle: 'linear-gradient(135deg, #dbeafe, #93c5fd)',
    rain: 'linear-gradient(135deg, #bfdbfe, #60a5fa)',
    heavy_rain: 'linear-gradient(135deg, #93c5fd, #3b82f6)',
    storm: 'linear-gradient(135deg, #fecaca, #f87171)',
};

const TEXT_COLORS = {
    clear: '#92400e',
    cloudy: '#374151',
    fog: '#3730a3',
    drizzle: '#1e40af',
    rain: '#1e3a8a',
    heavy_rain: '#1e3a5f',
    storm: '#7f1d1d',
};

export default function WeatherBanner({ compact = false, showAlways = false }) {
    const { weather, weatherLoading, isRaining } = useSmartDelivery();

    if (weatherLoading || !weather) return null;

    const condition = weather.condition;

    // Don't show banner for clear/cloudy weather unless showAlways is true
    if (!showAlways && !isRaining && condition.id !== 'fog') return null;

    const IconComponent = WEATHER_ICONS[condition.id] || Sun;
    const gradient = WEATHER_GRADIENTS[condition.id] || WEATHER_GRADIENTS.clear;
    const textColor = TEXT_COLORS[condition.id] || '#374151';

    if (compact) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 20,
                background: gradient,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: textColor,
            }}>
                <span style={{ fontSize: '1rem' }}>{condition.icon}</span>
                {weather.temperature}°C
                {isRaining && (
                    <span style={{
                        marginLeft: 4,
                        padding: '2px 6px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.5)',
                        fontSize: '0.65rem',
                    }}>
                        +{Math.round((condition.delayMultiplier - 1) * 100)}% tiempo
                    </span>
                )}
            </div>
        );
    }

    return (
        <div style={{
            background: gradient,
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            animation: isRaining ? 'weatherPulse 3s ease-in-out infinite' : 'none',
        }}>
            <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}>
                <span style={{ fontSize: '1.5rem' }}>{condition.icon}</span>
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: textColor }}>
                        {condition.label} · {weather.temperature}°C
                    </span>
                    {condition.deliverySurcharge > 0 && (
                        <span style={{
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.5)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: textColor,
                        }}>
                            +${condition.deliverySurcharge} envío
                        </span>
                    )}
                </div>
                {condition.message && (
                    <p style={{
                        fontSize: '0.78rem',
                        color: textColor,
                        opacity: 0.85,
                        margin: 0,
                        lineHeight: 1.3,
                    }}>
                        {condition.message}
                    </p>
                )}
            </div>
            <style>{`
                @keyframes weatherPulse {
                    0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
                    50% { box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2); }
                }
            `}</style>
        </div>
    );
}
