import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PromotionContext = createContext(null);

// Default promotions to seed if none exist
const DEFAULT_PROMOTIONS = [
    {
        code: 'TLAPA20',
        name: 'Bienvenida Tlapa 20%',
        description: '20% de descuento en tu primer pedido',
        discountType: 'percentage',    // percentage | fixed | delivery
        discountValue: 20,             // 20% or $20 depending on type
        maxDiscount: 50,
        minOrder: 100,
        isActive: true,
        conditions: {
            newUsersOnly: true,         // Solo usuarios nuevos
            singleUse: true,            // Una sola vez por usuario
            maxTotalUses: null,         // Sin límite global
            specificMerchants: [],      // Vacío = todos los comercios
            validFrom: null,
            validUntil: null,
            daysOfWeek: [],             // Vacío = todos los días
            minItems: 0,
            paymentMethods: [],         // Vacío = todos
        },
        usageCount: 0,
        usedBy: [],                     // Array de user IDs que ya usaron
        createdAt: new Date().toISOString(),
    },
    {
        code: 'ENVIO50',
        name: 'Envío mitad de precio',
        description: '50% de descuento en envío',
        discountType: 'delivery',
        discountValue: 50,
        maxDiscount: 25,
        minOrder: 80,
        isActive: true,
        conditions: {
            newUsersOnly: false,
            singleUse: false,
            maxTotalUses: 500,
            specificMerchants: [],
            validFrom: null,
            validUntil: null,
            daysOfWeek: [],
            minItems: 0,
            paymentMethods: [],
        },
        usageCount: 0,
        usedBy: [],
        createdAt: new Date().toISOString(),
    },
];

const STORAGE_KEY = 'tlapa_promotions';

function loadPromotions() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return DEFAULT_PROMOTIONS.map((p, i) => ({ ...p, id: `promo-${i + 1}` }));
}

function savePromotions(promos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(promos));
}

