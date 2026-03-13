import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useSmartDelivery } from '../../contexts/SmartDeliveryContext';
import { getCategories } from '../../data/seedData';
import { supabase } from '../../supabase';
import { Search, MapPin, ShoppingBag, Tag, Star, Clock, ChevronRight, LogOut, Ticket, Plus, LayoutDashboard, User } from 'lucide-react';
import AdvancedLocationPicker from '../../components/AdvancedLocationPicker';
import WeatherBanner from '../../components/WeatherBanner';
import { MerchantLoadInline } from '../../components/MerchantLoadBadge';
import { applyWeatherDelay, adjustedDeliveryFee } from '../../services/WeatherService';
import WelcomePromoModal from '../../components/WelcomePromoModal';
import SmartLocationWarning from '../../components/SmartLocationWarning';

export default function ClientHome() {
    const { user, logout, updateUser } = useAuth();
    const { itemCount, subtotal } = useCart();
    const { weather, isRaining } = useSmartDelivery();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch live merchants from Supabase
    useEffect(() => {
        const fetchMerchants = async () => {
            try {
                const { data, error } = await supabase.from('merchants').select('*').order('rating', { ascending: false });
                if (error) throw error;
                // Parse coordinates stringified JSON if needed (although Supabase handles jsonb natively)
                setMerchants(data || []);
            } catch (err) {
                console.error("Failed to load merchants:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMerchants();
    }, []);

    // Auto-show address modal for new users without address
    useEffect(() => {
        if (user && (!user.savedAddresses || user.savedAddresses.length === 0)) {
            setShowAddressModal(true);
        }
    }, [user]);

    const categories = getCategories();

    const handleSaveAddress = async (newAddress) => {
        await updateUser({
            savedAddresses: [newAddress]
        });
        setShowAddressModal(false);
    };

    const filteredMerchants = useMemo(() => {
        return merchants.filter(m => {
            const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
            const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
                (m.description || '').toLowerCase().includes(search.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [search, activeCategory, merchants]);

    return (
        <div className="app-container">
            {/* Header */}
            <div style={{
                padding: '16px',
                background: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div onClick={() => setShowAddressModal(true)} style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600 }}>
                            <MapPin size={14} />
                            Entregar en
                        </div>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>
                            {user?.savedAddresses?.[0]?.street || 'Configurar dirección...'}
                        </h2>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div className="desktop-nav-links" style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={() => navigate('/orders')}>
                                <span style={{ marginRight: 6 }}>📋</span>Pedidos
                            </button>
                            <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={() => navigate('/promotions')}>
                                <Ticket size={18} style={{ marginRight: 6 }} />Promos
                            </button>
                        </div>
                        {user?.role === 'admin' && (
                            <button className="btn btn-icon btn-ghost" onClick={() => navigate('/admin')} title="Ir al Dashboard">
                                <LayoutDashboard size={20} />
                            </button>
                        )}
                        <button className="btn btn-icon btn-ghost" onClick={logout} title="Cerrar sesión">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="search-bar" style={{ maxWidth: 600 }}>
                    <Search size={18} />
                    <input
                        placeholder="¿Qué se te antoja hoy?"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Weather Banner */}
            <div style={{ padding: '0 16px' }}>
                <WeatherBanner />
            </div>

            {/* Promo Banner */}
            <div style={{ padding: '0 16px' }}>
                <div
                    onClick={() => navigate('/promotions')}
                    style={{
                        background: 'linear-gradient(135deg, #ee652b, #ff8a57)',
                        borderRadius: 16,
                        padding: '20px 24px',
                        color: 'white',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        marginBottom: 20,
                    }}
                >
                    <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.15, fontSize: 120 }}>🎉</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Tag size={16} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Promoción</span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>20% de descuento</h3>
                    <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>En tu primer pedido con código TLAPA20</p>
                </div>
            </div>

            {/* Smart Location Warning */}
            <SmartLocationWarning onModifyAddress={() => setShowAddressModal(true)} />

            {/* Categories & Horizontal Filters */}
            <div style={{ padding: '0 0px', marginBottom: 20 }}>
                {/* Fixed Quick Filters Row */}
                <div style={{ 
                    display: 'flex', 
                    gap: 12, 
                    overflowX: 'auto', 
                    padding: '0 16px 12px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                }} className="hide-scroll">
                    <button className="btn btn-outline" style={{ borderRadius: 100, padding: '6px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        Ordenar
                    </button>
                    <button className="btn btn-outline" style={{ borderRadius: 100, padding: '6px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <Tag size={14} color="#ee652b" />
                        Promociones
                    </button>
                    <button className="btn btn-outline" style={{ borderRadius: 100, padding: '6px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <Clock size={14} color="#00a859" />
                        En 30 min
                    </button>
                    <button className="btn btn-outline" style={{ borderRadius: 100, padding: '6px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                         🚚 Envío Gratis
                    </button>
                </div>

                {/* Categories Row */}
                <div style={{ padding: '0 16px', overflowX: 'auto', whiteSpace: 'nowrap', pb: 8 }} className="hide-scroll">
                    <div className="pills-container" style={{ display: 'inline-flex', flexWrap: 'nowrap' }}>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                className={`pill ${activeCategory === cat.id ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat.id)}
                                style={{ flexShrink: 0 }}
                            >
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Marcas Populares Horizonatal Carousel */}
            {filteredMerchants.length > 0 && activeCategory === 'all' && (
                <div style={{ padding: '0 0px', marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 12 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Marcas populares</h3>
                        <ChevronRight size={20} color="var(--color-text-muted)" />
                    </div>
                    
                    <div style={{ 
                        display: 'flex', 
                        gap: 16, 
                        overflowX: 'auto', 
                        padding: '0 16px 8px',
                        scrollSnapType: 'x mandatory',
                        WebkitOverflowScrolling: 'touch'
                    }} className="hide-scroll">
                        {filteredMerchants.slice(0, 5).map(merchant => (
                            <div 
                                key={`top-${merchant.id}`}
                                onClick={() => navigate(`/restaurant/${merchant.id}`)}
                                style={{
                                    flexShrink: 0,
                                    width: 140,
                                    scrollSnapAlign: 'start',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 8,
                                    cursor: 'pointer'
                                }}
                            >
                                {/* Circle Avatar */}
                                <div style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    border: '1px solid var(--color-border)',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                    padding: 2,
                                    background: 'white'
                                }}>
                                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                                        <img 
                                            src={merchant.bannerUrl} 
                                            alt={merchant.name} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, 
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                    }}>
                                        {merchant.name}
                                    </h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                        <Clock size={10} /> 10-25 Min
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Restaurant List */}
            <div style={{ padding: '0 16px 100px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                        Restaurantes {activeCategory !== 'all' ? `— ${categories.find(c => c.id === activeCategory)?.label}` : 'cerca de ti'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{filteredMerchants.length} resultados</span>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                        <span style={{ fontSize: 24, marginBottom: 16, display: 'block' }}>Cargando restaurantes...</span>
                    </div>
                ) : filteredMerchants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                        <span style={{ fontSize: 48, marginBottom: 16, display: 'block' }}>🔍</span>
                        <p>No encontramos restaurantes</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '24px'
                    }}>
                        {filteredMerchants.map(merchant => (
                            <div
                                key={merchant.id}
                                className="card"
                                onClick={() => navigate(`/restaurant/${merchant.id}`)}
                                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                            >
                                <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                                    <img
                                        src={merchant.bannerUrl}
                                        alt={merchant.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    {!merchant.isOpen && (
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: 'rgba(0,0,0,0.6)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 700, fontSize: '1.125rem',
                                        }}>
                                            Cerrado
                                        </div>
                                    )}
                                    <div style={{
                                        position: 'absolute', top: 12, right: 12,
                                        background: 'white', padding: '4px 10px', borderRadius: 20,
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        fontSize: '0.75rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    }}>
                                        <Star size={12} fill="#fbbf24" color="#fbbf24" /> {merchant.rating}
                                    </div>
                                </div>

                                <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        <div>
                                            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 4 }}>{merchant.name}</h4>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{merchant.description}</p>
                                        </div>
                                        <ChevronRight size={18} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 4 }} />
                                    </div>
                                    <div style={{ marginTop: 'auto' }}>
                                        <MerchantLoadInline merchantId={merchant.id} />
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 8 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={12} /> {isRaining ? applyWeatherDelay(merchant.deliveryTime, weather?.condition) : merchant.deliveryTime} min
                                                {isRaining && <span style={{ color: 'var(--color-warning)', fontWeight: 700, fontSize: '0.65rem' }}>⚠️</span>}
                                            </span>
                                            <span>Envío ${isRaining ? adjustedDeliveryFee(merchant.deliveryFee, weather?.condition) : merchant.deliveryFee}</span>
                                            <span>{(merchant.totalOrders || 0).toLocaleString()} pedidos</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Floating cart */}
            {itemCount > 0 && (
                <button className="floating-cart" onClick={() => navigate('/checkout')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShoppingBag size={20} />
                        {itemCount} producto{itemCount > 1 ? 's' : ''}
                    </span>
                    <span>${subtotal.toFixed(2)}</span>
                </button>
            )}

            {/* Bottom Nav */}
            <nav className="bottom-nav">
                <button className="bottom-nav-item active">
                    <span style={{ fontSize: 20 }}>🏠</span>
                    Inicio
                </button>
                <button className="bottom-nav-item" onClick={() => navigate('/orders')}>
                    <span style={{ fontSize: 20 }}>📋</span>
                    Pedidos
                </button>
                <button className="bottom-nav-item" onClick={() => navigate('/promotions')}>
                    <Ticket size={20} />
                    Promos
                </button>
                <button className="bottom-nav-item" onClick={() => navigate('/profile')}>
                    <User size={20} />
                    Perfil
                </button>
            </nav>

            {/* Address Setup Modal */}
            {showAddressModal && (
                <AdvancedLocationPicker 
                    onClose={() => setShowAddressModal(false)}
                    onSave={handleSaveAddress}
                    initialAddress={user?.savedAddresses?.[0]}
                />
            )}

            {/* DiDi Welcome Promo Modal */}
            <WelcomePromoModal />
        </div>
    );
}
