/**
 * PricingService — Dynamic Pricing Engine for Tlapa-Comida
 * 
 * Multipliers Aggregator:
 * FinalFee = BaseFee * WeatherM * TrafficM * ZoneM
 */

import { supabase } from '../supabase';
import { fetchCurrentWeather } from './WeatherService';
import { importLibrary } from './GoogleMapsLoader';
import { getAllSettings } from './SettingsService';

/**
 * Calculate Traffic Multiplier using Google Maps Routes API
 */

/**
 * Point in Polygon (Ray Casting Algorithm)
 * Used to check if a location is within a pricing zone
 */
function isPointInPolygon(point, polygon) {
    const { lat, lng } = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lng;
        const xj = polygon[j].lat, yj = polygon[j].lng;
        const intersect = ((yi > lng) !== (yj > lng)) &&
            (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Calculate Traffic Multiplier using Google Maps Routes API
 * Compare duration vs durationWithoutTraffic
 */
async function getTrafficMultiplier(origin, destination, settings) {
    try {
        const { DistanceMatrixService } = await importLibrary('geometry'); // Fallback to distance matrix if routes not available
        // Note: For real-time traffic aware routing, we'd ideally use Routes API (v2) 
        // through a separate fetch call or the JS SDK if available.

        // Simulating traffic ratio for Tlapa context
        // In a real production app, we would call:
        // const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', ...)

        // For now, we mock a "Tlapa Traffic Factor"
        const hour = new Date().getHours();
        let ratio = 1.0;

        // Typical rush hours in Tlapa (School/Work start/end)
        if ((hour >= 7 && hour <= 9) || (hour >= 13 && hour <= 15) || (hour >= 18 && hour <= 20)) {
            ratio = 1.25; // 25% slower
        }

        const thresholds = settings.traffic_thresholds || { low: 1.1, medium: 1.3, high: 1.5 };

        if (ratio >= thresholds.high) return 1.3;
        if (ratio >= thresholds.medium) return 1.2;
        if (ratio >= thresholds.low) return 1.1;

        return 1.0;
    } catch {
        return 1.0;
    }
}

/**
 * Calculate the comprehensive Dynamic Price
 */
export async function calculateDynamicPricing(params) {
    const { origin, destination, merchantId } = params;

    // 1. Get Settings & Weather
    const [settings, weather, { data: zones }] = await Promise.all([
        getAllSettings(),
        fetchCurrentWeather(),
        supabase.from('delivery_zones').select('*').eq('is_active', true)
    ]);

    let finalMultiplier = 1.0;
    const factors = [];

    // 2. Weather Multiplier
    const weatherMult = settings.weather_multipliers?.[weather.condition.id] || 1.0;
    if (weatherMult > 1.0) {
        finalMultiplier *= weatherMult;
        factors.push({
            type: 'weather',
            label: `${weather.condition.icon} Clima: ${weather.condition.label}`,
            multiplier: weatherMult
        });
    }

    // 3. Traffic Multiplier
    const trafficMult = await getTrafficMultiplier(origin, destination, settings);
    if (trafficMult > 1.0) {
        finalMultiplier *= trafficMult;
        factors.push({
            type: 'traffic',
            label: '🚗 Tráfico Intenso',
            multiplier: trafficMult
        });
    }

    // 4. Zone Multiplier (Geofencing)
    let zoneMult = 1.0;
    if (destination && zones) {
        for (const zone of zones) {
            if (isPointInPolygon(destination, zone.polygon)) {
                zoneMult = Math.max(zoneMult, zone.multiplier);
                factors.push({
                    type: 'zone',
                    label: `📍 Zona: ${zone.name}`,
                    multiplier: zone.multiplier
                });
                break; // Use the first matching zone for simplicity
            }
        }
        finalMultiplier *= zoneMult;
    }

    const baseFee = settings.base_fees?.default || 20;
    const finalFee = Math.ceil(baseFee * finalMultiplier);

    return {
        baseFee,
        finalFee,
        totalMultiplier: Math.round(finalMultiplier * 100) / 100,
        factors,
        weather,
        isDynamic: finalMultiplier > 1.0
    };
}

export default { calculateDynamicPricing };
