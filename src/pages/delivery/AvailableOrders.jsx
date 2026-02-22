import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { useSmartDelivery } from '../../contexts/SmartDeliveryContext';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { MERCHANTS, getMerchants } from '../../data/seedData';
import { haversineDistance, distanceToMinutes, calculateOrderPriority } from '../../services/SmartOrderManager';
import { LogOut, MapPin, DollarSign, Navigation, Clock, Zap, TrendingUp, AlertTriangle, Power, Star, CheckCircle, X } from 'lucide-react';
import WeatherBanner from '../../components/WeatherBanner';
import { MerchantLoadInline } from '../../components/MerchantLoadBadge';
import DriverLocationMap from '../../components/DriverLocationMap';

const SwipeButton = ({ onAccept }) => {
    const [sliderValue, setSliderValue] = useState(0);
    const handleChange = (e) => {
        setSliderValue(e.target.value);
        if (e.target.value >= 95) onAccept();
    };
    const handleRelease = () => {
        if (sliderValue < 95) setSliderValue(0);
    };
    return (
        <div style={{
            position: 'relative', width: '100%', height: 56, background: '#10b981',
            borderRadius: 28, overflow: 'hidden', display: 'flex', alignItems: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <input
                type="range" min="0" max="100" value={sliderValue}
                onChange={handleChange}
                onMouseUp={handleRelease}
                onTouchEnd={handleRelease}
                style={{
                    WebkitAppearance: 'none', width: '100%', height: '100%', background: 'transparent',
                    position: 'absolute', zIndex: 10, cursor: 'pointer', margin: 0, opacity: 0
                }}
            />
            {/* Visual thumb */}
            <div style={{
                position: 'absolute', left: 4, top: 4, width: 48, height: 48, borderRadius: 24,
                background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: sliderValue === 0 ? 'transform 0.3s ease-out' : 'none',
                transform: `translateX(calc(${sliderValue}vw - ${sliderValue * 0.9}px))` // approximate percentage slider
            }}>
                <span style={{ fontSize: 24 }}>🛵</span>
            </div>
            {/* Background text */}
            <span style={{
                position: 'absolute', width: '100%', textAlign: 'center',
                lineHeight: '56px', color: 'white', fontWeight: 800, fontSize: '1rem',
                zIndex: 5, pointerEvents: 'none',
                opacity: 1 - (sliderValue / 100)
            }}>
                &gt;&gt; DESLIZA PARA ACEPTAR &gt;&gt;
            </span>
        </div>
    );
};

export default function AvailableOrders() {
    const { user, logout } = useAuth();
    const { orders, acceptOrder } = useOrders(); // Cambiado a acceptOrder (transaccional)
    const { weather, isRaining, getPrioritizedOrders, getMerchantLoad } = useSmartDelivery();
    const navigate = useNavigate();

    // 1. Radar en Tiempo Real (App Frontend Repartidor)
    const [radarOrders, setRadarOrders] = useState([]);
    useEffect(() => {
        // Validación crítica: solo corre si estamos autenticados y no estamos bloqueados
        if (!user || user.isBlockedDueToCash) return;

        // Query directa que el Backend Arquitect solicita: status == 'searching_driver'
        const q = query(
            collection(db, 'orders'),
            where('status', '==', 'searching_driver')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const incomingOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setRadarOrders(incomingOrders);

            // Pop-up Alert: Si llegó un nuevo pedido a esta query y estamos online
            if (incomingOrders.length > 0 && isOnline) {
                // Esto podría reproducir un sonido o vibrar (navigator.vibrate)
                console.log("🔔 [RADAR REPARTIDOR]: ¡NUEVO PEDIDO DETECTADO!");
                try {
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                    const audio = new Audio('/notification-sound.mp3'); // Asumiendo un asset
                    audio.play().catch(e => console.warn("Auto-play prevented", e));
                } catch (e) { }
            }
        });

        return () => unsubscribe();
    }, [user]);
    // Driver online/offline toggle
    const [isOnline, setIsOnline] = useState(() => {
        try {
            const saved = localStorage.getItem('tlapa_driver_online_' + user.id);
            return saved !== null ? JSON.parse(saved) : true;
        } catch { return true; }
    });

    const toggleOnline = () => {
        const newVal = !isOnline;
        setIsOnline(newVal);
        localStorage.setItem('tlapa_driver_online_' + user.id, JSON.stringify(newVal));
    };

    // Get priority-sorted available orders
    const prioritizedOrders = getPrioritizedOrders();
    const myActiveOrder = orders.find(o => o.driverId === user.id && !['delivered', 'cancelled'].includes(o.status));
    const todayEarnings = orders
        .filter(o => o.driverId === user.id && o.status === 'delivered')
        .reduce((sum, o) => sum + (o.totals.deliveryFee || 0), 0);
    const todayDeliveries = orders.filter(o => o.driverId === user.id && o.status === 'delivered').length;

    // Get driver's current location from seed data or localStorage
    let driverLocation = user.currentLocation;
    try {
        const saved = localStorage.getItem('tlapa_driver_locations');
        if (saved) {
            const locs = JSON.parse(saved);
            if (locs[user.id]) driverLocation = locs[user.id];
        }
    } catch { /* ignore */ }

    // Enrich each order from RADAR with distance info and sort by proximity + priority
    const allMerchants = getMerchants();
    const enrichedOrders = radarOrders.map(order => {
        const merchant = allMerchants.find(m => m.id === order.merchantId) || MERCHANTS.find(m => m.id === order.merchantId);
        let distanceKm = null;
        let estimatedPickupMin = null;

        if (driverLocation && merchant?.location) {
            distanceKm = haversineDistance(
                driverLocation.lat, driverLocation.lng,
                merchant.location.lat, merchant.location.lng
            );
            const vehicleType = user.driverMeta?.vehicleType || 'moto';
            estimatedPickupMin = distanceToMinutes(distanceKm, vehicleType);
        }

        const priority = calculateOrderPriority(order);
        const load = getMerchantLoad(order.merchantId);

        return {
            ...order,
            merchant,
            distanceKm,
            estimatedPickupMin,
            priority,
            merchantLoad: load,
        };
    }).sort((a, b) => {
        // Primary sort: distance (closest first)
        if (a.distanceKm !== null && b.distanceKm !== null) {
            // Weight: 60% distance, 40% priority
            const distScore = a.distanceKm - b.distanceKm;
            const prioScore = (b.priority - a.priority) / 100;
            return distScore + prioScore;
        }
        return b.priority - a.priority;
    });

    const handleAccept = async (orderId) => {
        try {
            await acceptOrder(orderId, user.id);
            navigate(`/delivery/active/${orderId}`);
        } catch (error) {
            alert(error.message); // Muestra "Este pedido ya fue tomado" u otro error
        }
    };

    return (
        <div className="app-container">
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #ee652b, #ff8a57)',
                padding: '20px 16px', color: 'white',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Hola,</p>
                        <h2 style={{ fontWeight: 800 }}>{user.displayName}</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Weather compact indicator */}
                        {weather && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                background: 'rgba(255,255,255,0.2)',
                                padding: '4px 10px', borderRadius: 16,
                                fontSize: '0.75rem', fontWeight: 600,
                            }}>
                                <span>{weather.condition.icon}</span>
                                {weather.temperature}°C
                            </div>
                        )}
                        {/* Online/Offline Toggle */}
                        <button
                            onClick={toggleOnline}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', borderRadius: 16,
                                border: 'none', cursor: 'pointer',
                                fontWeight: 700, fontSize: '0.75rem',
                                background: isOnline ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                                color: 'white',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            <Power size={14} />
                            {isOnline ? 'En Línea' : 'Fuera de Línea'}
                        </button>
                        <button className="btn btn-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }} onClick={logout}>
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Key Metrics: Rating, Acceptance, Earnings, Deliveries */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                            <Star size={14} fill="white" /> 4.9
                        </p>
                        <p style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: 4 }}>Calificación</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                            <CheckCircle size={14} /> 96%
                        </p>
                        <p style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: 4 }}>Aceptación</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                        <p style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>${todayEarnings.toFixed(0)}</p>
                        <p style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: 4 }}>Ganancias</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                        <p style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{todayDeliveries}</p>
                        <p style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: 4 }}>Entregas</p>
                    </div>
                </div>

                {/* Rain surcharge notice */}
                {isRaining && weather?.condition?.deliverySurcharge > 0 && (
                    <div style={{
                        marginTop: 12,
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.78rem',
                    }}>
                        <Zap size={14} />
                        <span>
                            <strong>Bono por lluvia:</strong> +${weather.condition.deliverySurcharge} extra por entrega
                        </span>
                    </div>
                )}
            </div>

            <div style={{ padding: 16, paddingBottom: 80 }}>
                {/* Weather Banner */}
                <WeatherBanner />

                {/* Offline Banner */}
                {!isOnline && (
                    <div style={{
                        background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
                        border: '2px solid #ef4444',
                        borderRadius: 16, padding: 24, textAlign: 'center',
                        marginBottom: 20,
                    }}>
                        <span style={{ fontSize: 48, display: 'block', marginBottom: 8 }}>😴</span>
                        <h3 style={{ fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>Estás Fuera de Línea</h3>
                        <p style={{ fontSize: '0.85rem', color: '#991b1b', marginBottom: 16 }}>
                            No recibirás pedidos hasta que te pongas en línea
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={toggleOnline}
                            style={{ background: '#16a34a', borderColor: '#16a34a' }}
                        >
                            <Power size={16} /> Ponerme en línea
                        </button>
                    </div>
                )}
                {myActiveOrder && (
                    <div
                        className="card" style={{ marginBottom: 20, border: '2px solid var(--color-primary)', cursor: 'pointer' }}
                        onClick={() => navigate(`/delivery/active/${myActiveOrder.id}`)}
                    >
                        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 12, background: 'var(--color-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Navigation size={20} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Entrega Activa</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{myActiveOrder.orderNumber}</p>
                            </div>
                            <span style={{ fontWeight: 700 }}>Ver →</span>
                        </div>
                    </div>
                )}

                {/* Map Partial Screen Component */}
                <div style={{ marginBottom: 20 }}>
                    <DriverLocationMap driverLocation={driverLocation} height={myActiveOrder ? 160 : 300} />
                </div>

                {/* Bottom Sheet Modal for Nearest Order Offer */}
                {isOnline && !myActiveOrder && enrichedOrders.length > 0 && (() => {
                    const topOrder = enrichedOrders[0];
                    const merchant = topOrder.merchant;
                    const fee = topOrder.totals.deliveryFee + (isRaining ? weather?.condition?.deliverySurcharge || 0 : 0);

                    return (
                        <div style={{
                            position: 'fixed', bottom: 0, left: 0, right: 0,
                            background: 'white', borderRadius: '32px 32px 0 0',
                            padding: '24px 24px 80px', // Extra for bottom nav
                            boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
                            zIndex: 1000,
                            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}>
                            <div style={{ width: 40, height: 5, background: '#e5e7eb', borderRadius: 3, margin: '0 auto 20px' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                <div>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        Nuevo Pedido
                                    </p>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981', margin: 0 }}>
                                        ${fee.toFixed(2)}
                                    </h2>
                                    <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                        Tarifa base + propina anticipada
                                    </p>
                                </div>
                                <div style={{
                                    background: '#fef3c7', padding: '8px 16px', borderRadius: 20, textAlign: 'center'
                                }}>
                                    <Clock size={18} color="#d97706" style={{ margin: '0 auto 4px' }} />
                                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', margin: 0 }}>
                                        {topOrder.estimatedPickupMin ? `~${topOrder.estimatedPickupMin}m` : 'Cerca'}
                                    </p>
                                </div>
                            </div>

                            {/* Logistics info */}
                            <div style={{ background: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 24 }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' }}>
                                    {/* Line connecting points */}
                                    <div style={{ position: 'absolute', left: 15, top: 24, bottom: 24, width: 2, background: '#cbd5e1' }} />

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <div style={{ background: 'white', width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #3b82f6', zIndex: 1 }}>
                                                🏪
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Recoger en</p>
                                                <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{merchant?.name}</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <div style={{ background: 'white', width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #10b981', zIndex: 1 }}>
                                                ✅
                                            </div>
                                            <div style={{ width: '100%' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregar a</p>
                                                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>{topOrder.distanceKm?.toFixed(1)} km est.</p>
                                                </div>
                                                <p style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {topOrder.deliveryAddress?.street || 'Centro, Tlapa'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <SwipeButton onAccept={() => handleAccept(topOrder.id)} />
                                <button className="btn btn-ghost" style={{ width: '100%', padding: 16, color: '#ef4444', fontWeight: 700 }} onClick={() => console.log('Rechazar pedido')}>
                                    <X size={18} style={{ marginRight: 8, display: 'inline' }} /> Rechazar Oferta
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Bottom Nav */}
            <nav className="bottom-nav">
                <button className="bottom-nav-item active">
                    <span style={{ fontSize: 20 }}>🏠</span>
                    Inicio
                </button>
                <button className="bottom-nav-item" onClick={() => navigate('/delivery/wallet')}>
                    <span style={{ fontSize: 20 }}>💰</span>
                    Billetera
                </button>
                <button className="bottom-nav-item" onClick={logout}>
                    <LogOut size={20} />
                    Salir
                </button>
            </nav>
        </div>
    );
}
