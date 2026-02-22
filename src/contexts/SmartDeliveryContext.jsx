/**
 * SmartDeliveryContext — Real-time intelligence layer
 * 
 * Provides:
 * - Current weather data with auto-refresh
 * - Merchant load status for all restaurants
 * - Driver proximity rankings
 * - Dynamic ETA calculations
 * 
 * Components consume this context to display:
 * - Weather banners / rain warnings
 * - Restaurant saturation alerts
 * - Smarter delivery time estimates
 * - Priority-sorted order lists for drivers
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchCurrentWeather } from '../services/WeatherService';
import {
    analyzeMerchantLoad,
    getAllMerchantsLoad,
    rankDriversByProximity,
    calculateDynamicETA,
    sortOrdersByPriority,
} from '../services/SmartOrderManager';
import { useOrders } from './OrderContext';

const SmartDeliveryContext = createContext(null);

const WEATHER_REFRESH_MS = 10 * 60 * 1000; // 10 minutes

export function SmartDeliveryProvider({ children }) {
    const { orders } = useOrders();
    const [weather, setWeather] = useState(null);
    const [weatherLoading, setWeatherLoading] = useState(true);
    const [merchantsLoad, setMerchantsLoad] = useState([]);
    const intervalRef = useRef(null);

    // ── Fetch weather on mount and every 10 min ──
    const refreshWeather = useCallback(async () => {
        try {
            const data = await fetchCurrentWeather();
            setWeather(data);
        } catch (err) {
            console.warn('[SmartDelivery] Weather fetch failed', err);
        } finally {
            setWeatherLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshWeather();
        intervalRef.current = setInterval(refreshWeather, WEATHER_REFRESH_MS);
        return () => clearInterval(intervalRef.current);
    }, [refreshWeather]);

    // ── Recalculate merchant loads whenever orders change ──
    useEffect(() => {
        const loads = getAllMerchantsLoad(orders);
        setMerchantsLoad(loads);
    }, [orders]);

    // ── Helper: get load for a specific merchant ──
    const getMerchantLoad = useCallback((merchantId) => {
        return analyzeMerchantLoad(merchantId, orders);
    }, [orders]);

    // ── Helper: get ranked drivers for a merchant ──
    const getDriverRanking = useCallback((merchantId) => {
        return rankDriversByProximity(merchantId, orders);
    }, [orders]);

    // ── Helper: get dynamic ETA ──
    const getDynamicETA = useCallback((merchantId, deliveryAddress) => {
        return calculateDynamicETA({
            merchantId,
            deliveryAddress,
            allOrders: orders,
            weatherCondition: weather?.condition || null,
        });
    }, [orders, weather]);

    // ── Helper: get priority-sorted available orders for drivers ──
    const getPrioritizedOrders = useCallback(() => {
        const available = orders.filter(
            o => o.status === 'ready' || o.status === 'searching_driver'
        );
        return sortOrdersByPriority(available);
    }, [orders]);

    // ── Helper: check if any merchant is overloaded ──
    const getOverloadedMerchants = useCallback(() => {
        return merchantsLoad.filter(
            ml => ml.loadLevel === 'high' || ml.loadLevel === 'critical'
        );
    }, [merchantsLoad]);

    return (
        <SmartDeliveryContext.Provider value={{
            // Weather
            weather,
            weatherLoading,
            isRaining: weather?.isRaining || false,
            refreshWeather,

            // Merchant load
            merchantsLoad,
            getMerchantLoad,
            getOverloadedMerchants,

            // Driver intelligence
            getDriverRanking,

            // ETA
            getDynamicETA,

            // Order priority
            getPrioritizedOrders,
        }}>
            {children}
        </SmartDeliveryContext.Provider>
    );
}

export const useSmartDelivery = () => {
    const context = useContext(SmartDeliveryContext);
    if (!context) throw new Error('useSmartDelivery must be used within SmartDeliveryProvider');
    return context;
};
