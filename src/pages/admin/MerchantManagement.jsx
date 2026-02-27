import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCategories } from '../../data/seedData';
import { supabase } from '../../supabase';
import { BarChart3, Store, Users, ShoppingBag, Settings, LogOut, Search, Star, Edit2, Trash2, X, Save, Camera, Key, DollarSign, LayoutGrid, Gift, Truck, Unlock } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import AdvancedLocationPicker from '../../components/AdvancedLocationPicker';

export default function MerchantManagement() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [merchants, setMerchants] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showAddressPicker, setShowAddressPicker] = useState(false);
    const [editingMerchant, setEditingMerchant] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

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
        reviews: 0,
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
            const { deliveryTime, ...restData } = form;
            const merchantData = {
                ...restData,
                prepTime: deliveryTime // mapping deliveryTime to prepTime for Supabase schema
            };

            let merchantId = editingMerchant?.id;

            if (!merchantId) {
                merchantId = `merchant-${Date.now()}`;
                const { error } = await supabase.from('merchants').insert([{
                    id: merchantId,
                    ...merchantData,
                    createdAt: new Date().toISOString()
                }]);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('merchants').update({
                    ...merchantData,
                    updatedAt: new Date().toISOString()
                }).eq('id', merchantId);
                if (error) throw error;
            }

            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Error al guardar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este comercio?')) {
            const { error } = await supabase.from('merchants').delete().eq('id', id);
            if (error) alert("Error eliminando comercio: " + error.message);
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
            <aside className="admin-sidebar">
                <div className="logo">Tlapa <span>Comida</span></div>
                <nav className="sidebar-nav">
                    <button className="sidebar-link" onClick={() => navigate('/admin')}>
                        <BarChart3 size={18} /> Dashboard
                    </button>
                    <button className="sidebar-link active">
                        <Store size={18} /> Comercios
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/categories')}>
                        <LayoutGrid size={18} /> Categorías
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/users')}>
                        <Users size={18} /> Usuarios
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/delivery')}>
                        <Truck size={18} /> Repartidores
                        <Users size={18} /> Usuarios
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/orders')}>
                        <ShoppingBag size={18} /> Pedidos
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/promotions')}>
                        <Gift size={18} /> Promociones
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/finance')}>
                        <DollarSign size={18} /> Finanzas
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/settings')}>
                        <Settings size={18} /> Ajustes
                    </button>
                </nav>
                <div style={{ marginTop: 'auto' }}>
                    <button className="sidebar-link" onClick={logout}>
                        <LogOut size={18} /> Cerrar sesión
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1>Gestión de Comercios</h1>
                        <p>Añade, edita y gestiona los restaurantes de la plataforma.</p>
                    </div>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Store size={18} /> Nuevo Comercio
                    </button>
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

                    <div className="card no-padding overflow-hidden">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Comercio</th>
                                    <th>Categoría</th>
                                    <th>Entrega</th>
                                    <th>Status</th>
                                    <th>Rating</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMerchants.map(merchant => (
                                    <tr key={merchant.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <img
                                                    src={merchant.logoUrl || merchant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
                                                    alt={merchant.name}
                                                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{merchant.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{typeof merchant.address === 'object' ? merchant.address?.street || 'Sin dirección' : merchant.address}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                background: 'var(--color-border-light)',
                                                padding: '4px 8px',
                                                borderRadius: 6
                                            }}>
                                                {categories.find(c => c.id === merchant.category)?.name || 'Sin categoría'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem' }}>{merchant.deliveryTime || merchant.prepTime} min</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>${merchant.deliveryFee} envío</div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${merchant.isOpen ? 'status-delivered' : 'status-cancelled'}`}>
                                                {merchant.isOpen ? 'Abierto' : 'Cerrado'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                                                <Star size={14} fill="var(--color-warning)" color="var(--color-warning)" />
                                                {merchant.rating}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button title="Editar" className="btn btn-icon btn-ghost" onClick={() => openEditModal(merchant)}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button title={merchant.isPremium ? "Quitar Premium" : "Otorgar Premium"} className="btn btn-icon btn-ghost" onClick={() => handleTogglePremium(merchant)} style={{ color: merchant.isPremium ? '#d97706' : 'var(--color-text-muted)' }}>
                                                    <Star size={16} fill={merchant.isPremium ? 'currentColor' : 'none'} />
                                                </button>
                                                {!merchant.isPremium && merchant.customizationAttempts >= 1 && (
                                                    <button title="Resetear Intentos de Diseño a 0 (Dar 1 oportunidad extra)" className="btn btn-icon btn-ghost" onClick={() => handleResetAttempts(merchant)} style={{ color: '#2563eb' }}>
                                                        <Unlock size={16} />
                                                    </button>
                                                )}
                                                <button title="Eliminar Comercio" className="btn btn-icon btn-ghost" onClick={() => handleDelete(merchant.id)}>
                                                    <Trash2 size={16} color="var(--color-error)" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
