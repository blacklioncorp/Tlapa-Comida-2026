import { useState, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Basic Haversine formula to calculate distance between two lat/lng coordinates in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c; // Distance in km
}

export default function SmartLocationWarning({ onModifyAddress }) {
    const { user } = useAuth();
    const [showWarning, setShowWarning] = useState(false);
    const [currentPos, setCurrentPos] = useState(null);

    useEffect(() => {
        // If the user has a saved address with coordinates
        const primaryAddress = user?.savedAddresses?.[0];
        
        if (primaryAddress && primaryAddress.lat && primaryAddress.lng) {
            // Check if we haven't already dismissed the warning this session
            const hasDismissed = sessionStorage.getItem('tlapa_dismissed_location_warning');
            if (hasDismissed) return;

            // Get current device location
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        setCurrentPos({ lat: latitude, lng: longitude });

                        const dist = calculateDistance(
                            latitude, 
                            longitude, 
                            primaryAddress.lat, 
                            primaryAddress.lng
                        );

                        // If distance is greater than 2km, show warning
                        if (dist > 2) {
                            setShowWarning(true);
                        }
                    },
                    (error) => {
                        console.warn("Geolocation warning error:", error);
                    },
                    { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
                );
            }
        }
    }, [user]);

    if (!showWarning) return null;

    const handleDismiss = () => {
        setShowWarning(false);
        sessionStorage.setItem('tlapa_dismissed_location_warning', 'true');
    };

    return (
        <div style={{
            position: 'absolute',
            top: 60, // Positioned right below the address header
            left: 16,
            right: 16,
            backgroundColor: '#2e3338',
            color: 'white',
            borderRadius: 12,
            padding: '16px',
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 100, // Make sure it sits above the carousel/content
            animation: 'slideDown 0.3s ease-out',
        }}>
            <style>{`
                @keyframes slideDown {
                    from { transform: translateY(-10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div style={{ background: 'rgba(238, 101, 43, 0.2)', padding: 10, borderRadius: '50%', color: '#ee652b' }}>
                <MapPin size={24} />
            </div>

            <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.4, margin: '0 0 12px' }}>
                    Tu ubicación actual está lejos de la dirección guardada anterior.<br/> 
                    ¿Quieres modificarla de nuevo?
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                        onClick={() => {
                            setShowWarning(false);
                            onModifyAddress();
                        }}
                        style={{
                            background: '#ee652b',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: 100,
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Modificar
                    </button>
                    <button 
                        onClick={handleDismiss}
                        style={{
                            background: 'transparent',
                            color: '#ccc',
                            border: '1px solid #666',
                            padding: '8px 16px',
                            borderRadius: 100,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Ignorar
                    </button>
                </div>
            </div>

            <button 
                onClick={handleDismiss} 
                style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#999', 
                    cursor: 'pointer',
                    padding: 0
                }}
            >
                <X size={20} />
            </button>

        </div>
    );
}