export function PromotionProvider({ children }) {
    const [promotions, setPromotions] = useState(() => loadPromotions());
    const [loading, setLoading] = useState(false);

    // Persist to localStorage whenever promotions change
    useEffect(() => {
        savePromotions(promotions);
    }, [promotions]);

    // --- CRUD ---

    const addPromotion = (promo) => {
        const newPromo = {
            ...promo,
            id: `promo-${Date.now()}`,
            usageCount: 0,
            usedBy: [],
            createdAt: new Date().toISOString(),
        };
        setPromotions(prev => [newPromo, ...prev]);
        return newPromo;
    };

    const updatePromotion = (id, updates) => {
        setPromotions(prev =>
            prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)
        );
    };

    const deletePromotion = (id) => {
        setPromotions(prev => prev.filter(p => p.id !== id));
    };

    const togglePromotion = (id) => {
        setPromotions(prev =>
            prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p)
        );
    };

    const duplicatePromotion = (id) => {
        const original = promotions.find(p => p.id === id);
        if (!original) return;
        const copy = {
            ...original,
            id: `promo-${Date.now()}`,
            code: `${original.code}_COPIA`,
            name: `${original.name} (Copia)`,
            usageCount: 0,
            usedBy: [],
            isActive: false,
            createdAt: new Date().toISOString(),
        };
        setPromotions(prev => [copy, ...prev]);
    };

    // --- Validation ---

    /**
     * Validate a promotion code for a specific user/order context
     * Returns { valid, error, promo, discountAmount }
     */
    const validatePromotion = (code, { userId, orderTotal, deliveryFee, merchantId, itemCount, paymentMethod, userOrderCount }) => {
        const promo = promotions.find(p => p.code.toUpperCase() === code.toUpperCase());
        if (!promo) return { valid: false, error: 'Código no encontrado', promo: null, discountAmount: 0 };
        if (!promo.isActive) return { valid: false, error: 'Esta promoción ya no está activa', promo, discountAmount: 0 };

        const cond = promo.conditions || {};

        // New users only
        if (cond.newUsersOnly && (userOrderCount || 0) > 0) {
            return { valid: false, error: 'Solo disponible para usuarios nuevos (primer pedido)', promo, discountAmount: 0 };
        }

        // Single use per user
        if (cond.singleUse && promo.usedBy?.includes(userId)) {
            return { valid: false, error: 'Ya usaste este código anteriormente', promo, discountAmount: 0 };
        }

        // Max total uses globally
        if (cond.maxTotalUses && promo.usageCount >= cond.maxTotalUses) {
            return { valid: false, error: 'Este código ya alcanzó su límite de usos', promo, discountAmount: 0 };
        }

        // Min order
        if (promo.minOrder && orderTotal < promo.minOrder) {
            return { valid: false, error: `Pedido mínimo de $${promo.minOrder}`, promo, discountAmount: 0 };
        }

        // Min items
        if (cond.minItems && itemCount < cond.minItems) {
            return { valid: false, error: `Necesitas al menos ${cond.minItems} artículos`, promo, discountAmount: 0 };
        }

        // Specific merchants
        if (cond.specificMerchants?.length > 0 && !cond.specificMerchants.includes(merchantId)) {
            return { valid: false, error: 'Este código no es válido para este comercio', promo, discountAmount: 0 };
        }

        // Payment method
        if (cond.paymentMethods?.length > 0 && !cond.paymentMethods.includes(paymentMethod)) {
            return { valid: false, error: `Este código solo aplica para pagos con ${cond.paymentMethods.join(' o ')}`, promo, discountAmount: 0 };
        }

        // Date range
        const now = new Date();
        if (cond.validFrom && new Date(cond.validFrom) > now) {
            return { valid: false, error: 'Este código aún no está vigente', promo, discountAmount: 0 };
        }
        if (cond.validUntil && new Date(cond.validUntil) < now) {
            return { valid: false, error: 'Este código ya expiró', promo, discountAmount: 0 };
        }

        // Day of week (0=Sun,...,6=Sat)
        if (cond.daysOfWeek?.length > 0 && !cond.daysOfWeek.includes(now.getDay())) {
            const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
            const validDays = cond.daysOfWeek.map(d => days[d]).join(', ');
            return { valid: false, error: `Este código solo es válido los ${validDays}`, promo, discountAmount: 0 };
        }

        // Calculate discount
        let discountAmount = 0;
        if (promo.discountType === 'percentage') {
            discountAmount = Math.round(orderTotal * (promo.discountValue / 100));
        } else if (promo.discountType === 'fixed') {
            discountAmount = promo.discountValue;
        } else if (promo.discountType === 'delivery') {
            discountAmount = Math.round(deliveryFee * (promo.discountValue / 100));
        }

        // Apply max discount cap
        if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
            discountAmount = promo.maxDiscount;
        }

        return { valid: true, error: null, promo, discountAmount };
    };

    // Mark a promo as used by a user
    const markPromoUsed = (promoId, userId) => {
        setPromotions(prev =>
            prev.map(p => {
                if (p.id !== promoId) return p;
                return {
                    ...p,
                    usageCount: (p.usageCount || 0) + 1,
                    usedBy: [...(p.usedBy || []), userId],
                };
            })
        );
    };

    // Get active promotions visible to clients
    const getActivePromotions = () => {
        const now = new Date();
        return promotions.filter(p => {
            if (!p.isActive) return false;
            const cond = p.conditions || {};
            if (cond.validFrom && new Date(cond.validFrom) > now) return false;
            if (cond.validUntil && new Date(cond.validUntil) < now) return false;
            if (cond.maxTotalUses && p.usageCount >= cond.maxTotalUses) return false;
            return true;
        });
    };

    // Stats
    const getStats = () => {
        const active = promotions.filter(p => p.isActive).length;
        const totalUses = promotions.reduce((s, p) => s + (p.usageCount || 0), 0);
        const expired = promotions.filter(p => {
            const cond = p.conditions || {};
            return cond.validUntil && new Date(cond.validUntil) < new Date();
        }).length;
        return { total: promotions.length, active, totalUses, expired };
    };

    return (
        <PromotionContext.Provider value={{
            promotions, loading,
            addPromotion, updatePromotion, deletePromotion,
            togglePromotion, duplicatePromotion,
            validatePromotion, markPromoUsed,
            getActivePromotions, getStats,
        }}>
            {children}
        </PromotionContext.Provider>
    );
}

export const usePromotions = () => {
    const ctx = useContext(PromotionContext);
    if (!ctx) throw new Error('usePromotions must be inside PromotionProvider');
    return ctx;
};
