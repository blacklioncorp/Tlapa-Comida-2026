/**
 * MapsCache — Aggressive caching layer for Google Maps API results
 * 
 * Strategy to keep costs at $0:
 * 
 * 1. GEOCODING CACHE: Addresses → lat/lng stored in localStorage permanently.
 *    Tlapa is a small city with ~50 restaurants and limited delivery area.
 *    Once geocoded, an address NEVER needs re-geocoding.
 * 
 * 2. ROUTE CACHE: origin+destination → route data cached for 30 minutes.
 *    Delivery routes in a small city rarely change. After 30 min the
 *    route data is refreshed (traffic conditions may shift).
 * 
 * 3. DISTANCE/ETA CACHE: origin+destination → distance/duration cached 15 min.
 * 
 * 4. PRE-SEEDED MERCHANT COORDS: All known restaurant locations are stored
 *    upfront so we never need to geocode them.
 * 
 * 5. REQUEST DEDUPLICATION: Concurrent identical requests reuse the same promise.
 * 
 * Budget math (pay-as-you-go Essentials free tier):
 *   - Geocoding:  10,000 free/month → With cache, ~50 unique addresses = 50 calls ever
 *   - Routes:     10,000 free/month → ~20 orders/day × 30 = 600 cached routes
 *   - Dynamic Maps: 10,000 free/month → 1 load per page view, well within limits
 *   = Total estimated: ~700 calls/month vs 10,000 free = $0
 */

const CACHE_KEYS = {
    GEOCODE: 'tlapa_geocode_cache',
    ROUTES: 'tlapa_routes_cache',
    ETA: 'tlapa_eta_cache',
};

const ROUTE_TTL_MS = 30 * 60 * 1000;    // 30 minutes
const ETA_TTL_MS = 15 * 60 * 1000;      // 15 minutes

// In-flight promise deduplication map
const pendingRequests = new Map();

// ──────────────────────────────────────────────
// Generic localStorage helpers
// ──────────────────────────────────────────────

function loadCache(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        // localStorage full → purge oldest entries
        console.warn('[MapsCache] Storage full, purging cache', e);
        localStorage.removeItem(key);
    }
}

// ──────────────────────────────────────────────
// Cache key generators
// ──────────────────────────────────────────────

function geocodeKey(address) {
    return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

function routeKey(originLat, originLng, destLat, destLng) {
    // Round to 4 decimals (~11m precision — plenty for city delivery)
    const r = (n) => Number(n).toFixed(4);
    return `${r(originLat)},${r(originLng)}→${r(destLat)},${r(destLng)}`;
}

// ──────────────────────────────────────────────
// GEOCODING CACHE (permanent — addresses don't move)
// ──────────────────────────────────────────────

/**
 * Get cached geocode result for an address.
 * @param {string} address
 * @returns {{ lat: number, lng: number } | null}
 */
export function getCachedGeocode(address) {
    const cache = loadCache(CACHE_KEYS.GEOCODE);
    const entry = cache[geocodeKey(address)];
    return entry || null;
}

/**
 * Store geocode result.
 * @param {string} address
 * @param {{ lat: number, lng: number }} coords
 */
export function setCachedGeocode(address, coords) {
    const cache = loadCache(CACHE_KEYS.GEOCODE);
    cache[geocodeKey(address)] = { lat: coords.lat, lng: coords.lng };
    saveCache(CACHE_KEYS.GEOCODE, cache);
}

// ──────────────────────────────────────────────
// ROUTE CACHE (TTL = 30 min)
// ──────────────────────────────────────────────

/**
 * Get cached route data.
 * @returns {{ distance: string, duration: string, polyline: string, steps: any[] } | null}
 */
export function getCachedRoute(originLat, originLng, destLat, destLng) {
    const cache = loadCache(CACHE_KEYS.ROUTES);
    const key = routeKey(originLat, originLng, destLat, destLng);
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ROUTE_TTL_MS) {
        delete cache[key];
        saveCache(CACHE_KEYS.ROUTES, cache);
        return null;
    }
    return entry.data;
}

