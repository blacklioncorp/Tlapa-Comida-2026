import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useOrders } from '../../contexts/OrderContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSmartDelivery } from '../../contexts/SmartDeliveryContext';
import { usePromotions } from '../../contexts/PromotionContext';
import { supabase } from '../../supabase';
import { adjustedDeliveryFee } from '../../services/WeatherService';
import { ArrowLeft, Minus, Plus, Trash2, MapPin, CreditCard, Banknote, Tag, AlertTriangle, WifiOff, Edit3 } from 'lucide-react';
import WeatherBanner from '../../components/WeatherBanner';
import SmartETADisplay from '../../components/SmartETADisplay';
import MerchantLoadBadge from '../../components/MerchantLoadBadge';

export default function Checkout() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { items, merchantId, removeItem, updateQuantity, clearCart, subtotal, getItemTotal } = useCart();
    const { createOrder } = useOrders();
    const { weather, isRaining } = useSmartDelivery();
    const { validatePromotion, markPromoUsed } = usePromotions();
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [couponCode, setCouponCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [couponError, setCouponError] = useState('');
    const [couponSuccess, setCouponSuccess] = useState('');
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [submitError, setSubmitError] = useState('');

    // Address state
    const defaultAddr = user?.savedAddresses?.[0] || { street: '', colony: '', reference: '' };
    const [deliveryAddress, setDeliveryAddress] = useState({
        street: defaultAddr.street || '',
        colony: defaultAddr.colony || '',
        reference: defaultAddr.reference || '',
        label: defaultAddr.label || '',
        phone: user?.phone || '',
    });
    const [showAddressEdit, setShowAddressEdit] = useState(!defaultAddr.street);

    // Online/Offline detection
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Merchant state
    const [merchant, setMerchant] = useState(null);
    const [loadingMerchant, setLoadingMerchant] = useState(true);

    // Fetch live merchant data
    useEffect(() => {
        const fetchMerchant = async () => {
            if (!merchantId) return;
            try {
                const { data, error } = await supabase.from('merchants').select('*').eq('id', merchantId).single();
                if (error) throw error;
                setMerchant(data);
            } catch (err) {
                console.error("Failed to fetch merchant for checkout:", err);
            } finally {
                setLoadingMerchant(false);
            }
        };
        fetchMerchant();
    }, [merchantId]);

    const baseDeliveryFee = merchant?.deliveryFee || 20;
    const deliveryFee = isRaining ? adjustedDeliveryFee(baseDeliveryFee, weather?.condition) : baseDeliveryFee;
    const weatherSurcharge = deliveryFee - baseDeliveryFee;
    const serviceFee = Math.round(subtotal * 0.05);
    const total = subtotal + deliveryFee + serviceFee - discount;

    // Validation
    const addressValid = deliveryAddress.street.trim().length >= 3 && deliveryAddress.reference.trim().length >= 10;
    const merchantOpen = merchant?.status === 'open' || merchant?.isOpen === true; // Handle both schemas temporarily
    const canSubmit = items.length > 0 && addressValid && merchantOpen && isOnline && !isSubmitting && !loadingMerchant;

    const applyCoupon = () => {
        if (!couponCode.trim()) return;
        setCouponError('');
        setCouponSuccess('');

        const userOrderCount = 0;
        const result = validatePromotion(couponCode, {
            userId: user?.id,
            orderTotal: subtotal,
            deliveryFee,
            merchantId,
            itemCount: items.length,
            paymentMethod,
            userOrderCount,
        });

        if (result.valid) {
            setDiscount(result.discountAmount);
            setAppliedPromo(result.promo);
            setCouponSuccess(`✅ ¡Cupón aplicado! Descuento de $${result.discountAmount}`);
        } else {
            setDiscount(0);
            setAppliedPromo(null);
            setCouponError(result.error);
        }
    };

    const handleConfirm = async () => {
        if (!canSubmit) return;

        setIsSubmitting(true);
        setSubmitError('');

        try {
            // Verify merchant is still open natively in Supabase
            const { data: freshMerchant, error: merchantError } = await supabase.from('merchants').select('status, isOpen, name').eq('id', merchantId).single();

            if (merchantError || (freshMerchant.status !== 'open' && freshMerchant.isOpen === false)) {
                setSubmitError(`Lo sentimos, el restaurante acaba de cerrar. Tu carrito se mantiene guardado.`);
                setIsSubmitting(false);
                return;
            }

            const orderPayload = {
                clientId: user?.id || user?.uid,
                merchantId,
                items,
                deliveryAddress,
                paymentMethod,
                deliveryFee,
                serviceFee,
                discount,
                notes: notes || '',
            };

            console.log("🔍 PRE-VALIDACIÓN -> UserID:", user?.id || user?.uid, " | RestaurantID:", merchantId);

            // Limpieza mágica y rápida de undefined para Firebase
            const cleanPayload = JSON.parse(JSON.stringify(orderPayload));

            console.log('🚨 AUDITORÍA DEL PAYLOAD LIMPIO (Checkout):', JSON.stringify(cleanPayload, null, 2));

            const order = await createOrder(cleanPayload);

            if (appliedPromo) {
                markPromoUsed(appliedPromo.id, user.id);
            }
            clearCart();
            navigate(`/tracking/${order.id}`);
        } catch (err) {
            console.error('🔥 ERROR CRÍTICO AL CREAR PEDIDO:', err);
            if (err.code) {
                console.error('➡️ Código de error de Firebase:', err.code);
            }
            if (err.message) {
                console.error('➡️ Mensaje de error:', err.message);
            }

            setSubmitError(`Error técnico (${err.code || 'Desconocido'}): Revisa la consola.`);
            setIsSubmitting(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="app-container">
                <div className="page-header">
                    <button className="btn btn-icon btn-ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1>Tu carrito</h1>
                </div>
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <span style={{ fontSize: 64, display: 'block', marginBottom: 16 }}>🛒</span>
                    <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Tu carrito está vacío</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>¡Agrega algo delicioso!</p>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>Ver restaurantes</button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div className="page-header">
                <button className="btn btn-icon btn-ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Tu pedido</h1>
            </div>

            {/* Offline Banner */}
            {!isOnline && (
                <div style={{
                    background: '#fef2f2', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8,
                    color: '#991b1b', fontSize: '0.85rem', fontWeight: 600,
                }}>
                    <WifiOff size={16} />
                    Sin conexión a internet. Reconecta para confirmar tu pedido.
                </div>
            )}

            {/* Merchant Closed Warning */}
            {!merchantOpen && (
                <div style={{
                    background: '#fffbeb', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8,
                    color: '#92400e', fontSize: '0.85rem', fontWeight: 600,
                }}>
                    <AlertTriangle size={16} />
                    {merchant?.name} cerró. Tu carrito se guardará.
                </div>
            )}

            <div style={{ padding: 16, paddingBottom: 100 }}>
                {/* Merchant name */}
                {merchant && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <img src={merchant.logoUrl} alt={merchant.name}
                            style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                        <div>
                            <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{merchant.name}</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{merchant.deliveryTime} min</span>
                        </div>
                    </div>
                )}

                {/* Cart Items */}
                <div style={{ marginBottom: 24 }}>
                    {items.map((item, index) => (
                        <div key={index} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '14px 0', borderBottom: '1px solid var(--color-border-light)'
                        }}>
                            <img src={item.imageUrl || item.image} alt={item.name}
                                style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</h4>
                                {/* Show modifiers */}
                                {item.modifiers?.length > 0 && item.modifiers.map((mod, mi) => (
                                    mod.selected?.length > 0 && (
                                        <p key={mi} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                            {mod.groupName}: {mod.selected.map(s => s.name).join(', ')}
                                        </p>
                                    )
                                ))}
                                {/* Legacy extras */}
                                {item.selectedExtras?.length > 0 && (
                                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                        + {item.selectedExtras.map(e => e.name).join(', ')}
                                    </p>
                                )}
                                {/* Removed ingredients */}
                                {item.removedIngredients?.length > 0 && (
                                    <p style={{ fontSize: '0.7rem', color: '#ef4444' }}>
                                        Sin: {item.removedIngredients.join(', ')}
                                    </p>
                                )}
                                {item.notes && (
                                    <p style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontStyle: 'italic' }}>"{item.notes}"</p>
                                )}
                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>${getItemTotal(item).toFixed(0)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="qty-selector">
                                    <button className="qty-btn" onClick={() => updateQuantity(index, -1)}>
                                        <Minus size={14} />
                                    </button>
                                    <span className="qty-value" style={{ fontSize: '0.875rem' }}>{item.quantity}</span>
                                    <button className="qty-btn" onClick={() => updateQuantity(index, 1)}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <button className="btn btn-icon btn-ghost" onClick={() => removeItem(index)} style={{ width: 32, height: 32 }}>
                                    <Trash2 size={16} color="var(--color-error)" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Notes */}
                <div className="form-group">
                    <label className="form-label">Notas para el restaurante</label>
                    <textarea className="form-input form-textarea" placeholder="Instrucciones especiales..."
                        value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>

                {/* ═══ Delivery Address ═══ */}
                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>📍 Dirección de entrega</h3>
                {!showAddressEdit && deliveryAddress.street ? (
                    <div style={{
                        background: 'var(--color-border-light)', borderRadius: 12, padding: 16, marginBottom: 20,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 10,
                                background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <MapPin size={18} color="var(--color-primary)" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{deliveryAddress.street}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    {deliveryAddress.colony}
                                </p>
                                {deliveryAddress.reference && (
                                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                                        📝 {deliveryAddress.reference}
                                    </p>
                                )}
                            </div>
                            <button className="btn btn-sm btn-ghost" onClick={() => setShowAddressEdit(true)} style={{ flexShrink: 0 }}>
                                <Edit3 size={14} /> Editar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        background: 'var(--color-border-light)', borderRadius: 12, padding: 16, marginBottom: 20,
                    }}>
                        <div className="form-group">
                            <label className="form-label">Calle y número *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ej: Calle Hidalgo #5"
                                value={deliveryAddress.street}
                                onChange={e => setDeliveryAddress(prev => ({ ...prev, street: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Colonia</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ej: Centro"
                                value={deliveryAddress.colony}
                                onChange={e => setDeliveryAddress(prev => ({ ...prev, colony: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                Referencia *
                                <span style={{
                                    fontSize: '0.65rem', color: deliveryAddress.reference.length >= 10 ? 'var(--color-success)' : '#ef4444',
                                    fontWeight: 400,
                                }}>
                                    ({deliveryAddress.reference.length}/10 mín.)
                                </span>
                            </label>
                            <textarea
                                className="form-input form-textarea"
                                placeholder="Ej: Casa con portón azul, junto a la papelería"
                                value={deliveryAddress.reference}
                                onChange={e => setDeliveryAddress(prev => ({ ...prev, reference: e.target.value }))}
                                rows={2}
                                style={{
                                    borderColor: deliveryAddress.reference.length > 0 && deliveryAddress.reference.length < 10
                                        ? '#ef4444' : undefined,
                                }}
                            />
                            {deliveryAddress.reference.length > 0 && deliveryAddress.reference.length < 10 && (
                                <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: 4 }}>
                                    Escribe al menos 10 caracteres para que el repartidor te encuentre
                                </p>
                            )}
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Teléfono de contacto</label>
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="757 123 4567"
                                value={deliveryAddress.phone}
                                onChange={e => setDeliveryAddress(prev => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>
                        {deliveryAddress.street.trim().length >= 3 && (
                            <button
                                className="btn btn-sm btn-secondary"
                                style={{ marginTop: 12 }}
                                onClick={() => setShowAddressEdit(false)}
                            >
                                ✓ Guardar dirección
                            </button>
                        )}
                    </div>
                )}

                {/* Weather & ETA */}
                <WeatherBanner />
                <MerchantLoadBadge merchantId={merchantId} showDetails={true} style={{ marginBottom: 16 }} />
                <SmartETADisplay
                    merchantId={merchantId}
                    deliveryAddress={deliveryAddress}
                    style={{ marginBottom: 20 }}
                />

                {/* Payment Method */}
                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Método de pago</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: 16,
                        border: `2px solid ${paymentMethod === 'cash' ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
                        borderRadius: 12, cursor: 'pointer',
                        background: paymentMethod === 'cash' ? 'var(--color-primary-bg)' : 'white',
                    }}>
                        <input type="radio" name="payment" value="cash"
                            checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')}
                            style={{ accentColor: 'var(--color-primary)' }} />
                        <Banknote size={20} color="var(--color-success)" />
                        <div>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Efectivo</span>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Paga al recibir tu pedido</p>
                        </div>
                    </label>

                    <label style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: 16,
                        border: `2px solid ${paymentMethod === 'mercadopago' ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
                        borderRadius: 12, cursor: 'pointer',
                        background: paymentMethod === 'mercadopago' ? 'var(--color-primary-bg)' : 'white',
                    }}>
                        <input type="radio" name="payment" value="mercadopago"
                            checked={paymentMethod === 'mercadopago'} onChange={() => setPaymentMethod('mercadopago')}
                            style={{ accentColor: 'var(--color-primary)' }} />
                        <CreditCard size={20} color="var(--color-info)" />
                        <div>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Mercado Pago</span>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Paga con tarjeta o saldo</p>
                        </div>
                    </label>
                </div>

                {/* Coupon */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Tag size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input className="form-input" placeholder="Código de cupón"
                            value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                            style={{ paddingLeft: 36 }} />
                    </div>
                    <button className="btn btn-secondary" onClick={applyCoupon}>Aplicar</button>
                </div>
                {couponError && (
                    <p style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: -16, marginBottom: 16 }}>{couponError}</p>
                )}
                {couponSuccess && (
                    <p style={{ color: 'var(--color-success)', fontSize: '0.8rem', marginTop: -16, marginBottom: 16 }}>{couponSuccess}</p>
                )}

                {/* Summary */}
                <div style={{
                    background: 'var(--color-border-light)', borderRadius: 12, padding: 20, marginBottom: 24,
                }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Resumen del pedido</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
                        <span style={{ fontWeight: 600 }}>${subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Envío</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {weatherSurcharge > 0 && (
                                <span style={{ fontSize: '0.7rem', color: '#1e40af', background: '#dbeafe', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                                    {weather?.condition?.icon} +${weatherSurcharge}
                                </span>
                            )}
                            <span style={{ fontWeight: 600 }}>${deliveryFee.toFixed(2)}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Servicio</span>
                        <span style={{ fontWeight: 600 }}>${serviceFee.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.875rem', color: 'var(--color-success)' }}>
                            <span>Descuento</span>
                            <span style={{ fontWeight: 600 }}>-${discount.toFixed(2)}</span>
                        </div>
                    )}
                    <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 12, marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Total</span>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary)' }}>${total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Validation errors */}
                {!addressValid && deliveryAddress.street.length > 0 && (
                    <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#991b1b' }}>
                        <AlertTriangle size={14} />
                        Agrega una referencia de al menos 10 caracteres para continuar
                    </div>
                )}

                {submitError && (
                    <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#991b1b' }}>
                        <AlertTriangle size={14} />
                        {submitError}
                    </div>
                )}

                {/* Confirm Button */}
                <button
                    className="btn btn-primary btn-block btn-lg"
                    onClick={handleConfirm}
                    disabled={!canSubmit}
                    style={{ opacity: canSubmit ? 1 : 0.5 }}
                >
                    {isSubmitting ? (
                        <span>Procesando...</span>
                    ) : (
                        <span>{paymentMethod === 'cash' ? '💵' : '💳'} Confirmar Pedido — ${total.toFixed(2)}</span>
                    )}
                </button>
            </div>
        </div>
    );
}
