import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, X, Navigation, Building2, Home, Hotel, Briefcase, MapIcon, ChevronLeft, ArrowRight, Save, Camera, Search } from 'lucide-react';
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

// --- REUSABLE UTILITIES ---

const parseAddressDetails = (result) => {
    // result can be a Geocoder result or an Autocomplete place object
    const components = result.address_components || [];
    const streetName = components.find(c => c.types.includes('route'))?.long_name || '';
    const streetNumber = components.find(c => c.types.includes('street_number'))?.long_name || '';
    const colony = components.find(c => c.types.includes('sublocality') || c.types.includes('neighborhood'))?.long_name || '';

    // Fallback parsing if components are missing (useful for simple strings from geocoder)
    const fallbackStreet = result.formatted_address?.split(',')[0] || '';

    return {
        street: streetNumber ? `${streetName} ${streetNumber}` : streetName || fallbackStreet,
        colony: colony || 'Centro',
        full: result.formatted_address || ''
    };
};

const OptionCard = ({ item, isSelected, onSelect, icon: Icon }) => (
    <button
        type="button"
        onClick={() => onSelect(item.id)}
        style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderRadius: 12, cursor: 'pointer',
            background: isSelected ? '#fffedd' : 'white',
            border: `2px solid ${isSelected ? '#ee652b' : '#e2e8f0'}`,
            transition: 'all 0.2s', textAlign: 'left', width: '100%', marginBottom: 8
        }}
    >
        {Icon && <Icon size={20} color={isSelected ? '#ee652b' : '#64748b'} />}
        <span style={{ fontSize: '0.95rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#c2410c' : '#334155', flex: 1 }}>
            {item.label}
        </span>
        <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: `2px solid ${isSelected ? '#ee652b' : '#cbd5e1'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            {isSelected && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ee652b' }} />}
        </div>
    </button>
);

export default function AdvancedLocationPicker({ currentAddress, onSave, onClose, hideDetails = false }) {
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
    const [searchInput, setSearchInput] = useState('');

    // Maps Refs
    const mapContainerRef = useRef(null);
    const searchInputRef = useRef(null);
    const mapRef = useRef(null);
    const geocoderRef = useRef(null);
    const autocompleteRef = useRef(null);

    const updateAddressFromPlace = useCallback((place) => {
        const details = parseAddressDetails(place);
        setStreetLabel(details.street);
        setColonyLabel(details.colony);
        setSearchInput(details.full);
    }, []);

    const initMap = useCallback(async () => {
        if (!isApiKeyConfigured() || !mapContainerRef.current) {
            setLoadError(true);
            return;
        }

        try {
            const { Map } = await importLibrary('maps');
            const { Geocoder } = await importLibrary('geocoding');

            if (!mapContainerRef.current) return;

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

            // --- PLACES AUTOCOMPLETE ---
            const { Autocomplete } = await importLibrary('places');
            if (searchInputRef.current) {
                const autocomplete = new Autocomplete(searchInputRef.current, {
                    componentRestrictions: { country: "mx" },
                    fields: ["address_components", "geometry", "formatted_address"],
                    types: ["address"],
                    bounds: {
                        north: TLAPA_CENTER.lat + 0.1,
                        south: TLAPA_CENTER.lat - 0.1,
                        east: TLAPA_CENTER.lng + 0.1,
                        west: TLAPA_CENTER.lng - 0.1,
                    }
                });

                autocomplete.addListener("place_changed", () => {
                    const place = autocomplete.getPlace();
                    if (!place.geometry || !place.geometry.location) return;

                    const newPos = {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                    };

                    map.setCenter(newPos);
                    map.setZoom(18);
                    setLocation(newPos);
                    updateAddressFromPlace(place);
                });

                autocompleteRef.current = autocomplete;
            }

            // When user stops dragging, update center coordinate and reverse-geocode
            map.addListener('dragend', () => {
                const center = map.getCenter();
                const newPos = { lat: center.lat(), lng: center.lng() };
                setLocation(newPos);
                reverseGeocode(newPos);
            });

            if (!location) {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const gpsPos = { lat: position.coords.latitude, lng: position.coords.longitude };
                            map.setCenter(gpsPos);
                            setLocation(gpsPos);
                            reverseGeocode(gpsPos);
                        },
                        () => reverseGeocode(initialPos)
                    );
                } else {
                    reverseGeocode(initialPos);
                }
            } else {
                reverseGeocode(initialPos);
            }

            setIsLoaded(true);
        } catch (err) {
            console.error('[AdvancedLocationPicker] Error:', err);
            setLoadError(true);
        }
    }, [location, updateAddressFromPlace]);

    useEffect(() => {
        if (step === 1) initMap();
    }, [step, initMap]);

    const reverseGeocode = (pos) => {
        if (!geocoderRef.current) return;
        geocoderRef.current.geocode({ location: pos }, (results, status) => {
            if (status === 'OK' && results[0]) {
                updateAddressFromPlace(results[0]);
            }
        });
    };

    const handleConfirmLocation = () => {
        if (!location) return;
        if (hideDetails) {
            onSave({
                label: addressTag,
                street: streetLabel,
                colony: colonyLabel,
                location: location || TLAPA_CENTER
            });
        } else {
            setStep(2);
        }
    };

    const handleSave = () => {
        if (!streetLabel.trim()) return;
        onSave({
            label: addressTag, street: streetLabel, colony: colonyLabel,
            buildingType, aptNumber, deliveryMethod, deliveryNotes,
            location: location || TLAPA_CENTER
        });
    };

    const requestGps = () => {
        if (!navigator.geolocation) {
            alert('Tu navegador no soporta geolocalización.');
            return;
        }

        if (mapRef.current) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const gpsPos = { lat: position.coords.latitude, lng: position.coords.longitude };
                    mapRef.current.panTo(gpsPos);
                    setLocation(gpsPos);
                    reverseGeocode(gpsPos);
                },
                (error) => {
                    const messages = {
                        1: 'Permiso de ubicación denegado.',
                        2: 'Ubicación no disponible.',
                        3: 'Tiempo de espera agotado.'
                    };
                    alert(messages[error.code] || 'Error obteniendo ubicación.');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
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
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid #e2e8f0', background: 'white', zIndex: 10 }}>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex' }}>
                        <X size={24} color="#0f172a" />
                    </button>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                        {currentAddress ? 'Editar dirección' : 'Detalles de la dirección'}
                    </h2>
                </div>

                <div style={{ flex: 1, position: 'relative' }}>
                    <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

                    {!isLoaded && (
                        <div style={{ position: 'absolute', inset: 0, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {loadError ? <p>Error cargando el mapa</p> : <div className="spinner" />}
                        </div>
                    )}

                    <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 400, zIndex: 20 }}>
                        <div style={{ position: 'relative', background: 'white', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                            <Search size={20} color="#64748b" style={{ marginRight: 8 }} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Escribe tu dirección..."
                                style={{ flex: 1, padding: '14px 0', border: 'none', outline: 'none', fontSize: '0.95rem', background: 'transparent' }}
                            />
                            {searchInput && (
                                <button onClick={() => setSearchInput('')} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}>
                                    <X size={16} color="#64748b" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)', pointerEvents: 'none', zIndex: 10 }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
                            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#ee652b" />
                            <circle cx="12" cy="9" r="3" fill="white" />
                        </svg>
                    </div>

                    <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', background: '#334155', color: 'white', padding: '12px 20px', borderRadius: 24, fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', whiteSpace: 'nowrap', zIndex: 10 }}>
                        <Navigation size={18} color="#ee652b" /> Mueve el mapa para elegir el punto
                    </div>

                    <button onClick={requestGps} style={{ position: 'absolute', bottom: 24, right: 24, background: 'white', border: 'none', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer', zIndex: 10 }}>
                        <Navigation size={22} color="#0f172a" />
                    </button>
                </div>

                <div style={{ background: 'white', padding: '24px', borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -10px 15px -3px rgba(0,0,0,0.05)', zIndex: 10 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>Selecciona el lugar de entrega</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={16} /> {streetLabel || 'Buscando calle...'}
                    </p>
                    <button onClick={handleConfirmLocation} disabled={!isLoaded || loadError}
                        style={{ width: '100%', background: '#ee652b', color: 'white', border: 'none', padding: '16px', borderRadius: 16, fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer' }}>
                        Confirmar el lugar de encuentro
                    </button>
                </div>
            </div>
        );
    }

    // --- STEP 2: ADDRESS DETAILS ---
    return (
        <div style={{ ...overlayStyle, background: '#f8fafc', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex' }}>
                    <ChevronLeft size={24} color="#0f172a" />
                </button>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Detalles de la dirección</h2>
            </div>

            <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: 16, marginBottom: 24, border: '1px solid #e2e8f0', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ background: '#fffedd', padding: 12, borderRadius: '50%' }}><MapPin size={24} color="#ee652b" /></div>
                    <div style={{ flex: 1 }}>
                        <input value={streetLabel} onChange={e => setStreetLabel(e.target.value)}
                            style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', border: 'none', outline: 'none', width: '100%', background: 'transparent', marginBottom: 4 }}
                            placeholder="Calle y Número" />
                        <input value={colonyLabel} onChange={e => setColonyLabel(e.target.value)}
                            style={{ fontSize: '0.85rem', color: '#64748b', border: 'none', outline: 'none', width: '100%', background: 'transparent' }}
                            placeholder="Colonia" />
                    </div>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Tipo de edificio</h3>
                <div style={{ marginBottom: 24 }}>
                    {BUILDING_TYPES.map(t => (
                        <OptionCard key={t.id} item={t} isSelected={buildingType === t.id} onSelect={setBuildingType} icon={t.icon} />
                    ))}
                </div>

                {['apartment', 'office', 'hotel'].includes(buildingType) && (
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Departamento/Piso</h3>
                        <input value={aptNumber} onChange={e => setAptNumber(e.target.value)}
                            placeholder="Ej: Apto 302"
                            style={{ width: '100%', padding: '16px', background: 'white', border: '2px solid #e2e8f0', borderRadius: 12 }} />
                    </div>
                )}

                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Método de entrega</h3>
                <div style={{ marginBottom: 24 }}>
                    {DELIVERY_METHODS.map(m => (
                        <OptionCard key={m.id} item={m} isSelected={deliveryMethod === m.id} onSelect={setDeliveryMethod} />
                    ))}
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Notas</h3>
                <div style={{ background: '#f1f5f9', borderRadius: 16, padding: 16, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                    <textarea value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)}
                        placeholder="Ej: Llamar antes de llegar" rows={3}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none' }} />
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Etiqueta</h3>
                <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
                    {['Casa', 'Oficina', 'Pareja', 'Otro'].map(tag => (
                        <button key={tag} onClick={() => setAddressTag(tag)}
                            style={{
                                padding: '10px 20px', borderRadius: 20, fontWeight: 600, cursor: 'pointer',
                                background: addressTag === tag ? '#1e293b' : 'white',
                                color: addressTag === tag ? 'white' : '#64748b',
                                border: `1px solid ${addressTag === tag ? '#1e293b' : '#e2e8f0'}`
                            }}>
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ position: 'sticky', bottom: 0, background: 'white', padding: '16px 24px', borderTop: '1px solid #e2e8f0', zIndex: 10 }}>
                <button onClick={handleSave} disabled={!streetLabel.trim()}
                    style={{ width: '100%', background: streetLabel.trim() ? '#ee652b' : '#cbd5e1', color: 'white', border: 'none', padding: '16px', borderRadius: 16, fontWeight: 800 }}>
                    Guardar dirección
                </button>
            </div>
        </div>
    );
}
