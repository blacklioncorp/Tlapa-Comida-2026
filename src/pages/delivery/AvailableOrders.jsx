import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { useSmartDelivery } from '../../contexts/SmartDeliveryContext';
import { supabase } from '../../supabase';
import { haversineDistance, calculateOrderPriority } from '../../services/SmartOrderManager';
import { TLAPA_CENTER } from '../../services/MapsCache';
import { MapPin, Navigation, Star, CheckCircle, Power, User, History, Wallet, Store, Utensils } from 'lucide-react';
import DriverLocationMap from '../../components/DriverLocationMap';

export default function AvailableOrders() {
    const { user, logout } = useAuth(); // Keeping logout for fallback or profile logic elsewhere
    const { orders, acceptOrder } = useOrders();
    const { weather, isRaining } = useSmartDelivery();
    const navigate = useNavigate();

    // Radar logic for incoming orders
    const [radarOrders, setRadarOrders] = useState([]);

    const [isOnline, setIsOnline] = useState(() => {
        try {
            const saved = localStorage.getItem('tlapa_driver_online_' + user?.id);
            return saved !== null ? JSON.parse(saved) : true;
        } catch { return true; }
    });

    useEffect(() => {
        if (!user || user.isBlockedDueToCash) return;

        const fetchIncoming = async () => {
            const { data, error } = await supabase.from('orders')
                .select('*, merchant:merchants(*)')
                .eq('status', 'searching_driver');

            if (error) {
                console.error("Error fetching radar orders:", error);
                return;
            }

            setRadarOrders(prev => {
                const incomingOrders = data || [];
                if (incomingOrders.length > prev.length && isOnline) {
                    try {
                        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                        const audio = new Audio('/notification-sound.mp3');
                        audio.play().catch(e => console.warn("Auto-play prevented", e));
                    } catch (e) { }
                }
                return incomingOrders;
            });
        };

        fetchIncoming();

        const subscription = supabase.channel(`public:orders:radar:${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
                // Either new searching_driver, or an order got accepted by someone else and changed status
                fetchIncoming();
            })
            .subscribe((status, err) => {
                if (err) console.warn('[AvailableOrders] Supabase sync error:', err);
            });

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user, isOnline]);

    const toggleOnline = () => {
        const newVal = !isOnline;
        setIsOnline(newVal);
        localStorage.setItem('tlapa_driver_online_' + user.id, JSON.stringify(newVal));
    };

    const myActiveOrder = orders.find(o => o.driverId === user.id && !['delivered', 'cancelled'].includes(o.status));
    const todayEarnings = orders
        .filter(o => o.driverId === user.id && o.status === 'delivered')
        .reduce((sum, o) => sum + (o.totals.deliveryFee || 0), 0);
    const todayDeliveries = orders.filter(o => o.driverId === user.id && o.status === 'delivered').length;

    let initialLocation = user.currentLocation;
    try {
        const saved = localStorage.getItem('tlapa_driver_locations');
        if (saved) {
            const locs = JSON.parse(saved);
            if (locs[user.id]) initialLocation = locs[user.id];
        }
    } catch { }

    const [liveLocation, setLiveLocation] = useState(initialLocation);

    const requestGps = () => {
        if (!navigator.geolocation) {
            alert('Tu navegador no soporta geolocalización.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                setLiveLocation(pos);
                // Opcionalmente guardar localmente
                try {
                    const locs = JSON.parse(localStorage.getItem('tlapa_driver_locations') || '{}');
                    locs[user.id] = pos;
                    localStorage.setItem('tlapa_driver_locations', JSON.stringify(locs));
                } catch { }
            },
            (error) => {
                let msg = 'Error desconocido obteniendo ubicación.';
                if (error.code === 1) msg = 'Permiso de ubicación denegado. Por favor, habilítalo en la configuración de la app o navegador.';
                if (error.code === 2) msg = 'Ubicación no disponible en este momento.';
                if (error.code === 3) msg = 'Tiempo de espera agotado al buscar ubicación.';
                alert(msg);
                console.warn('GPS Error:', error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const enrichedOrders = radarOrders.map(order => {
        const merchant = order.merchant;
        let distanceKm = null;
        if (liveLocation && merchant?.location) {
            distanceKm = haversineDistance(
                liveLocation.lat, liveLocation.lng,
                merchant.location.lat, merchant.location.lng
            );
        }
        const priority = calculateOrderPriority(order);
        return { ...order, merchant, distanceKm, priority };
    }).sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) {
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
            alert(error.message);
        }
    };

    return (
        <div className="app-container" style={{ padding: 0, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Background Map - Full screen */}
            <div className="fullscreen-map-container" style={{ zIndex: 0 }}>
                <DriverLocationMap driverLocation={liveLocation || TLAPA_CENTER} height="100vh" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(230,230,220,0.9) 0%, rgba(240,240,230,0.7) 30%, transparent 60%, rgba(255,255,255,0.95) 80%)', pointerEvents: 'none' }} />
            </div>

            {/* Top foreground layer */}
            <div style={{ position: 'relative', zIndex: 2, padding: '24px 16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {/* Header Profile & Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'white', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'Driver'}&background=random`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Bienvenido</p>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Hola, {user.displayName?.split(' ')[0] || 'Carlos M.'}</h2>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={logout} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 36, height: 36, borderRadius: '50%', border: 'none',
                            background: 'white', color: '#ef4444',
                            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }} title="Cerrar sesión">
                            <Power size={18} />
                        </button>
                        <button onClick={toggleOnline} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 20, border: 'none',
                            background: isOnline ? '#10b981' : '#ef4444', color: 'white',
                            fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
                            {isOnline ? 'EN LÍNEA' : 'OFFLINE'}
                        </button>
                    </div>
                </div>

                {/* Earnings Widget */}
                {isOnline && (
                    <div style={{
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        borderRadius: 24, padding: 24, color: 'white',
                        boxShadow: '0 10px 25px rgba(234,88,12,0.3)',
                        position: 'relative', overflow: 'hidden',
                        marginBottom: 32, flexShrink: 0
                    }}>
                        {/* Decorative circle */}
                        <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: '0.9rem', fontWeight: 500, opacity: 0.9, marginBottom: 4 }}>Ganancias de Hoy</p>
                                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>${todayEarnings.toFixed(2)}</h1>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ background: 'rgba(255,255,255,0.2)', width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', marginBottom: 8, backdropFilter: 'blur(4px)' }}>
                                    <Wallet size={24} color="white" />
                                </div>
                                <p style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{todayDeliveries} Pedidos Finalizados</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Center Map Locator Button */}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                    <button onClick={requestGps} style={{ width: 48, height: 48, borderRadius: 16, background: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Navigation size={24} color="#334155" />
                    </button>
                </div>
            </div>

            {/* Bottom Sheet for Orders */}
            <div style={{
                position: 'relative', zIndex: 3,
                background: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32,
                padding: '24px 24px 100px', flex: '0 0 auto',
                boxShadow: '0 -8px 30px rgba(0,0,0,0.06)'
            }}>
                <div style={{ width: 40, height: 5, background: '#cbd5e1', borderRadius: 3, margin: '0 auto 20px' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Pedidos Disponibles</h3>
                    {enrichedOrders.length > 0 && isOnline && (
                        <span style={{ background: '#ffedd5', color: '#ea580c', padding: '4px 12px', borderRadius: 16, fontSize: '0.8rem', fontWeight: 700 }}>
                            {enrichedOrders.length} Nuevos
                        </span>
                    )}
                </div>

                {!isOnline ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                        <p style={{ fontWeight: 600 }}>Estás fuera de línea</p>
                    </div>
                ) : myActiveOrder ? (
                    <div className="card" style={{ border: '2px solid var(--color-primary)', cursor: 'pointer' }} onClick={() => navigate(`/delivery/active/${myActiveOrder.id}`)}>
                        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Navigation size={20} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Entrega Activa</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{myActiveOrder.orderNumber}</p>
                            </div>
                            <span style={{ fontWeight: 700 }}>Ver →</span>
                        </div>
                    </div>
                ) : enrichedOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 32, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Star size={32} color="#cbd5e1" />
                        </div>
                        <p style={{ fontWeight: 600 }}>Buscando pedidos cercanos...</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {enrichedOrders.map((order, idx) => (
                            <div key={order.id} style={{
                                background: 'white', border: '1px solid #f1f5f9', borderRadius: 24, padding: 20,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 16, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {idx % 2 === 0 ? <Store size={24} color="#ea580c" /> : <Utensils size={24} color="#ea580c" />}
                                        </div>
                                        <div>
                                            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', margin: 0 }}>{order.merchant?.name}</h4>
                                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Restaurante • {order.distanceKm ? order.distanceKm.toFixed(1) : '?'} km</p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ea580c', margin: 0 }}>${(order.totals.deliveryFee + (isRaining ? weather?.condition?.deliverySurcharge || 0 : 0)).toFixed(2)}</h3>
                                        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>TU PAGO</p>
                                    </div>
                                </div>

                                {/* Logistics Origin/Dest */}
                                <div style={{ position: 'relative', paddingLeft: 12, marginBottom: 20 }}>
                                    {/* Line connecting points */}
                                    <div style={{ position: 'absolute', left: 4, top: 8, bottom: 8, width: 2, background: '#e2e8f0' }} />

                                    <div style={{ position: 'relative', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ position: 'absolute', left: -11, width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1', border: '2px solid white', boxSizing: 'content-box' }} />
                                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Origen: <span style={{ color: '#0f172a', fontWeight: 600 }}>{order.merchant?.address?.street || 'Local'}</span></p>
                                    </div>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ position: 'absolute', left: -11, width: 8, height: 8, borderRadius: '50%', background: '#ea580c', border: '2px solid white', boxSizing: 'content-box' }} />
                                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Destino: <span style={{ color: '#0f172a', fontWeight: 600 }}>{order.deliveryAddress?.colony || order.deliveryAddress?.street || 'Centro'}</span></p>
                                    </div>
                                </div>

                                <button onClick={() => handleAccept(order.id)} style={{
                                    width: '100%', background: '#ea580c', color: 'white', padding: 16, borderRadius: 16,
                                    border: 'none', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(234,88,12,0.2)', transition: 'transform 0.1s'
                                }}
                                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                    <CheckCircle size={20} />
                                    ACEPTAR PEDIDO
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Nav */}
            <nav className="bottom-nav">
                <button className="bottom-nav-item active">
                    <MapPin size={22} style={{ marginBottom: 4 }} />
                    MAPA
                </button>
                <button className="bottom-nav-item" onClick={() => navigate('/delivery/history')}>
                    <History size={22} style={{ marginBottom: 4 }} />
                    HISTORIAL
                </button>
                <button className="bottom-nav-item" onClick={() => navigate('/delivery/wallet')}>
                    <Wallet size={22} style={{ marginBottom: 4 }} />
                    CARTERA
                </button>
                <button className="bottom-nav-item" onClick={() => navigate('/profile')}>
                    <User size={22} style={{ marginBottom: 4 }} />
                    PERFIL
                </button>
            </nav>
        </div>
    );
}
