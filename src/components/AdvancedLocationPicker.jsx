import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, X, Navigation, Building2, Home, Hotel, Briefcase, MapIcon, ChevronLeft, ArrowRight, Save, Camera } from 'lucide-react';
import { importLibrary, isApiKeyConfigured } from '../services/GoogleMapsLoader';
import { TLAPA_CENTER } from '../services/MapsCache';

const BUILDING_TYPES = [
    { id: 'apartment', label: 'Departamento', icon: Building2 },
    { id: 'house', label: 'Edificio residencial', icon: Home },
    { id: 'hotel', label: 'Hotel', icon: Hotel },
    { id: 'office', label: 'Oficinas', icon: Briefcase },
    { id: 'other', label: 'Otro', icon: MapIcon },
];

const DELIVERY_METHODS = [
    { id: 'door', label: 'Encontrarse en la puerta de mi habitación / casa' },
    { id: 'outside', label: 'Encontrarse fuera del edificio' },
    { id: 'reception', label: 'Encontrarse en la recepción de abajo' },
];

export default function AdvancedLocationPicker({ currentAddress, onSave, onClose }) {
    const [step, setStep] = useState(1); // 1: Map Picker, 2: Address Details
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);

    // Address State
    const [location, setLocation] = useState(currentAddress?.location || null);
    const [streetLabel, setStreetLabel] = useState(currentAddress?.street || '');
    const [colonyLabel, setColonyLabel] = useState(currentAddress?.colony || '');
    const [buildingType, setBuildingType] = useState(currentAddress?.buildingType || 'house');
    const [aptNumber, setAptNumber] = useState(currentAddress?.aptNumber || '');
    const [deliveryMethod, setDeliveryMethod] = useState(currentAddress?.deliveryMethod || 'door');
    const [deliveryNotes, setDeliveryNotes] = useState(currentAddress?.deliveryNotes || '');
    const [addressTag, setAddressTag] = useState(currentAddress?.label || 'Casa');

    // Maps Refs
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const geocoderRef = useRef(null);

    const initMap = useCallback(async () => {
        if (!isApiKeyConfigured() || !mapContainerRef.current) {
            setLoadError(true);
            return;
        }

        try {
            const { Map } = await importLibrary('maps');
            const { Geocoder } = await importLibrary('geocoding');

            geocoderRef.current = new Geocoder();

            const initialPos = location || TLAPA_CENTER;

            const map = new Map(mapContainerRef.current, {
                center: initialPos,
                zoom: 18,
                mapId: 'DEMO_MAP_ID_ADDRESS_PICKER',
                disableDefaultUI: true,
                zoomControl: false,
                gestureHandling: 'greedy', // Allow 1-finger panning on mobile
            });

            mapRef.current = map;

            // When user stops dragging, update center coordinate and reverse-geocode
            map.addListener('dragend', () => {
                const center = map.getCenter();
                const newPos = { lat: center.lat(), lng: center.lng() };
                setLocation(newPos);
                reverseGeocode(newPos);
            });

            if (!location) {
                // Try to get user's current GPS location if no address is passed
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const gpsPos = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude,
                            };
                            map.setCenter(gpsPos);
                            setLocation(gpsPos);
                            reverseGeocode(gpsPos);
                        },
                        () => {
                            // Default to Tlapa center if GPS denied
                            reverseGeocode(initialPos);
                        }
                    );
                } else {
                    reverseGeocode(initialPos);
                }
            } else {
                reverseGeocode(initialPos); // Load name for existing location
            }

            setIsLoaded(true);
        } catch (err) {
            console.error('[AdvancedLocationPicker] Error:', err);
            setLoadError(true);
        }
    }, [location]);

    useEffect(() => {
        if (step === 1) {
            initMap();
        }
    }, [step, initMap]);

    const reverseGeocode = (pos) => {
        if (!geocoderRef.current) return;
        geocoderRef.current.geocode({ location: pos }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const fullAddress = results[0].formatted_address;
                // Simple parsing for Tlapa context (very naive, usually you want address_components)
                const parts = fullAddress.split(',');
                setStreetLabel(parts[0] || '');
                setColonyLabel(parts[1]?.trim() || 'Centro');
            }
        });
    };

    const handleConfirmLocation = () => {
        if (!location) return;
        setStep(2);
    };

    const handleSave = () => {
        if (!streetLabel.trim()) return;

        const finalAddress = {
            label: addressTag,
            street: streetLabel,
            colony: colonyLabel,
            buildingType,
            aptNumber,
            deliveryMethod,
            deliveryNotes,
            location: location || TLAPA_CENTER
        };

        onSave(finalAddress);
    };

    const requestGps = () => {
        if (navigator.geolocation && mapRef.current) {
            navigator.geolocation.getCurrentPosition((position) => {
                const gpsPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                mapRef.current.panTo(gpsPos);
                setLocation(gpsPos);
                reverseGeocode(gpsPos);
            });
        }
    };

    const overlayStyle = {
        position: 'fixed', inset: 0, zIndex: 9999, background: 'white',
        display: 'flex', flexDirection: 'column'
    };

    // --- STEP 1: MAP PICKER ---
    if (step === 1) {
        return (
            <div style={overlayStyle}>
                {/* Header */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid #e2e8f0', background: 'white', zIndex: 10 }}>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex' }}>
                        <X size={24} color="#0f172a" />
                    </button>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                        {currentAddress ? 'Editar dirección' : 'Detalles de la dirección'}
                    </h2>
                </div>

                {/* Map Area */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

                    {!isLoaded && (
                        <div style={{ position: 'absolute', inset: 0, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {loadError ? <p>Error cargando el mapa</p> : <div className="spinner" />}
                        </div>
                    )}

                    {/* Fixed Center Marker Pin (Overlay on top of map) */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)', pointerEvents: 'none', zIndex: 10 }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
                            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#ee652b" />
                            <circle cx="12" cy="9" r="3" fill="white" />
                        </svg>
                    </div>

                    {/* Floating Instruction Tooltip */}
                    <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', background: '#334155', color: 'white', padding: '12px 20px', borderRadius: 24, fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', whiteSpace: 'nowrap', zIndex: 10 }}>
                        <Navigation size={18} color="#ee652b" />
                        Mueve el mapa para elegir el punto
                    </div>

                    {/* GPS Button */}
                    <button onClick={requestGps} style={{ position: 'absolute', bottom: 24, right: 24, background: 'white', border: 'none', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer', zIndex: 10 }}>
                        <Navigation size={22} color="#0f172a" />
                    </button>
                </div>

                {/* Bottom Sheet Confirm */}
                <div style={{ background: 'white', padding: '24px', borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -10px 15px -3px rgba(0,0,0,0.05)', zIndex: 10 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>Selecciona el lugar de entrega</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={16} /> {streetLabel || 'Buscando calle...'}
                    </p>

                    <button onClick={handleConfirmLocation} disabled={!isLoaded || loadError}
                        style={{ width: '100%', background: '#ee652b', color: 'white', border: 'none', padding: '16px', borderRadius: 16, fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
                        Confirmar el lugar de encuentro
                    </button>
                </div>
            </div>
        );
    }

    // --- STEP 2: ADDRESS DETAILS ---
    return (
        <div style={{ ...overlayStyle, background: '#f8fafc', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex' }}>
                    <ChevronLeft size={24} color="#0f172a" />
                </button>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Detalles de la dirección</h2>
            </div>

            <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>

                {/* Geocoded Address Readonly Card */}
                <div style={{ background: 'white', padding: '20px', borderRadius: 16, marginBottom: 24, border: '1px solid #e2e8f0', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ background: '#fffedd', padding: 12, borderRadius: '50%' }}>
                        <MapPin size={24} color="#ee652b" />
                    </div>
                    <div>
                        <input
                            value={streetLabel}
                            onChange={e => setStreetLabel(e.target.value)}
                            style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', border: 'none', outline: 'none', width: '100%', background: 'transparent', marginBottom: 4 }}
                            placeholder="Calle y Número (Ej. Calle Juárez 32)"
                        />
                        <input
                            value={colonyLabel}
                            onChange={e => setColonyLabel(e.target.value)}
                            style={{ fontSize: '0.85rem', color: '#64748b', border: 'none', outline: 'none', width: '100%', background: 'transparent' }}
                            placeholder="Colonia / Ciudad"
                        />
                    </div>
                </div>

                {/* Building Type */}
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Tipo de edificio (obligatorio)</h3>
                <div style={{ display: 'grid', gap: '8px', marginBottom: 24 }}>
                    {BUILDING_TYPES.map(type => (
                        <button key={type.id} type="button" onClick={() => setBuildingType(type.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderRadius: 12, cursor: 'pointer',
                                background: buildingType === type.id ? '#fffedd' : 'white',
                                border: `2px solid ${buildingType === type.id ? '#ee652b' : '#e2e8f0'}`,
                                transition: 'all 0.2s', textAlign: 'left'
                            }}>
                            <type.icon size={20} color={buildingType === type.id ? '#ee652b' : '#64748b'} />
                            <span style={{ fontSize: '0.95rem', fontWeight: buildingType === type.id ? 700 : 500, color: buildingType === type.id ? '#c2410c' : '#334155', flex: 1 }}>
                                {type.label}
                            </span>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${buildingType === type.id ? '#ee652b' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {buildingType === type.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ee652b' }} />}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Apt/Floor Field */}
                {(buildingType === 'apartment' || buildingType === 'office' || buildingType === 'hotel') && (
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Departamento/Suite/Piso (obligatorio)</h3>
                        <input
                            value={aptNumber}
                            onChange={e => setAptNumber(e.target.value)}
                            placeholder="Ejemplo: Número de habitación o nombre del edificio"
                            style={{ width: '100%', padding: '16px', background: 'white', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: '0.95rem', outline: 'none' }}
                        />
                    </div>
                )}

                {/* Delivery Method */}
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Método de entrega</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#e2e8f0', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
                    {DELIVERY_METHODS.map((method, i) => (
                        <button key={method.id} onClick={() => setDeliveryMethod(method.id)} style={{ background: 'white', padding: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${deliveryMethod === method.id ? '#ee652b' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {deliveryMethod === method.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ee652b' }} />}
                            </div>
                            <span style={{ fontSize: '0.95rem', color: '#334155', fontWeight: deliveryMethod === method.id ? 700 : 500 }}>
                                {method.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Delivery Notes */}
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Notas para la entrega</h3>
                <div style={{ background: '#f1f5f9', borderRadius: 16, padding: 16, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                    <textarea
                        value={deliveryNotes}
                        onChange={e => setDeliveryNotes(e.target.value)}
                        placeholder="Ejemplo: 'Llamar a la puerta, no tocar el timbre.' También puedes subir fotos (próximamente) para ayudar al repartidor."
                        rows={3}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '0.95rem', resize: 'none', color: '#334155' }}
                    />
                    <div style={{ background: 'white', display: 'inline-flex', padding: 8, borderRadius: 10, cursor: 'not-allowed', marginTop: 8, opacity: 0.5 }}>
                        <Camera size={20} color="#64748b" />
                    </div>
                </div>

                {/* Address Tag */}
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Marcar como ubicación frecuente</h3>
                <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
                    {['Casa', 'Oficina', 'Pareja', 'Otro'].map(tag => (
                        <button key={tag} onClick={() => setAddressTag(tag)}
                            style={{
                                padding: '10px 20px', borderRadius: 20, border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                                background: addressTag === tag ? '#1e293b' : 'white',
                                color: addressTag === tag ? 'white' : '#64748b',
                                border: addressTag === tag ? 'none' : '1px solid #e2e8f0'
                            }}>
                            {tag}
                        </button>
                    ))}
                </div>

            </div>

            {/* Bottom Form Submit */}
            <div style={{ position: 'sticky', bottom: 0, background: 'white', padding: '16px 24px', borderTop: '1px solid #e2e8f0', zIndex: 10, boxShadow: '0 -10px 20px -5px rgba(0,0,0,0.05)' }}>
                <button
                    onClick={handleSave}
                    disabled={!streetLabel.trim()}
                    style={{ width: '100%', background: streetLabel.trim() ? '#ee652b' : '#cbd5e1', color: 'white', border: 'none', padding: '16px', borderRadius: 16, fontSize: '1.05rem', fontWeight: 800, cursor: streetLabel.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}>
                    Guardar dirección
                </button>
            </div>

        </div>
    );
}
