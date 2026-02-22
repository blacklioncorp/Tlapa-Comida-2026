import { useState, useEffect, useRef, useCallback } from 'react';
import { importLibrary, isApiKeyConfigured } from '../services/GoogleMapsLoader';
import { TLAPA_CENTER } from '../services/MapsCache';

export default function DriverLocationMap({ driverLocation, height = 200, style = {} }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);

    const initMap = useCallback(async () => {
        if (!isApiKeyConfigured() || !mapContainerRef.current) {
            setLoadError(true);
            return;
        }

        try {
            const { Map } = await importLibrary('maps');
            const { AdvancedMarkerElement } = await importLibrary('marker');

            const initialPos = driverLocation || TLAPA_CENTER;

            const map = new Map(mapContainerRef.current, {
                center: initialPos,
                zoom: 16,
                mapId: 'DEMO_MAP_ID_DRIVER_LOC',
                disableDefaultUI: true,
                zoomControl: false,
                gestureHandling: 'greedy',
            });

            mapRef.current = map;

            const driverEl = document.createElement('div');
            driverEl.innerHTML = '🛵';
            driverEl.style.fontSize = '32px';
            driverEl.style.filter = 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))';

            const driverMarker = new AdvancedMarkerElement({
                map,
                position: initialPos,
                content: driverEl,
            });

            markerRef.current = driverMarker;
            setIsLoaded(true);
        } catch (err) {
            console.error('[DriverLocationMap] Error initializing:', err);
            setLoadError(true);
        }
    }, [driverLocation]);

    useEffect(() => {
        initMap();
        return () => {
            if (markerRef.current) markerRef.current.map = null;
        };
    }, []); // Run once

    // Update position if driverLocation changes
    useEffect(() => {
        if (isLoaded && mapRef.current && markerRef.current && driverLocation) {
            markerRef.current.position = driverLocation;
            mapRef.current.panTo(driverLocation);
        }
    }, [driverLocation, isLoaded]);

    if (loadError || !isApiKeyConfigured()) {
        return (
            <div style={{
                height, borderRadius: 16,
                background: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 50%, #60a5fa 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
                ...style,
            }}>
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.15,
                    backgroundImage: 'linear-gradient(#1d4ed8 1px, transparent 1px), linear-gradient(90deg, #1d4ed8 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }} />
                <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <span style={{ fontSize: 40 }}>📍</span>
                    <p style={{ fontWeight: 600, fontSize: '0.8rem', marginTop: 4 }}>Ubicación Actual (Estática)</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', ...style }}>
            <div
                ref={mapContainerRef}
                style={{
                    height,
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
            />
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
