/**
 * WeatherService — Free weather data for Tlapa de Comonfort
 * 
 * Uses Open-Meteo API (100% free, no API key required)
 * https://open-meteo.com/
 * 
 * Weather codes reference:
 * 0: Clear sky
 * 1-3: Mainly clear, partly cloudy, overcast
 * 45, 48: Fog
 * 51-55: Drizzle
 * 56-57: Freezing drizzle
 * 61-65: Rain (slight, moderate, heavy)
 * 66-67: Freezing rain
 * 71-77: Snow
 * 80-82: Rain showers
 * 85-86: Snow showers
 * 95: Thunderstorm
 * 96-99: Thunderstorm with hail
 */

const TLAPA_LAT = 17.5460;
const TLAPA_LNG = -98.5764;
const CACHE_KEY = 'tlapa_weather_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Weather condition definitions
const WEATHER_CONDITIONS = {
    clear: {
        id: 'clear',
        label: 'Despejado',
        icon: '☀️',
        delayMultiplier: 1.0,
        deliverySurcharge: 0,
        message: null,
    },
    cloudy: {
        id: 'cloudy',
        label: 'Nublado',
        icon: '⛅',
        delayMultiplier: 1.0,
        deliverySurcharge: 0,
        message: null,
    },
    fog: {
        id: 'fog',
        label: 'Neblina',
        icon: '🌫️',
        delayMultiplier: 1.15,
        deliverySurcharge: 5,
        message: 'Hay neblina — los tiempos de entrega pueden ser un poco más largos',
    },
    drizzle: {
        id: 'drizzle',
        label: 'Llovizna',
        icon: '🌦️',
        delayMultiplier: 1.2,
        deliverySurcharge: 5,
        message: 'Llovizna ligera — tu pedido puede tardar un poco más',
    },
    rain: {
        id: 'rain',
        label: 'Lluvia',
        icon: '🌧️',
        delayMultiplier: 1.35,
        deliverySurcharge: 10,
        message: 'Está lloviendo — los tiempos de entrega serán más largos de lo normal',
    },
    heavy_rain: {
        id: 'heavy_rain',
        label: 'Lluvia fuerte',
        icon: '⛈️',
        delayMultiplier: 1.5,
        deliverySurcharge: 15,
        message: '¡Lluvia intensa! Los repartidores están tomando precauciones extra',
    },
    storm: {
        id: 'storm',
        label: 'Tormenta',
        icon: '🌩️',
        delayMultiplier: 1.7,
        deliverySurcharge: 20,
        message: '⚠️ Tormenta eléctrica — entregas pueden retrasarse significativamente',
    },
};

/**
 * Map Open-Meteo weather code to our condition category
 */
function weatherCodeToCondition(code) {
    if (code === 0) return WEATHER_CONDITIONS.clear;
    if (code >= 1 && code <= 3) return WEATHER_CONDITIONS.cloudy;
    if (code === 45 || code === 48) return WEATHER_CONDITIONS.fog;
    if (code >= 51 && code <= 57) return WEATHER_CONDITIONS.drizzle;
    if (code === 61 || code === 80) return WEATHER_CONDITIONS.rain; // slight rain / showers
    if (code === 63 || code === 81) return WEATHER_CONDITIONS.rain; // moderate rain
    if (code === 65 || code === 82) return WEATHER_CONDITIONS.heavy_rain; // heavy rain
    if (code >= 66 && code <= 67) return WEATHER_CONDITIONS.rain; // freezing rain
    if (code >= 71 && code <= 77) return WEATHER_CONDITIONS.fog; // snow (unlikely in Tlapa but treat as slow)
    if (code >= 85 && code <= 86) return WEATHER_CONDITIONS.rain;
    if (code >= 95) return WEATHER_CONDITIONS.storm;
    return WEATHER_CONDITIONS.clear;
}

/**
 * Load cached weather data
 */
function loadCached() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (Date.now() - cached.timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return cached.data;
    } catch {
        return null;
    }
}

/**
 * Save weather data to cache
 */
function saveToCache(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now(),
        }));
    } catch { /* ignore storage errors */ }
}

/**
 * Fetch current weather from Open-Meteo API
 * Returns: { temperature, weatherCode, condition, windSpeed, humidity, isRaining }
 */
export async function fetchCurrentWeather() {
    // Check cache first
    const cached = loadCached();
    if (cached) return cached;

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${TLAPA_LAT}&longitude=${TLAPA_LNG}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&timezone=America/Mexico_City`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Weather API error: ${response.status}`);

        const json = await response.json();
        const current = json.current;

        const condition = weatherCodeToCondition(current.weather_code);
        const isRaining = ['drizzle', 'rain', 'heavy_rain', 'storm'].includes(condition.id);

        const result = {
            temperature: Math.round(current.temperature_2m),
            temperatureUnit: '°C',
            weatherCode: current.weather_code,
            condition,
            windSpeed: current.wind_speed_10m,
            humidity: current.relative_humidity_2m,
            precipitation: current.precipitation,
            isRaining,
            fetchedAt: new Date().toISOString(),
        };

        saveToCache(result);
        return result;
    } catch (error) {
        console.warn('[WeatherService] Failed to fetch weather, using fallback', error);
        // Fallback: assume clear weather
        return {
            temperature: 28,
            temperatureUnit: '°C',
            weatherCode: 0,
            condition: WEATHER_CONDITIONS.clear,
            windSpeed: 5,
            humidity: 60,
            precipitation: 0,
            isRaining: false,
            fetchedAt: new Date().toISOString(),
            isFallback: true,
        };
    }
}

/**
 * Apply weather delay to an estimated delivery time range
 * e.g., "25-35" min → "34-47" min during heavy rain
 */
export function applyWeatherDelay(deliveryTimeStr, condition) {
    if (!condition || condition.delayMultiplier === 1.0) return deliveryTimeStr;

    const match = deliveryTimeStr?.match(/(\d+)-(\d+)/);
    if (!match) return deliveryTimeStr;

    const min = Math.round(parseInt(match[1]) * condition.delayMultiplier);
    const max = Math.round(parseInt(match[2]) * condition.delayMultiplier);
    return `${min}-${max}`;
}

/**
 * Calculate adjusted delivery fee based on weather
 */
export function adjustedDeliveryFee(baseFee, condition) {
    if (!condition) return baseFee;
    return baseFee + (condition.deliverySurcharge || 0);
}

export { WEATHER_CONDITIONS };

export default {
    fetchCurrentWeather,
    applyWeatherDelay,
    adjustedDeliveryFee,
    WEATHER_CONDITIONS,
};
