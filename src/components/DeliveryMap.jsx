/**
 * DeliveryMap — Reusable Google Map component for delivery tracking
 * 
 * Shows:
 *  - A Google Map centered on Tlapa de Comonfort
 *  - Restaurant marker (red pin)
 *  - Delivery destination marker (green pin)
 *  - Route polyline between them (decoded from Routes API)
 *  - Animated driver marker when delivery is "on_the_way"
 * 
 * Falls back to a styled static placeholder when the API key
 * is not configured, so the app never breaks.
 * 
 * Uses MapsCache for aggressive caching of routes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { importLibrary, isApiKeyConfigured } from '../services/GoogleMapsLoader';
import {
    getMerchantCoords,
    getDefaultDeliveryCoords,
    getCachedRoute,
    setCachedRoute,
    deduplicatedRequest,
    TLAPA_CENTER
} from '../services/MapsCache';
import { Navigation, MapPin } from 'lucide-react';

export default function DeliveryMap({
    merchantId,
    deliveryAddress,
    orderStatus = 'paid',
    height = 220,
    showNavigateButton = false,
    style = {},
}) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const polylineRef = useRef(null);
    const driverMarkerRef = useRef(null);
    const animFrameRef = useRef(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [routeInfo, setRouteInfo] = useState(null);

    const merchantCoords = getMerchantCoords(merchantId);
    const deliveryCoords = deliveryAddress?.lat && deliveryAddress?.lng
        ? { lat: deliveryAddress.lat, lng: deliveryAddress.lng }
        : getDefaultDeliveryCoords();

    // ── Initialize the map ──────────────────────
    const initMap = useCallback(async () => {
        if (!isApiKeyConfigured() || !mapContainerRef.current) {
            setLoadError(true);
            return;
        }

        try {
            const { Map } = await importLibrary('maps');
            const { AdvancedMarkerElement } = await importLibrary('marker');

            // Create map instance
            const map = new Map(mapContainerRef.current, {
                center: TLAPA_CENTER,
                zoom: 15,
                mapId: 'DEMO_MAP_ID',
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: 'cooperative',
                styles: [
                    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
                ],
            });

            mapRef.current = map;

            // ── Restaurant marker (red) ──
            const restaurantPin = document.createElement('div');
            restaurantPin.innerHTML = '🏪';
            restaurantPin.style.fontSize = '28px';
            restaurantPin.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

            const restaurantMarker = new AdvancedMarkerElement({
                map,
                position: merchantCoords,
                content: restaurantPin,
                title: 'Restaurante',
            });

            // ── Delivery marker (green) ──
            const deliveryPin = document.createElement('div');
            deliveryPin.innerHTML = '📍';
            deliveryPin.style.fontSize = '28px';
            deliveryPin.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

            const deliveryMarker = new AdvancedMarkerElement({
                map,
                position: deliveryCoords,
                content: deliveryPin,
                title: 'Destino de entrega',
            });

            markersRef.current = [restaurantMarker, deliveryMarker];

            // Fit bounds to show both markers
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(merchantCoords);
            bounds.extend(deliveryCoords);
            map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });

            setIsLoaded(true);

            // ── Fetch and draw route ──
            await fetchAndDrawRoute(map);

        } catch (err) {
            console.error('[DeliveryMap] Failed to initialize:', err);
            setLoadError(true);
        }
    }, [merchantId, deliveryAddress]);

    // ── Fetch route with caching ──────────────────
    const fetchAndDrawRoute = async (map) => {
        try {
            // 1. Check cache first
            let routeData = getCachedRoute(
                merchantCoords.lat, merchantCoords.lng,
                deliveryCoords.lat, deliveryCoords.lng
            );

            if (!routeData) {
                // 2. Deduplicated API call via Routes service
                const cacheKey = `route_${merchantCoords.lat}_${merchantCoords.lng}_${deliveryCoords.lat}_${deliveryCoords.lng}`;

                routeData = await deduplicatedRequest(cacheKey, async () => {
                    const { DirectionsService } = await importLibrary('routes');
                    const service = new DirectionsService();

                    const response = await service.route({
                        origin: merchantCoords,
                        destination: deliveryCoords,
                        travelMode: window.google.maps.TravelMode.DRIVING,
                    });

                    const route = response.routes[0];
                    const leg = route.legs[0];

                    const data = {
                        distance: leg.distance.text,
                        duration: leg.duration.text,
                        durationValue: leg.duration.value,
                        polylinePath: leg.steps.flatMap(step =>
                            step.path.map(p => ({ lat: p.lat(), lng: p.lng() }))
                        ),
                    };

                    // 3. Cache the result
                    setCachedRoute(
                        merchantCoords.lat, merchantCoords.lng,
                        deliveryCoords.lat, deliveryCoords.lng,
                        data
                    );

                    return data;
                });
            }

            setRouteInfo(routeData);

            // 4. Draw polyline on map
            if (routeData.polylinePath && map) {
                if (polylineRef.current) polylineRef.current.setMap(null);

                polylineRef.current = new window.google.maps.Polyline({
                    path: routeData.polylinePath,
                    geodesic: true,
                    strokeColor: '#ee652b',
                    strokeOpacity: 0.85,
                    strokeWeight: 5,
                    map,
                });
            }

            // 5. Animate driver marker if on_the_way
            if (orderStatus === 'on_the_way' && routeData.polylinePath) {
                animateDriver(map, routeData.polylinePath);
            }

        } catch (err) {
            console.warn('[DeliveryMap] Route fetch failed (using fallback):', err);
            // Fallback: draw straight line
            if (map) {
                polylineRef.current = new window.google.maps.Polyline({
                    path: [merchantCoords, deliveryCoords],
                    strokeColor: '#ee652b',
                    strokeOpacity: 0.6,
                    strokeWeight: 3,
                    strokeDasharray: [8, 4],
                    map,
                });
            }
        }
    };

    // ── Animate driver along route ──────────────
    const animateDriver = async (map, path) => {
        try {
            const { AdvancedMarkerElement } = await importLibrary('marker');

            const driverEl = document.createElement('div');
            driverEl.innerHTML = '🛵';
            driverEl.style.fontSize = '32px';
            driverEl.style.filter = 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))';
            driverEl.style.transition = 'transform 0.3s ease';

            if (driverMarkerRef.current) {
                driverMarkerRef.current.map = null;
            }

            const driverMarker = new AdvancedMarkerElement({
                map,
                position: path[0],
                content: driverEl,
                title: 'Repartidor',
                zIndex: 999,
            });

            driverMarkerRef.current = driverMarker;

            // Animate along path
            let step = 0;
            const totalSteps = path.length;
            const animate = () => {
                if (step >= totalSteps) step = 0; // loop
                driverMarker.position = path[step];
                step++;
                animFrameRef.current = setTimeout(animate, 150);
            };
            animate();

        } catch (err) {
            console.warn('[DeliveryMap] Driver animation error:', err);
        }
    };

    // ── Lifecycle ──────────────────────────────
    useEffect(() => {
        initMap();

        return () => {
            if (animFrameRef.current) clearTimeout(animFrameRef.current);
            markersRef.current.forEach(m => { if (m) m.map = null; });
            if (polylineRef.current) polylineRef.current.setMap(null);
            if (driverMarkerRef.current) driverMarkerRef.current.map = null;
        };
    }, [initMap]);

    // Update driver animation when status changes
    useEffect(() => {
        if (isLoaded && mapRef.current && routeInfo?.polylinePath) {
            if (orderStatus === 'on_the_way') {
                animateDriver(mapRef.current, routeInfo.polylinePath);
            } else {
                if (animFrameRef.current) clearTimeout(animFrameRef.current);
                if (driverMarkerRef.current) driverMarkerRef.current.map = null;
            }
        }
    }, [orderStatus, isLoaded]);

    // ── Fallback (no API key) ──────────────────
    if (loadError || !isApiKeyConfigured()) {
        return (
            <div style={{
                height, borderRadius: 16,
                background: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 50%, #60a5fa 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
                ...style,
            }}>
                {/* Decorative grid lines */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.15,
                    backgroundImage: 'linear-gradient(#1d4ed8 1px, transparent 1px), linear-gradient(90deg, #1d4ed8 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }} />

                {/* Simulated route line */}
                <svg viewBox="0 0 300 120" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <path d="M 40 90 Q 100 30 150 60 Q 200 90 260 30"
                        fill="none" stroke="#ee652b" strokeWidth="3" strokeDasharray="8 4" opacity="0.7" />
                    <circle cx="40" cy="90" r="8" fill="#ee652b" opacity="0.9" />
                    <circle cx="260" cy="30" r="8" fill="#10b981" opacity="0.9" />
                    {orderStatus === 'on_the_way' && (
                        <circle r="6" fill="#ef4444" opacity="0.9">
                            <animateMotion dur="4s" repeatCount="indefinite"
                                path="M 40 90 Q 100 30 150 60 Q 200 90 260 30" />
                        </circle>
                    )}
                </svg>

                <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <span style={{ fontSize: 40 }}>
                        {orderStatus === 'on_the_way' ? '🛵' : orderStatus === 'delivered' ? '🎉' : '🗺️'}
                    </span>
                    <p style={{ fontWeight: 600, fontSize: '0.8rem', marginTop: 8, color: '#1e3a5f' }}>
                        {orderStatus === 'delivered' ? '¡Entrega completada!' :
                            orderStatus === 'on_the_way' ? '🛵 Repartidor en camino' : 'Ruta de entrega'}
                    </p>
                    {routeInfo && (
                        <p style={{ fontSize: '0.7rem', color: '#2563EB', fontWeight: 700, marginTop: 4 }}>
                            {routeInfo.distance} · {routeInfo.duration}
                        </p>
                    )}
                </div>

                {showNavigateButton && (
                    <button className="btn btn-primary btn-sm"
                        style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${deliveryCoords.lat},${deliveryCoords.lng}&origin=${merchantCoords.lat},${merchantCoords.lng}`,
                            '_blank'
                        )}>
                        <Navigation size={14} /> Navegar
                    </button>
                )}
            </div>
        );
    }

    // ── Real Google Map ──────────────────────────
    return (
        <div style={{ position: 'relative', ...style }}>
            <div
                ref={mapContainerRef}
                style={{
                    height,
                    borderRadius: 16,
                    overflow: 'hidden',
                }}
            />

            {/* Route info overlay */}
            {routeInfo && (
                <div style={{
                    position: 'absolute', top: 10, left: 10,
                    background: 'rgba(255,255,255,0.95)', borderRadius: 10,
                    padding: '6px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: '0.75rem', fontWeight: 700,
                }}>
                    <span>📏 {routeInfo.distance}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>·</span>
                    <span>⏱️ {routeInfo.duration}</span>
                </div>
            )}

            {/* Navigate button */}
            {showNavigateButton && (
                <button className="btn btn-primary btn-sm"
                    style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${deliveryCoords.lat},${deliveryCoords.lng}&origin=${merchantCoords.lat},${merchantCoords.lng}`,
                        '_blank'
                    )}>
                    <Navigation size={14} /> Navegar
                </button>
            )}

            {/* Loading overlay */}
            {!isLoaded && (
                <div style={{
                    position: 'absolute', inset: 0, borderRadius: 16,
                    background: 'linear-gradient(135deg, #dbeafe, #93c5fd)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div className="spinner" />
                </div>
            )}
        </div>
    );
}
