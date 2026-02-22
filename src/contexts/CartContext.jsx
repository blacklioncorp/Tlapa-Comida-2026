import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => {
        const saved = localStorage.getItem('tlapa_cart');
        return saved ? JSON.parse(saved) : [];
    });
    const [merchantId, setMerchantId] = useState(() => {
        return localStorage.getItem('tlapa_cart_merchant') || null;
    });

    useEffect(() => {
        localStorage.setItem('tlapa_cart', JSON.stringify(items));
    }, [items]);

    useEffect(() => {
        if (merchantId) localStorage.setItem('tlapa_cart_merchant', merchantId);
        else localStorage.removeItem('tlapa_cart_merchant');
    }, [merchantId]);

    // Generate a unique key for an item based on its config
    const getItemKey = (item) => {
        const modifiersKey = item.modifiers
            ? JSON.stringify(item.modifiers.map(m => ({ g: m.groupId, s: (m.selected || []).map(o => o.id).sort() })))
            : '';
        const extrasKey = item.selectedExtras
            ? JSON.stringify((item.selectedExtras || []).map(e => e.id).sort())
            : '';
        const removedKey = item.removedIngredients
            ? JSON.stringify((item.removedIngredients || []).sort())
            : '';
        return `${item.itemId || item.id}_${modifiersKey}_${extrasKey}_${removedKey}_${item.notes || ''}`;
    };

    const addItem = (item, merchant) => {
        if (merchantId && merchantId !== merchant.id) {
            if (window.confirm('Ya tienes productos de otro restaurante. ¿Quieres vaciar el carrito y agregar este producto?')) {
                setItems([{ ...item, quantity: item.quantity || 1 }]);
                setMerchantId(merchant.id);
            }
            return;
        }
        setMerchantId(merchant.id);
        setItems(prev => {
            const newKey = getItemKey(item);
            const existing = prev.findIndex(i => getItemKey(i) === newKey);
            if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + (item.quantity || 1) };
                return updated;
            }
            return [...prev, { ...item, quantity: item.quantity || 1 }];
        });
    };

    const removeItem = (index) => {
        setItems(prev => {
            const updated = prev.filter((_, i) => i !== index);
            if (updated.length === 0) setMerchantId(null);
            return updated;
        });
    };

    const updateQuantity = (index, delta) => {
        setItems(prev => {
            const updated = [...prev];
            const newQty = updated[index].quantity + delta;
            if (newQty <= 0) {
                // Remove item if quantity reaches 0
                const filtered = updated.filter((_, i) => i !== index);
                if (filtered.length === 0) setMerchantId(null);
                return filtered;
            }
            updated[index] = { ...updated[index], quantity: newQty };
            return updated;
        });
    };

    const clearCart = () => {
        setItems([]);
        setMerchantId(null);
    };

    const getItemTotal = (item) => {
        let extrasTotal = 0;

        // New modifier groups format
        if (item.modifiers && item.modifiers.length > 0) {
            extrasTotal = item.modifiers.reduce((sum, group) => {
                return sum + (group.selected || []).reduce((s, opt) => s + (opt.price || 0), 0);
            }, 0);
        }
        // Legacy selectedExtras format
        else if (item.selectedExtras && item.selectedExtras.length > 0) {
            extrasTotal = item.selectedExtras.reduce((sum, e) => sum + e.price, 0);
        }

        return (item.price + extrasTotal) * item.quantity;
    };

    const subtotal = items.reduce((sum, item) => sum + getItemTotal(item), 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            items, merchantId, addItem, removeItem, updateQuantity, clearCart,
            subtotal, itemCount, getItemTotal
        }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
};
