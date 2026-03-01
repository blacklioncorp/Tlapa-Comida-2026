import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { importLibrary, isApiKeyConfigured } from '../services/GoogleMapsLoader';
import { TLAPA_CENTER } from '../services/MapsCache';

export default function AdminLiveMap({ height = '400px' }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef({}); // { driverId: marker }
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);

    // Initial Map Setup
    useEffect(() => {
        const init = async () => {
            if (!isApiKeyConfigured() || !mapContainerRef.current) {
                setLoadError(true);
                return;
            }

            try {
                const { Map } = await importLibrary('maps');

                const map = new Map(mapContainerRef.current, {
                    center: TLAPA_CENTER,
                    zoom: 14,
                    mapId: 'ADMIN_LIVE_MAP',
                    disableDefaultUI: false,
                    zoomControl: true,
                });

                mapRef.current = map;
                setIsLoaded(true);
            } catch (err) {
                console.error('[AdminLiveMap] Init error:', err);
                setLoadError(true);
            }
        };
        init();
    }, []);

    // Drivers Sync Logic
    useEffect(() => {
        if (!isLoaded || !mapRef.current) return;

        let active = true;

        const setupMarkers = async () => {
            try {
                const { AdvancedMarkerElement } = await importLibrary('marker');

                const updateMarkers = (drivers) => {
                    if (!active || !mapRef.current) return;

                    // Remove markers for drivers not in the list or offline
                    const driverIds = new Set(drivers.filter(d => d.isOnline).map(d => d.id));
                    Object.keys(markersRef.current).forEach(id => {
                        if (!driverIds.has(id)) {
                            markersRef.current[id].map = null;
                            delete markersRef.current[id];
                        }
                    });

                    // Update or Add markers for online drivers
                    drivers.filter(d => d.isOnline && d.currentLocation).forEach(d => {
                        const loc = d.currentLocation;
                        if (markersRef.current[d.id]) {
                            markersRef.current[d.id].position = loc;
                        } else {
                            const pinEl = document.createElement('div');
                            pinEl.innerHTML = '🛵';
                            pinEl.style.fontSize = '24px';
                            pinEl.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

                            const marker = new AdvancedMarkerElement({
                                map: mapRef.current,
                                position: loc,
                                content: pinEl,
                                title: `Repartidor: ${d.displayName || d.name || d.email}`
                            });
                            markersRef.current[d.id] = marker;
                        }
                    });
                };

                const fetchAndSync = async () => {
                    const { data } = await supabase.from('users').select('*').eq('role', 'driver');
                    if (data) updateMarkers(data);
                };

                fetchAndSync();

                // Realtime sync for driver locations/status
                const channel = supabase.channel('admin:map-sync')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: 'role=eq.driver' }, () => {
                        fetchAndSync();
                    })
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };

            } catch (err) {
                console.error('[AdminLiveMap] Markers setup error:', err);
            }
        };

        const cleanupPromise = setupMarkers();

        return () => {
            active = false;
            cleanupPromise.then(cleanup => cleanup && cleanup());
        };
    }, [isLoaded]);

    if (loadError || !isApiKeyConfigured()) {
        return (
            <div style={{ height, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>
                <p style={{ color: 'var(--color-text-muted)' }}>No se pudo cargar Google Maps. Verifica la API KEY.</p>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', height, borderRadius: 16, overflow: 'hidden' }}>
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
            {!isLoaded && (
                <div style={{ position: 'absolute', inset: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" />
                </div>
            )}
        </div>
    );
}
