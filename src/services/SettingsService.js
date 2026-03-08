import { supabase } from '../supabase';

const CACHE_KEY = 'tlapa_platform_settings';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function getAllSettings() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) return data;
    }

    try {
        const { data, error } = await supabase.from('delivery_settings').select('*');
        if (error) throw error;

        const settings = data.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: settings,
            timestamp: Date.now()
        }));

        return settings;
    } catch (err) {
        console.warn('[SettingsService] Failed to fetch settings, using defaults', err);
        return {
            platform_config: {
                platformName: 'Tlapa Food',
                maintenanceMode: false
            },
            operation_config: {
                maxDeliveryRadius: 8,
                maxDriverRadius: 8,
                autoAssignDrivers: true
            },
            fees_and_limits: {
                deliveryBaseFee: 20,
                deliveryPerKm: 5,
                minOrderAmount: 50
            }
        };
    }
}

export async function getSettingEntry(key, defaultValue = {}) {
    const all = await getAllSettings();
    return all[key] || defaultValue;
}

export default { getAllSettings, getSettingEntry };
