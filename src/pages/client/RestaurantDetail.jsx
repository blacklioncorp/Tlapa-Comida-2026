import { useState, useMemo, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useSmartDelivery } from '../../contexts/SmartDeliveryContext';
import { getMerchants } from '../../data/seedData';
import { applyWeatherDelay, adjustedDeliveryFee } from '../../services/WeatherService';
import { ArrowLeft, Star, Clock, MapPin, ShoppingBag, Plus, Minus, X, Check, AlertCircle } from 'lucide-react';
import WeatherBanner from '../../components/WeatherBanner';
import MerchantLoadBadge from '../../components/MerchantLoadBadge';

// ═══════════════════════════════════════════════
// ItemModal — Full modifier groups, removals, validation
// ═══════════════════════════════════════════════
function ItemModal({ item, merchant, onClose, onAddToCart }) {
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');

    // Modifier group selections: { [groupId]: [selectedOption, ...] }
    const [modifierSelections, setModifierSelections] = useState({});

    // Removed ingredients
    const [removedIngredients, setRemovedIngredients] = useState([]);

    // Legacy extras (for items without modifierGroups)
    const [selectedExtras, setSelectedExtras] = useState([]);

    const hasModifierGroups = item.modifierGroups && item.modifierGroups.length > 0;

    // Toggle option in a modifier group
    const toggleModifierOption = (group, option) => {
        setModifierSelections(prev => {
            const current = prev[group.id] || [];
            const isSelected = current.some(o => o.id === option.id);

            if (group.multiSelect) {
                // Multi-select: toggle
                if (isSelected) {
                    return { ...prev, [group.id]: current.filter(o => o.id !== option.id) };
                }
                // Check max
                if (group.maxSelect && current.length >= group.maxSelect) return prev;
                return { ...prev, [group.id]: [...current, option] };
            } else {
                // Single-select: replace
                if (isSelected) {
                    return { ...prev, [group.id]: [] };
                }
                return { ...prev, [group.id]: [option] };
            }
        });
    };

    // Toggle legacy extra
    const toggleExtra = (extra) => {
        setSelectedExtras(prev =>
            prev.find(e => e.id === extra.id) ? prev.filter(e => e.id !== extra.id) : [...prev, extra]
        );
    };

    // Toggle ingredient removal
    const toggleRemoveIngredient = (ingredient) => {
        setRemovedIngredients(prev =>
            prev.includes(ingredient) ? prev.filter(i => i !== ingredient) : [...prev, ingredient]
        );
    };

    // Calculate totals
    const modifiersTotal = hasModifierGroups
        ? Object.values(modifierSelections).reduce((sum, opts) =>
            sum + opts.reduce((s, o) => s + (o.price || 0), 0), 0)
        : selectedExtras.reduce((sum, e) => sum + e.price, 0);

    const total = (item.price + modifiersTotal) * quantity;

    // Validation: check all required modifier groups are filled
    const requiredGroups = hasModifierGroups
        ? item.modifierGroups.filter(g => g.required)
        : [];

    const missingRequired = requiredGroups.filter(g => {
        const selected = modifierSelections[g.id] || [];
        return selected.length < (g.minSelect || 1);
    });

    const canAdd = missingRequired.length === 0;

    const handleAdd = () => {
        if (!canAdd) return;

        const cartItem = {
            itemId: item.id,
            name: item.name,
            price: item.price,
            image: item.image || item.imageUrl,
            imageUrl: item.image || item.imageUrl,
            quantity,
            notes,
            removedIngredients: removedIngredients.length > 0 ? removedIngredients : undefined,
        };

        if (hasModifierGroups) {
            // New format
            cartItem.modifiers = item.modifierGroups
                .filter(g => (modifierSelections[g.id] || []).length > 0)
                .map(g => ({
                    groupId: g.id,
                    groupName: g.name,
                    selected: modifierSelections[g.id] || [],
                }));
        } else {
            // Legacy format
            cartItem.selectedExtras = selectedExtras;
        }

        onAddToCart(cartItem, merchant);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflow: 'auto' }}>
                <div className="modal-handle" />
                <div style={{ position: 'relative' }}>
                    <img src={item.image || item.imageUrl} alt={item.name}
                        style={{ width: '100%', height: 220, objectFit: 'cover' }} />
                    <button className="btn btn-icon" onClick={onClose}
                        style={{ position: 'absolute', top: 12, right: 12, background: 'white', boxShadow: 'var(--shadow-md)' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ padding: 20 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>{item.name}</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 8 }}>{item.description}</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>${item.price} MXN</p>

                    {/* ═══ Modifier Groups ═══ */}
                    {hasModifierGroups && item.modifierGroups.map(group => (
                        <div key={group.id} style={{ marginTop: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                                    {group.name}
                                </h3>
                                <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    background: group.required
                                        ? (modifierSelections[group.id]?.length >= (group.minSelect || 1) ? '#dcfce7' : '#fef2f2')
                                        : '#f3f4f6',
                                    color: group.required
                                        ? (modifierSelections[group.id]?.length >= (group.minSelect || 1) ? '#166534' : '#991b1b')
                                        : '#6b7280',
                                }}>
                                    {group.required ? 'Obligatorio' : 'Opcional'}
                                    {group.multiSelect && group.maxSelect && ` · máx. ${group.maxSelect}`}
                                </span>
                            </div>

                            {group.options.map(option => {
                                const isSelected = (modifierSelections[group.id] || []).some(o => o.id === option.id);
                                return (
                                    <label key={option.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '11px 0', borderBottom: '1px solid var(--color-border-light)',
                                        cursor: 'pointer',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            {group.multiSelect ? (
                                                <div style={{
                                                    width: 22, height: 22, borderRadius: 6,
                                                    border: `2px solid ${isSelected ? 'var(--color-primary)' : '#d1d5db'}`,
                                                    background: isSelected ? 'var(--color-primary)' : 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.15s',
                                                }} onClick={() => toggleModifierOption(group, option)}>
                                                    {isSelected && <Check size={14} color="white" />}
                                                </div>
                                            ) : (
                                                <div style={{
                                                    width: 22, height: 22, borderRadius: '50%',
                                                    border: `2px solid ${isSelected ? 'var(--color-primary)' : '#d1d5db'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.15s',
                                                }} onClick={() => toggleModifierOption(group, option)}>
                                                    {isSelected && (
                                                        <div style={{
                                                            width: 12, height: 12, borderRadius: '50%',
                                                            background: 'var(--color-primary)',
                                                        }} />
                                                    )}
                                                </div>
                                            )}
                                            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{option.name}</span>
                                        </div>
                                        {option.price > 0 && (
                                            <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.85rem' }}>+${option.price}</span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    ))}

                    {/* ═══ Legacy Extras (fallback) ═══ */}
                    {!hasModifierGroups && item.extras && item.extras.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>¿Quieres agregar algo?</h3>
                            {item.extras.map(extra => (
                                <label key={extra.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px 0', borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <input type="checkbox" checked={selectedExtras.some(e => e.id === extra.id)}
                                            onChange={() => toggleExtra(extra)}
                                            style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }} />
                                        <span style={{ fontWeight: 500 }}>{extra.name}</span>
                                    </div>
                                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>+${extra.price}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {/* ═══ Remove Ingredients ═══ */}
                    {item.baseIngredients && item.baseIngredients.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 10 }}>
                                ¿Quitar algún ingrediente?
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {item.baseIngredients.map(ingredient => {
                                    const isRemoved = removedIngredients.includes(ingredient);
                                    return (
                                        <button
                                            key={ingredient}
                                            type="button"
                                            onClick={() => toggleRemoveIngredient(ingredient)}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: 20,
                                                border: `1.5px solid ${isRemoved ? '#ef4444' : '#e5e7eb'}`,
                                                background: isRemoved ? '#fef2f2' : 'white',
                                                color: isRemoved ? '#ef4444' : '#374151',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                                textDecoration: isRemoved ? 'line-through' : 'none',
                                            }}
                                        >
                                            {isRemoved ? '✕ ' : ''}{ingredient}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div style={{ marginTop: 20 }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                            Instrucciones especiales
                        </label>
                        <textarea
                            className="form-input form-textarea"
                            placeholder="Ej. Muy picoso por favor"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>

                    {/* Required fields missing warning */}
                    {missingRequired.length > 0 && (
                        <div style={{
                            marginTop: 16, padding: '10px 14px', borderRadius: 8,
                            background: '#fef2f2', display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: '0.8rem', color: '#991b1b',
                        }}>
                            <AlertCircle size={14} />
                            Selecciona: {missingRequired.map(g => g.name).join(', ')}
                        </div>
                    )}

                    {/* Quantity + Add */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
                        <div className="qty-selector">
                            <button className="qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                                <Minus size={16} />
                            </button>
                            <span className="qty-value">{quantity}</span>
                            <button className="qty-btn" onClick={() => setQuantity(q => q + 1)}>
                                <Plus size={16} />
                            </button>
                        </div>
                        <button
                            className="btn btn-primary btn-lg"
                            style={{ flex: 1, opacity: canAdd ? 1 : 0.5 }}
                            onClick={handleAdd}
                            disabled={!canAdd}
                        >
                            Agregar ${total.toFixed(0)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RestaurantDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addItem, itemCount, subtotal } = useCart();
    const { weather, isRaining } = useSmartDelivery();
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeMenuCat, setActiveMenuCat] = useState('all');
    const [realtimeMenu, setRealtimeMenu] = useState([]);
    const [loadingMenu, setLoadingMenu] = useState(true);

    const merchant = getMerchants().find(m => m.id === id);

    // LECTURA EN TIEMPO REAL (onSnapshot)
    useEffect(() => {
        if (!id) return;

        const menuRef = collection(db, 'restaurants', id, 'menu');
        const q = query(menuRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const menuData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRealtimeMenu(menuData);
            setLoadingMenu(false);
        }, (error) => {
            console.error("Error cargando menú en tiempo real:", error);
            setLoadingMenu(false);
        });

        return () => unsubscribe();
    }, [id]);

    // 3. MENÚ REAL DESDE FIRESTORE (Ya no fusionamos con el falso)
    const activeMenu = realtimeMenu;

    const menuCategories = useMemo(() => {
        if (!merchant) return [];
        const cats = new Set(activeMenu.map(item => item.category));
        return ['all', ...cats];
    }, [merchant, activeMenu]);

    const filteredMenu = useMemo(() => {
        if (!merchant) return [];
        return activeMenuCat === 'all'
            ? activeMenu
            : activeMenu.filter(item => item.category === activeMenuCat);
    }, [merchant, activeMenu, activeMenuCat]);

    const groupedMenu = useMemo(() => {
        const groups = {};
        filteredMenu.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });
        return groups;
    }, [filteredMenu]);

    if (!merchant) return <div className="app-container"><div className="loading-page"><p>Restaurante no encontrado</p></div></div>;

    return (
        <div className="app-container">
            {/* Banner */}
            <div style={{ position: 'relative', height: 220 }}>
                <img src={merchant.bannerUrl} alt={merchant.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.7))' }} />
                <button className="btn btn-icon" onClick={() => navigate(-1)}
                    style={{ position: 'absolute', top: 16, left: 16, background: 'white', boxShadow: 'var(--shadow-md)' }}>
                    <ArrowLeft size={18} />
                </button>

                {/* Closed overlay */}
                {!merchant.isOpen && (
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{
                            background: 'white', borderRadius: 12, padding: '16px 24px', textAlign: 'center',
                        }}>
                            <span style={{ fontSize: 32 }}>🔒</span>
                            <p style={{ fontWeight: 700, marginTop: 8 }}>Cerrado</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Info */}
            <div style={{ padding: '20px 16px', marginTop: -40, position: 'relative' }}>
                <div style={{
                    background: 'white', borderRadius: 16, padding: 20,
                    boxShadow: 'var(--shadow-lg)',
                }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>{merchant.name}</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 12 }}>{merchant.description}</p>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem' }}>
                        <span className="badge badge-primary">
                            <Star size={12} fill="var(--color-primary)" /> {merchant.rating}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
                            <Clock size={14} /> {isRaining ? applyWeatherDelay(merchant.deliveryTime, weather?.condition) : merchant.deliveryTime} min
                            {isRaining && <span style={{ fontSize: '0.65rem', color: '#1e40af' }}>⚠️</span>}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
                            <MapPin size={14} /> Envío ${isRaining ? adjustedDeliveryFee(merchant.deliveryFee, weather?.condition) : merchant.deliveryFee}
                        </span>
                    </div>
                    <MerchantLoadBadge merchantId={id} showDetails={true} style={{ marginTop: 12 }} />
                </div>
            </div>

            {/* Weather Notice */}
            <div style={{ padding: '0 16px' }}>
                <WeatherBanner />
            </div>

            {/* Menu Categories */}
            <div style={{ padding: '0 16px', marginBottom: 16 }}>
                <div className="pills-container">
                    {menuCategories.map(cat => (
                        <button key={cat}
                            className={`pill ${activeMenuCat === cat ? 'active' : ''}`}
                            onClick={() => setActiveMenuCat(cat)}>
                            {cat === 'all' ? '🍽️ Todo' : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Items */}
            <div style={{ padding: '0 16px 100px' }}>
                {Object.entries(groupedMenu).map(([category, items]) => (
                    <div key={category} style={{ marginBottom: 24 }}>
                        <h3 className="section-title">{category}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {items.map(item => (
                                <div key={item.id || item.itemId}
                                    className="card-flat card"
                                    onClick={() => item.isAvailable && merchant.isOpen && setSelectedItem(item)}
                                    style={{
                                        display: 'flex', cursor: (merchant.isOpen && item.isAvailable) ? 'pointer' : 'default',
                                        opacity: item.isAvailable && merchant.isOpen ? 1 : 0.5,
                                        borderRadius: 12,
                                    }}>
                                    <div style={{ flex: 1, padding: 16 }}>
                                        <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{item.name}</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                                            {item.description}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>${item.price}</span>
                                            {!item.isAvailable && (
                                                <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>Agotado</span>
                                            )}
                                            {item.modifierGroups?.some(g => g.required) && (
                                                <span style={{
                                                    fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4,
                                                    background: '#f3f4f6', color: '#6b7280', fontWeight: 600,
                                                }}>
                                                    Personalizable
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                                        <img src={item.image || item.imageUrl} alt={item.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0 12px 12px 0' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Item Modal */}
            {selectedItem && (
                <ItemModal
                    item={selectedItem}
                    merchant={merchant}
                    onClose={() => setSelectedItem(null)}
                    onAddToCart={addItem}
                />
            )}

            {/* Floating cart */}
            {itemCount > 0 && (
                <button className="floating-cart" onClick={() => navigate('/checkout')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShoppingBag size={20} />
                        Ver carrito ({itemCount})
                    </span>
                    <span>${subtotal.toFixed(0)}</span>
                </button>
            )}
        </div>
    );
}
