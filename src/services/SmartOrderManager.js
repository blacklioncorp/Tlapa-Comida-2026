/**
 * SmartOrderManager — Intelligent order assignment & management
 * 
 * Features:
 * 1. PROXIMITY-BASED DRIVER ASSIGNMENT
 *    - Uses Haversine formula to calculate real distance between
 *      driver position and restaurant/delivery point
 *    - Ranks available drivers by proximity to the restaurant
 *    - Shows estimated pickup time per driver
 * 
 * 2. MERCHANT LOAD DETECTION
 *    - Counts active orders per establishment
 *    - Triggers "high load" warning when a merchant has too many
 *      simultaneous orders in preparation
 *    - Adjusts estimated preparation time accordingly
 * 
 * 3. DYNAMIC ETA CALCULATION
 *    - Combines prep time + driver distance + weather delay
 *    - Provides a single, honest ETA to the customer
 * 
 * 4. ORDER PRIORITY SCORING
 *    - Older orders get higher priority
 *    - Cash orders are slightly prioritized (faster flow)
 *    - VIP/repeat customers can get a boost (future)
 */

import { MERCHANTS, ALL_USERS } from '../data/seedData';

// ──────────────────────────────────────────────
// HAVERSINE DISTANCE (km)
// ──────────────────────────────────────────────

const R_EARTH_KM = 6371;

/**
 * Calculate distance between two lat/lng points in km
 * @returns {number} Distance in kilometers
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R_EARTH_KM * c;
}

/**
 * Convert km distance to estimated travel time in minutes
 * Assumes average speed based on vehicle type:
 * - Moto: ~25 km/h in city (considering traffic, stops)
 * - Bici: ~12 km/h
 * - Auto: ~20 km/h (more traffic)
 */
export function distanceToMinutes(distanceKm, vehicleType = 'moto') {
    const speeds = {
        moto: 25,
        bici: 12,
        auto: 20,
    };
    const speed = speeds[vehicleType] || speeds.moto;
    return Math.ceil((distanceKm / speed) * 60);
}

// ──────────────────────────────────────────────
// DRIVER PROXIMITY RANKING
// ──────────────────────────────────────────────

/**
 * Get all available drivers sorted by proximity to a merchant
 * @param {string} merchantId - The merchant to pick up from
 * @param {Array} allOrders - Current orders to check which drivers are busy
 * @returns {Array} Sorted array of { driver, distance, estimatedPickupMinutes }
 */
