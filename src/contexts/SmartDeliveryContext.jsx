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
import { getAllSettings } from '../services/SettingsService';
import {
    analyzeMerchantLoad,
    getAllMerchantsLoad,
    rankDriversByProximity,
    calculateDynamicETA,
    sortOrdersByPriority,
} from '../services/SmartOrderManager';
import { calculateDynamicPricing } from '../services/PricingService';
import { useOrders } from './OrderContext';

const SmartDeliveryContext = createContext(null);

const WEATHER_REFRESH_MS = 10 * 60 * 1000; // 10 minutes
const SETTINGS_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

export function SmartDeliveryProvider({ children }) {
    const { orders } = useOrders();
    const [weather, setWeather] = useState(null);
    const [weatherLoading, setWeatherLoading] = useState(true);
    const [platformSettings, setPlatformSettings] = useState(null);
    const [merchantsLoad, setMerchantsLoad] = useState([]);
    const intervalRef = useRef(null);
    const settingsIntervalRef = useRef(null);

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

    // ── Fetch platform settings ──
    const refreshSettings = useCallback(async () => {
        try {
            const data = await getAllSettings();
            setPlatformSettings(data);
        } catch (err) {
            console.warn('[SmartDelivery] Settings fetch failed', err);
        }
    }, []);

    useEffect(() => {
        refreshWeather();
        refreshSettings();
        intervalRef.current = setInterval(refreshWeather, WEATHER_REFRESH_MS);
        settingsIntervalRef.current = setInterval(refreshSettings, SETTINGS_REFRESH_MS);
        return () => {
            clearInterval(intervalRef.current);
            clearInterval(settingsIntervalRef.current);
        };
    }, [refreshWeather, refreshSettings]);

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
        const config = platformSettings?.operation_config || {};
        return rankDriversByProximity(merchantId, orders, { maxRadius: config.maxDriverRadius });
    }, [orders, platformSettings]);

    // ── Helper: get dynamic ETA ──
    const getDynamicETA = useCallback((merchantId, deliveryAddress) => {
        return calculateDynamicETA({
            merchantId,
            deliveryAddress,
            allOrders: orders,
            weatherCondition: weather?.condition || null,
            operationConfig: platformSettings?.operation_config || null,
        });
    }, [orders, weather, platformSettings]);

    // ── Helper: get dynamic pricing ──
    const getDynamicPricing = useCallback(async (params) => {
        return calculateDynamicPricing({
            weatherCondition: weather?.condition || null,
            ...params
        });
    }, [weather]);

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

            // Platform Settings
            platformSettings,
            refreshSettings,

            // Merchant load
            merchantsLoad,
            getMerchantLoad,
            getOverloadedMerchants,

            // Driver intelligence
            getDriverRanking,

            // ETA
            getDynamicETA,

            // Pricing
            getDynamicPricing,

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
