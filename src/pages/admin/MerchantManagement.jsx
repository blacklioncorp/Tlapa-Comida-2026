import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCategories } from '../../data/seedData';
import { supabase } from '../../supabase';
import { BarChart3, Store, Users, ShoppingBag, Settings, LogOut, Search, Star, Edit2, Trash2, X, Save, Camera, Key, DollarSign, LayoutGrid, Gift, Truck, Unlock, Menu } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import AdvancedLocationPicker from '../../components/AdvancedLocationPicker';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function MerchantManagement() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [merchants, setMerchants] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showAddressPicker, setShowAddressPicker] = useState(false);
    const [editingMerchant, setEditingMerchant] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const categories = getCategories();

    useEffect(() => {
        const fetchMerchants = async () => {
            const { data } = await supabase.from('merchants').select('*');
            if (data) setMerchants(data);
        };
        fetchMerchants();

        const channel = supabase.channel('public:merchants')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'merchants' }, () => {
                fetchMerchants();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const [form, setForm] = useState({
        name: '',
        category: categories[0]?.id || '',
        deliveryTime: '20-30',
        deliveryFee: 20,
        minOrder: 100,
        address: '',
        logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        ownerEmail: '',
        isOpen: true,
        rating: 5.0,
        reviews: 0
    });

    const handleSearch = (e) => setSearchTerm(e.target.value);

    const filteredMerchants = merchants.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openCreateModal = () => {
        setEditingMerchant(null);
        setForm({
            name: '',
            category: categories[0]?.id || '',
            deliveryTime: '20-30',
            deliveryFee: 20,
            minOrder: 100,
            address: '',
            logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
            ownerEmail: '',
            isOpen: true,
            rating: 5.0,
            reviews: 0
        });
        setIsModalOpen(true);
    };

    const openEditModal = (merchant) => {
        setEditingMerchant(merchant);
        setForm({
            ...merchant,
            address: typeof merchant.address === 'object' ? merchant.address?.street || '' : merchant.address || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { address, ...restData } = form;
            const merchantData = {
                ...restData,
                address: typeof address === 'object' ? JSON.stringify(address) : address
            };

            let merchantId = editingMerchant?.id;

            if (!merchantId) {
                merchantId = `merchant-${Date.now()}`;
                const { error: merchantError } = await supabase.from('merchants').insert([{
                    id: merchantId,
                    ...merchantData,
                    createdAt: new Date().toISOString()
                }]);
                if (merchantError) throw merchantError;

                // Immediate role sync for the owner user
                if (merchantData.ownerEmail) {
                    await supabase.from('users')
                        .update({ role: 'merchant', merchantId: merchantId })
                        .eq('email', merchantData.ownerEmail.toLowerCase().trim());
                }
            } else {
                const { error: merchantError } = await supabase.from('merchants').update({
                    ...merchantData,
                    updatedAt: new Date().toISOString()
                }).eq('id', merchantId);
                if (merchantError) throw merchantError;

                // Sync role if email changed or to ensure consistency
                if (merchantData.ownerEmail) {
                    await supabase.from('users')
                        .update({ role: 'merchant', merchantId: merchantId })
                        .eq('email', merchantData.ownerEmail.toLowerCase().trim());
                }
            }

            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Error al guardar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (merchant) => {
        const confirmMsg = `⚠️ ¿Eliminar "${merchant.name}" permanentemente?\n\n` +
            `Esto borrará:\n• El comercio\n• Todos sus platillos/productos\n\n` +
            `NOTA: El correo "${merchant.ownerEmail}" NO se libera automáticamente.\n` +
            `Para reutilizarlo debes eliminarlo en:\n` +
            `Supabase → Authentication → Users → busca el email → Delete User`;

        if (window.confirm(confirmMsg)) {
            try {
                // 1. Eliminar todos los productos del comercio (FK constraint)
                const { error: prodError } = await supabase
                    .from('products')
                    .delete()
                    .eq('merchantId', merchant.id);
                if (prodError) throw prodError;

                // 2. Resetear el rol del usuario en la tabla users (opcional pero limpio)
                if (merchant.ownerEmail) {
                    await supabase
                        .from('users')
                        .update({ role: 'client', merchantId: null })
                        .eq('email', merchant.ownerEmail.toLowerCase().trim());
                }

                // 3. Eliminar el comercio
                const { error } = await supabase.from('merchants').delete().eq('id', merchant.id);
                if (error) throw error;

                alert(`✅ Comercio "${merchant.name}" eliminado correctamente.\n\n` +
                    `Recuerda eliminar el correo "${merchant.ownerEmail}" desde:\n` +
                    `Supabase → Authentication → Users → Delete User\n` +
                    `para poder reutilizar ese correo en un nuevo registro.`);
            } catch (error) {
                alert("Error eliminando comercio: " + error.message);
            }
        }
    };

    const handleTogglePremium = async (merchant) => {
        const confirmMsg = merchant.isPremium
            ? `¿Quitarle el estado Premium a ${merchant.name}?\n\nVolverá a tener el límite de cambios de diseño (1 vez).`
            : `¿Otorgar membresía Premium a ${merchant.name}?\n\nPodrá modificar el nombre, colores, banners y logos sin restricción alguna.`;

        if (window.confirm(confirmMsg)) {
            const { error } = await supabase.from('merchants').update({
                isPremium: !merchant.isPremium,
                updatedAt: new Date().toISOString()
            }).eq('id', merchant.id);
            if (error) alert("Error al actualizar la suscripción: " + error.message);
        }
    };

    const handleResetAttempts = async (merchant) => {
        if (window.confirm(`¿Resetear cambios agotados a ${merchant.name}?\n\nEsto le dará nuevamente 1 oportunidad gratuita de cambiar su diseño visual (ideal si pagaron por un cambio único extra sin necesidad de darles Premium).`)) {
            const { error } = await supabase.from('merchants').update({
                customizationAttempts: 0,
                updatedAt: new Date().toISOString()
            }).eq('id', merchant.id);
            if (error) alert("Error al resetear oportunidades: " + error.message);
        }
    };

    return (
        <div className="admin-layout">
            <AdminSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="admin-main">
                <header className="admin-header admin-header-responsive">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1>Gestión de Comercios</h1>
                            <p>Añade, edita y gestiona los restaurantes de la plataforma.</p>
                        </div>
                    </div>
                    <div className="admin-header-actions">
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            <Store size={18} /> Nuevo Comercio
                        </button>
                    </div>
                </header>

                <div className="admin-content">
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="search-bar">
                            <Search size={20} color="var(--color-text-muted)" />
                            <input
                                type="text"
                                placeholder="Buscar comercios por nombre..."
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '24px'
                    }}>
                        {filteredMerchants.map(merchant => (
                            <div key={merchant.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px' }}>
                                {/* Card Header: Image & Basic Info */}
                                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                    <img
                                        src={merchant.logoUrl || merchant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
                                        alt={merchant.name}
                                        style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--color-border-light)' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px 0', lineHeight: 1.2 }}>{merchant.name}</h3>
                                            <span className={`status-badge ${merchant.isOpen ? 'status-delivered' : 'status-cancelled'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                                                {merchant.isOpen ? 'Abierto' : 'Cerrado'}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {(() => {
                                                if (!merchant.address) return 'Sin dirección';
                                                if (typeof merchant.address === 'object') return merchant.address.street || 'Sin calle';
                                                try {
                                                    const parsed = JSON.parse(merchant.address);
                                                    return parsed.street || merchant.address;
                                                } catch (e) {
                                                    return merchant.address;
                                                }
                                            })()}
                                        </p>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div style={{ height: 1, background: 'var(--color-border-light)', margin: '0 -20px' }} />

                                {/* Additional Specs (Grid 2 cols) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem' }}>
                                    <div>
                                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: 2 }}>Categoría</span>
                                        <span style={{ fontWeight: 600 }}>{categories.find(c => c.id === merchant.category)?.name || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: 2 }}>Rating</span>
                                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Star size={14} fill="var(--color-warning)" color="var(--color-warning)" /> {merchant.rating}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: 2 }}>Tiempo (min)</span>
                                        <span style={{ fontWeight: 600 }}>{merchant.deliveryTime || merchant.prepTime} min</span>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: 2 }}>Costo Envío</span>
                                        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>${merchant.deliveryFee}</span>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div style={{ height: 1, background: 'var(--color-border-light)', margin: '0 -24px' }} />

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'auto' }}>
                                    <button 
                                        title="Editar Comercio" 
                                        className="btn btn-outline" 
                                        style={{ padding: '6px 12px', fontSize: '0.85rem' }} 
                                        onClick={() => openEditModal(merchant)}
                                    >
                                        <Edit2 size={16} style={{ marginRight: 6 }} /> Editar
                                    </button>
                                    
                                    <button 
                                        title={merchant.isPremium ? "Quitar Premium" : "Otorgar Premium"} 
                                        className={`btn ${merchant.isPremium ? 'btn-ghost' : 'btn-outline'}`}
                                        style={{ padding: '6px 12px', fontSize: '0.85rem', color: merchant.isPremium ? '#d97706' : 'currentColor', borderColor: merchant.isPremium ? 'transparent' : 'var(--color-border)' }} 
                                        onClick={() => handleTogglePremium(merchant)}
                                    >
                                        <Star size={16} fill={merchant.isPremium ? 'currentColor' : 'none'} style={{ marginRight: 6 }} />
                                        {merchant.isPremium ? 'Premium' : 'Normal'}
                                    </button>

                                    {!merchant.isPremium && merchant.customizationAttempts >= 1 && (
                                        <button 
                                            title="Resetear Intentos de Diseño a 0 (Dar 1 oportunidad extra)" 
                                            className="btn btn-icon btn-ghost" 
                                            onClick={() => handleResetAttempts(merchant)} 
                                            style={{ color: '#2563eb' }}
                                        >
                                            <Unlock size={16} />
                                        </button>
                                    )}

                                    <button 
                                        title="Eliminar Comercio" 
                                        className="btn btn-icon btn-ghost" 
                                        onClick={() => handleDelete(merchant)}
                                        style={{ color: 'var(--color-error)' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h2>{editingMerchant ? 'Editar Comercio' : 'Nuevo Comercio'}</h2>
                            <button className="btn btn-icon btn-ghost" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Nombre del Comercio</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        Correo del Dueño
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 'normal' }}>(Permitirá que el dueño se registre gratis)</span>
                                    </label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={form.ownerEmail}
                                        placeholder="Ej: restaurante@ejemplo.com"
                                        onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Categoría</label>
                                    <select
                                        className="form-input"
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tiempo de Entrega (min)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.deliveryTime}
                                        placeholder="Ej: 20-30"
                                        onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Costo de Envío ($)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={form.deliveryFee}
                                        onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Pedido Mínimo ($)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={form.minOrder}
                                        onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Dirección (Ubicación GPS)</label>
                                    <div
                                        onClick={() => setShowAddressPicker(true)}
                                        style={{
                                            padding: '12px 16px',
                                            border: '2px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            background: 'var(--color-surface)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <span style={{ color: form.address ? 'inherit' : 'var(--color-text-muted)' }}>
                                            {typeof form.address === 'object' ? form.address?.street : (form.address || 'Toca para seleccionar ubicación...')}
                                        </span>
                                        <span style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600 }}>Seleccionar</span>
                                    </div>
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Imagen/Fotografía del Comercio</label>
                                    <div style={{ marginTop: 8 }}>
                                        <ImageUpload
                                            currentImage={form.logoUrl || form.image}
                                            onImageChange={(base64) => setForm({ ...form, logoUrl: base64 })}
                                            shape="banner"
                                            size={160}
                                            label=""
                                            id="merchant-image"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                                <Save size={18} /> {isSaving ? 'Guardando...' : editingMerchant ? 'Guardar Cambios' : 'Crear Comercio'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selector de Mapa en Pantalla Completa */}
            {showAddressPicker && (
                <AdvancedLocationPicker
                    hideDetails={true}
                    onSave={(addr) => {
                        setForm({ ...form, address: addr });
                        setShowAddressPicker(false);
                    }}
                    onClose={() => setShowAddressPicker(false)}
                />
            )}
        </div>
    );
}