/**
 * Store route data with timestamp.
 */
export function setCachedRoute(originLat, originLng, destLat, destLng, data) {
    const cache = loadCache(CACHE_KEYS.ROUTES);
    const key = routeKey(originLat, originLng, destLat, destLng);
    cache[key] = { data, timestamp: Date.now() };

    // Keep cache from growing unbounded — max 100 routes
    const keys = Object.keys(cache);
    if (keys.length > 100) {
        const oldest = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
        oldest.slice(0, keys.length - 80).forEach(k => delete cache[k]);
    }

    saveCache(CACHE_KEYS.ROUTES, cache);
}

// ──────────────────────────────────────────────
// ETA CACHE (TTL = 15 min)
// ──────────────────────────────────────────────

export function getCachedETA(originLat, originLng, destLat, destLng) {
    const cache = loadCache(CACHE_KEYS.ETA);
    const key = routeKey(originLat, originLng, destLat, destLng);
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ETA_TTL_MS) {
        delete cache[key];
        saveCache(CACHE_KEYS.ETA, cache);
        return null;
    }
    return entry.data;
}

export function setCachedETA(originLat, originLng, destLat, destLng, data) {
    const cache = loadCache(CACHE_KEYS.ETA);
    const key = routeKey(originLat, originLng, destLat, destLng);
    cache[key] = { data, timestamp: Date.now() };
    saveCache(CACHE_KEYS.ETA, cache);
}

// ──────────────────────────────────────────────
// REQUEST DEDUPLICATION
// ──────────────────────────────────────────────

/**
 * Deduplicate concurrent API calls. If an identical request is already
 * in-flight, return the same promise instead of making a new API call.
 * 
 * @param {string} requestKey
 * @param {() => Promise<any>} fetcher
 * @returns {Promise<any>}
 */
export async function deduplicatedRequest(requestKey, fetcher) {
    if (pendingRequests.has(requestKey)) {
        return pendingRequests.get(requestKey);
    }

    const promise = fetcher().finally(() => {
        pendingRequests.delete(requestKey);
    });

    pendingRequests.set(requestKey, promise);
    return promise;
}

// ──────────────────────────────────────────────
// PRE-SEEDED MERCHANT LOCATIONS (Tlapa de Comonfort)
// These coordinates are hardcoded to NEVER call Geocoding API
// for known restaurants.
// ──────────────────────────────────────────────

const TLAPA_CENTER = { lat: 17.5460, lng: -98.5764 };

const MERCHANT_COORDS = {
    'm1': { lat: 17.5455, lng: -98.5750 }, // La Cantina del Sabor
    'm2': { lat: 17.5480, lng: -98.5780 }, // Pollos El Fogón
    'm3': { lat: 17.5440, lng: -98.5730 }, // Mariscos El Puerto
    'm4': { lat: 17.5470, lng: -98.5760 }, // Postres de la Abuela
    'm5': { lat: 17.5465, lng: -98.5745 }, // Café Tlapa
    'm6': { lat: 17.5490, lng: -98.5770 }, // Antojitos Doña Mary
};

/**
 * Get coords for a merchant — uses pre-seeded data, no API call needed.
 */
export function getMerchantCoords(merchantId) {
    return MERCHANT_COORDS[merchantId] || TLAPA_CENTER;
}

/**
 * Get a default delivery destination when none is specified.
 */
export function getDefaultDeliveryCoords() {
    return { lat: 17.5445, lng: -98.5740 };
}

export { TLAPA_CENTER };

export default {
    getCachedGeocode,
    setCachedGeocode,
    getCachedRoute,
    setCachedRoute,
    getCachedETA,
    setCachedETA,
    deduplicatedRequest,
    getMerchantCoords,
    getDefaultDeliveryCoords,
    TLAPA_CENTER,
};