export function rankDriversByProximity(merchantId, allOrders = []) {
    const merchant = MERCHANTS.find(m => m.id === merchantId);
    if (!merchant?.location) return [];

    const merchantLat = merchant.location.lat;
    const merchantLng = merchant.location.lng;

    // Get all drivers
    const drivers = ALL_USERS.filter(u => u.role === 'driver' && u.isActive);

    // Check which drivers have active orders
    const busyDriverIds = new Set(
        allOrders
            .filter(o => o.driverId && !['delivered', 'cancelled'].includes(o.status))
            .map(o => o.driverId)
    );

    // Also check localStorage for updated driver locations
    let savedLocations = {};
    try {
        const saved = localStorage.getItem('tlapa_driver_locations');
        if (saved) savedLocations = JSON.parse(saved);
    } catch { /* ignore */ }

    return drivers
        .map(driver => {
            const loc = savedLocations[driver.id] || driver.currentLocation;
            if (!loc) return null;

            const distance = haversineDistance(
                loc.lat, loc.lng,
                merchantLat, merchantLng
            );

            const vehicleType = driver.driverMeta?.vehicleType || 'moto';
            const estimatedPickupMinutes = distanceToMinutes(distance, vehicleType);
            const isBusy = busyDriverIds.has(driver.id);

            return {
                driver,
                distance: Math.round(distance * 100) / 100, // 2 decimals
                estimatedPickupMinutes,
                vehicleType,
                isBusy,
                rating: driver.driverMeta?.rating || 0,
                totalDeliveries: driver.driverMeta?.totalDeliveries || 0,
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            // First: available drivers before busy ones
            if (a.isBusy !== b.isBusy) return a.isBusy ? 1 : -1;
            // Then: by distance
            return a.distance - b.distance;
        });
}

/**
 * Get the best available driver for a specific order
 */
export function getBestDriverForOrder(merchantId, allOrders = []) {
    const ranked = rankDriversByProximity(merchantId, allOrders);
    return ranked.find(d => !d.isBusy) || ranked[0] || null;
}

// ──────────────────────────────────────────────
// MERCHANT LOAD ANALYSIS
// ──────────────────────────────────────────────

// Thresholds for load levels
const LOAD_THRESHOLDS = {
    low: 2,       // 0-2 active orders = low load
    medium: 4,    // 3-4 active orders = medium load
    high: 6,      // 5-6 active orders = high load
    critical: 7,  // 7+ = critical (should pause new orders)
};

/**
 * Analyze merchant load based on active orders
 * @param {string} merchantId
 * @param {Array} allOrders
 * @returns {{ 
 *   activeOrderCount: number, 
 *   loadLevel: 'low'|'medium'|'high'|'critical',
 *   prepTimeMultiplier: number,
 *   warning: string|null,
 *   icon: string,
 *   color: string
 * }}
 */
export function analyzeMerchantLoad(merchantId, allOrders = []) {
    const activeStatuses = ['paid', 'accepted', 'preparing', 'ready'];
    const activeOrders = allOrders.filter(
        o => o.merchantId === merchantId && activeStatuses.includes(o.status)
    );
    const count = activeOrders.length;
    const merchant = MERCHANTS.find(m => m.id === merchantId);

    let loadLevel, prepTimeMultiplier, warning, icon, color;

    if (count <= LOAD_THRESHOLDS.low) {
        loadLevel = 'low';
        prepTimeMultiplier = 1.0;
        warning = null;
        icon = '✅';
        color = 'success';
    } else if (count <= LOAD_THRESHOLDS.medium) {
        loadLevel = 'medium';
        prepTimeMultiplier = 1.15;
        warning = `${merchant?.name || 'Este restaurante'} tiene varios pedidos — tu orden puede tardar un poco más`;
        icon = '⏳';
        color = 'warning';
    } else if (count <= LOAD_THRESHOLDS.high) {
        loadLevel = 'high';
        prepTimeMultiplier = 1.35;
        warning = `⚠️ ${merchant?.name || 'Este restaurante'} tiene alta demanda — tiempo de preparación extendido`;
        icon = '🔥';
        color = 'warning';
    } else {
        loadLevel = 'critical';
        prepTimeMultiplier = 1.6;
        warning = `🚨 ${merchant?.name || 'Este restaurante'} está saturado — tiempos de entrega muy extendidos`;
        icon = '🚨';
        color = 'error';
    }

    return {
        activeOrderCount: count,
        loadLevel,
        prepTimeMultiplier,
        warning,
        icon,
        color,
        preparingCount: activeOrders.filter(o => o.status === 'preparing').length,
        waitingCount: activeOrders.filter(o => o.status === 'paid' || o.status === 'accepted').length,
    };
}

/**
 * Get load status for ALL merchants at once (for admin dashboard)
 */
export function getAllMerchantsLoad(allOrders = []) {
    return MERCHANTS.map(merchant => ({
        merchant,
        ...analyzeMerchantLoad(merchant.id, allOrders),
    }));
}

// ──────────────────────────────────────────────
// DYNAMIC ETA CALCULATION
// ──────────────────────────────────────────────

/**
 * Calculate comprehensive ETA considering all factors
 * @param {object} params
 * @param {string} params.merchantId
 * @param {object} params.deliveryAddress - { location: { lat, lng } }
 * @param {Array} params.allOrders  
 * @param {object} params.weatherCondition - from WeatherService
 * @returns {{
 *   prepTime: number,
 *   pickupTime: number,
 *   deliveryTime: number,
 *   totalMinutes: number,
 *   displayRange: string,
 *   factors: Array<{ label: string, impact: string }>
 * }}
 */
export function calculateDynamicETA({
    merchantId,
    deliveryAddress,
    allOrders = [],
    weatherCondition = null,
}) {
    const merchant = MERCHANTS.find(m => m.id === merchantId);
    if (!merchant) {
        return {
            prepTime: 20,
            pickupTime: 5,
            deliveryTime: 10,
            totalMinutes: 35,
            displayRange: '30-40',
            factors: [],
        };
    }

    const factors = [];

    // 1. Base prep time from merchant
    let basePrepTime = merchant.avgPrepTime || 20;

    // 2. Merchant load adjustment
    const load = analyzeMerchantLoad(merchantId, allOrders);
    const adjustedPrepTime = Math.round(basePrepTime * load.prepTimeMultiplier);
    if (load.loadLevel !== 'low') {
        factors.push({
            label: `Alta demanda en ${merchant.name}`,
            impact: `+${adjustedPrepTime - basePrepTime} min`,
            icon: load.icon,
            type: 'load',
        });
    }

    // 3. Best driver pickup time
    const bestDriver = getBestDriverForOrder(merchantId, allOrders);
    let pickupTime = bestDriver ? bestDriver.estimatedPickupMinutes : 8;
    if (bestDriver && bestDriver.distance > 1.5) {
        factors.push({
            label: `Repartidor a ${bestDriver.distance.toFixed(1)} km`,
            impact: `~${pickupTime} min de recogida`,
            icon: '🛵',
            type: 'distance',
        });
    }

    // 4. Delivery distance (merchant → customer)
    let deliveryTime = 10; // default
    if (deliveryAddress?.location && merchant.location) {
        const deliveryDist = haversineDistance(
            merchant.location.lat, merchant.location.lng,
            deliveryAddress.location.lat, deliveryAddress.location.lng
        );
        const vehicleType = bestDriver?.vehicleType || 'moto';
        deliveryTime = distanceToMinutes(deliveryDist, vehicleType);
    }

    // 5. Weather adjustment
    let weatherMultiplier = 1.0;
    if (weatherCondition && weatherCondition.delayMultiplier > 1.0) {
        weatherMultiplier = weatherCondition.delayMultiplier;
        factors.push({
            label: `${weatherCondition.icon} ${weatherCondition.label}`,
            impact: `+${Math.round((weatherMultiplier - 1) * 100)}% tiempo`,
            icon: weatherCondition.icon,
            type: 'weather',
        });
    }

    // 6. Calculate totals
    const totalBase = adjustedPrepTime + pickupTime + deliveryTime;
    const totalWithWeather = Math.round(totalBase * weatherMultiplier);

    // Generate a range (±5 min)
    const minTime = Math.max(totalWithWeather - 5, adjustedPrepTime);
    const maxTime = totalWithWeather + 5;

    return {
        prepTime: adjustedPrepTime,
        pickupTime,
        deliveryTime,
        totalMinutes: totalWithWeather,
        displayRange: `${minTime}-${maxTime}`,
        factors,
        bestDriver: bestDriver ? {
            name: bestDriver.driver.displayName,
            distance: bestDriver.distance,
            vehicle: bestDriver.vehicleType,
            rating: bestDriver.rating,
        } : null,
        merchantLoad: load,
    };
}

// ──────────────────────────────────────────────
// ORDER PRIORITY SCORING
// ──────────────────────────────────────────────

/**
 * Score an order for priority (higher = more urgent)
 * Used to sort which orders drivers should see first
 */
export function calculateOrderPriority(order) {
    let score = 0;

    // Age of order (older = higher priority)
    const ageMinutes = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
    score += Math.min(ageMinutes * 2, 60); // Max 60 points for age

    // Order value (higher value = slightly higher priority)
    score += Math.min(order.totals?.total / 10, 20); // Max 20 points

    // Cash orders get slight boost (quicker to complete)
    if (order.payment?.method === 'cash') score += 5;

    // Orders waiting too long get urgency boost
    if (ageMinutes > 30) score += 20;
    if (ageMinutes > 45) score += 30;

    return Math.round(score);
}

/**
 * Sort orders by priority (highest first)
 */
export function sortOrdersByPriority(orders) {
    return [...orders].sort((a, b) => {
        return calculateOrderPriority(b) - calculateOrderPriority(a);
    });
}

// ──────────────────────────────────────────────
// DRIVER LOCATION TRACKING (localStorage-based)
// ──────────────────────────────────────────────

/**
 * Update a driver's current location
 */
export function updateDriverLocation(driverId, lat, lng) {
    try {
        const key = 'tlapa_driver_locations';
        const locations = JSON.parse(localStorage.getItem(key) || '{}');
        locations[driverId] = {
            lat,
            lng,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(locations));
    } catch { /* ignore */ }
}

/**
 * Get a driver's latest known location
 */
export function getDriverLocation(driverId) {
    try {
        const key = 'tlapa_driver_locations';
        const locations = JSON.parse(localStorage.getItem(key) || '{}');
        if (locations[driverId]) return locations[driverId];
    } catch { /* ignore */ }

    // Fallback to seed data
    const driver = ALL_USERS.find(u => u.id === driverId);
    return driver?.currentLocation || null;
}

export default {
    haversineDistance,
    distanceToMinutes,
    rankDriversByProximity,
    getBestDriverForOrder,
    analyzeMerchantLoad,
    getAllMerchantsLoad,
    calculateDynamicETA,
    calculateOrderPriority,
    sortOrdersByPriority,
    updateDriverLocation,
    getDriverLocation,
};
