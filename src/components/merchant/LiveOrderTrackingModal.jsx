import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';
import { importLibrary, isApiKeyConfigured } from '../../services/GoogleMapsLoader';
import { MapPin, Navigation, X } from 'lucide-react';
import { getMerchantCoords } from '../../services/MapsCache';

export default function LiveOrderTrackingModal({ order, onClose }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const driverMarkerRef = useRef(null);
    
    // Polyline reference if we draw straight lines
    const lineRef = useRef(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [driverLocation, setDriverLocation] = useState(null);
    const [driverContact, setDriverContact] = useState({ name: 'Repartidor', phone: '' });

    const merchantCoords = getMerchantCoords(order.merchantId);
    const deliveryCoords = order.deliveryAddress?.lat && order.deliveryAddress?.lng 
        ? { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng } 
        : null;

    // 1. Initial Data Fetch (Driver info + last known location)
    useEffect(() => {
        if (!order.driverId) return;

        const fetchDriverInfo = async () => {
            const { data, error } = await supabase
                .from('users')
                .select('displayName, phone, currentLocation')
                .eq('id', order.driverId)
                .single();
            
            if (data) {
                setDriverContact({ name: data.displayName || 'Repartidor', phone: data.phone || '' });
                if (data.currentLocation) {
                    setDriverLocation(data.currentLocation);
                }
            }
        };

        fetchDriverInfo();

        // 2. Subscribe to driver location updates
        const channel = supabase.channel(`tracking-map-${order.id}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'users',
                filter: `id=eq.${order.driverId}`
            }, payload => {
                if (payload.new?.currentLocation) {
                    setDriverLocation(payload.new.currentLocation);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [order.driverId, order.id]);

    // 3. Initialize Map
    const initMap = useCallback(async () => {
        if (!isApiKeyConfigured() || !mapContainerRef.current) {
            setLoadError(true);
            return;
        }

        try {
            const { Map } = await importLibrary('maps');
            const { AdvancedMarkerElement } = await importLibrary('marker');

            // Find center
            const center = driverLocation || merchantCoords || { lat: 17.5456, lng: -98.5772 }; // Tlapa default

            const map = new Map(mapContainerRef.current, {
                center,
                zoom: 15,
                mapId: 'MERCHANT_TRACKING_MAP',
                disableDefaultUI: true,
                zoomControl: true,
            });

            mapRef.current = map;

            // -- Merchant Pin --
            if (merchantCoords) {
                const restPin = document.createElement('div');
                restPin.innerHTML = '🏪';
                restPin.style.fontSize = '24px';
                new AdvancedMarkerElement({ map, position: merchantCoords, content: restPin, title: 'Tu Comercio' });
            }

            // -- Customer Pin --
            if (deliveryCoords) {
                const custPin = document.createElement('div');
                custPin.innerHTML = '📍';
                custPin.style.fontSize = '24px';
                new AdvancedMarkerElement({ map, position: deliveryCoords, content: custPin, title: 'Cliente' });
            }

            // Fit bounds perfectly around merchants, clients, and driver
            const bounds = new window.google.maps.LatLngBounds();
            if (merchantCoords) bounds.extend(merchantCoords);
            if (deliveryCoords) bounds.extend(deliveryCoords);
            if (driverLocation) bounds.extend(driverLocation);
            map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });

            setIsLoaded(true);
        } catch (err) {
            console.error('[LiveTracking] Error:', err);
            setLoadError(true);
        }
    }, []); // Run basically once, we'll update markers manually

    useEffect(() => {
        initMap();
    }, [initMap]);

    // 4. Update Driver Marker smoothly when coordinate changes
    useEffect(() => {
        if (!isLoaded || !mapRef.current || !driverLocation) return;

        const updateDriver = async () => {
            if (!driverMarkerRef.current) {
                // Create marker for first time
                const { AdvancedMarkerElement } = await importLibrary('marker');
                const driverEl = document.createElement('div');
                driverEl.innerHTML = '🛵';
                driverEl.style.fontSize = '32px';
                driverEl.style.filter = 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))';
                driverEl.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'; // CSS Smooth transition

                driverMarkerRef.current = new AdvancedMarkerElement({
                    map: mapRef.current,
                    position: driverLocation,
                    content: driverEl,
                    title: driverContact.name,
                    zIndex: 9999
                });
            } else {
                // Update existing marker's position
                driverMarkerRef.current.position = driverLocation;
            }
        };

        updateDriver();
    }, [driverLocation, isLoaded, driverContact.name]);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', p: 16
        }}>
            <div style={{
                background: 'white', borderRadius: 24, width: '100%', maxWidth: 700,
                display: 'flex', flexDirection: 'column', height: '80vh', maxHeight: 800,
                overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                            Rastreo en Vivo <span style={{ color: 'var(--color-primary)' }}>{order.orderNumber}</span>
                        </h3>
                        {driverContact.name && (
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                Repartidor: {driverContact.name} {driverContact.phone && `• ${driverContact.phone}`}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={20} color="#64748b" />
                    </button>
                </div>

                {/* Map Area */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
                    
                    {loadError && (
                        <div style={{ position: 'absolute', inset: 0, background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 48, marginBottom: 16 }}>🗺️</span>
                            <h4 style={{ margin: 0, color: '#475569' }}>Mapa no disponible</h4>
                        </div>
                    )}
                    
                    {!isLoaded && !loadError && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="spinner" />
                        </div>
                    )}

                    {/* Overlay Status Badge */}
                    <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '12px 24px', borderRadius: 32, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        {driverLocation ? (
                            <>
                                <div style={{ width: 12, height: 12, borderRadius: 6, background: '#10b981', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)' }} />
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Señal GPS Activa</span>
                            </>
                        ) : (
                            <>
                                <div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#f59e0b' }} />
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Buscando señal del repartidor...</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
