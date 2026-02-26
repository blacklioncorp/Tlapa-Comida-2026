import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';
import {
    LayoutDashboard, UtensilsCrossed, Plus, Search,
    Edit2, Trash2, X, Save, ArrowLeft, Image as ImageIcon,
    ShoppingBag, Settings, LogOut, Check, XCircle
} from 'lucide-react';
import { MERCHANTS } from '../../data/seedData'; // Puedes mantener esto solo para el nombre provisto por ID mientras migras datos
import ModifierDishModal from '../../components/ModifierDishModal';

export default function MenuManager() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menu, setMenu] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [merchantInfo, setMerchantInfo] = useState(null);

    const merchantId = user?.merchantId;

    // 1. LECTURA EN TIEMPO REAL DEL MENÚ (Supabase)
    useEffect(() => {
        if (!merchantId) {
            setLoading(false);
            return;
        }

        let subscription = null;

        const fetchInitialData = async () => {
            // Fetch merchant name
            try {
                const { data: mData } = await supabase.from('merchants').select('name').eq('id', merchantId).single();
                setMerchantInfo(mData);
            } catch (err) {
                console.error("Error fetching merchant info:", err);
            }

            // Fetch initial products
            try {
                const { data: pData } = await supabase.from('products').select('*').eq('merchantId', merchantId);
                setMenu(pData || []);
            } catch (err) {
                console.error("Error fetching menu:", err);
            }
            setLoading(false);
        };

        const setupRealtime = () => {
            subscription = supabase.channel(`public:products:merchantId=eq.${merchantId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `merchantId=eq.${merchantId}` }, payload => {
                    setMenu(current => {
                        if (payload.eventType === 'INSERT') return [...current, payload.new];
                        if (payload.eventType === 'UPDATE') return current.map(p => p.id === payload.new.id ? payload.new : p);
                        if (payload.eventType === 'DELETE') return current.filter(p => p.id !== payload.old.id);
                        return current;
                    });
                })
                .subscribe();
        };

        fetchInitialData().then(() => setupRealtime());

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, [merchantId]);

    // 2. ACTUALIZACIÓN ATÓMICA DE ESTADO "AGOTADO / DISPONIBLE"
    const handleToggleAvailable = async (itemId, currentAvailability) => {
        if (!merchantId) return;
        try {
            const { error } = await supabase.from('products').update({
                isAvailable: !currentAvailability,
                updatedAt: new Date().toISOString()
            }).eq('id', itemId);
            if (error) throw error;
        } catch (error) {
            console.error("Error cambiando estado:", error);
            alert("Error al actualizar disponibilidad.");
        }
    };

    const handleDelete = async (itemId) => {
        if (!merchantId || !window.confirm("¿Seguro que deseas eliminar este platillo para siempre?")) return;
        try {
            const { error } = await supabase.from('products').delete().eq('id', itemId);
            if (error) throw error;
        } catch (error) {
            console.error("Error al eliminar platillo:", error);
            alert("No se pudo eliminar.");
        }
    };

    const existingCategories = [...new Set(menu.map(item => item.category).filter(Boolean))];

    // 3. MENÚ REAL DESDE FIRESTORE
    // Abandonados los datos semilla simulados. Ahora cualquier platillo nuevo
    // agregado vía "Nuevo Platillo" se mostrará automáticamente aquí por onSnapshot.
    const activeMenu = menu;

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar" style={{ background: '#111827' }}>
                <div className="logo" style={{ color: 'white' }}>Tlapa <span>Commercio</span></div>
                <nav className="sidebar-nav">
                    <button className="sidebar-link" onClick={() => navigate('/merchant')} style={{ color: '#9ca3af' }}>
                        <LayoutDashboard size={18} /> Dashboard
                    </button>
                    <button className="sidebar-link active" style={{ color: 'white' }}>
                        <UtensilsCrossed size={18} /> Menú / Platillos
                    </button>
                    <button className="sidebar-link" onClick={() => { }} style={{ color: '#9ca3af' }}>
                        <ShoppingBag size={18} /> Historial Pedidos
                    </button>
                    <button className="sidebar-link" onClick={() => { }} style={{ color: '#9ca3af' }}>
                        <Settings size={18} /> Ajustes Local
                    </button>
                </nav>
                <div style={{ marginTop: 'auto' }}>
                    <button className="sidebar-link" onClick={logout} style={{ color: '#ef4444' }}>
                        <LogOut size={18} /> Cerrar sesión
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="btn btn-icon btn-ghost" onClick={() => navigate('/merchant')}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1>Gestión de Menú</h1>
                            <p>Administra los platillos y precios de {merchantInfo?.name}.</p>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Nuevo Platillo
                    </button>
                </header>

                <div className="admin-content">
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="search-bar">
                            <Search size={20} color="var(--color-text-muted)" />
                            <input
                                type="text"
                                placeholder="Buscar platillos por nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                        {activeMenu.map(item => (
                            <div key={item.id} className="card no-padding overflow-hidden" style={{ opacity: item.isAvailable ? 1 : 0.7 }}>
                                <div style={{ position: 'relative' }}>
                                    <img src={item.imageUrl || item.image} alt={item.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                                    {!item.isAvailable && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ color: 'white', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Agotado</span>
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'top', marginBottom: 8 }}>
                                        <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.name}</h3>
                                        <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>${item.price}</span>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 16, height: 40, overflow: 'hidden' }}>
                                        {item.description}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', background: 'var(--color-border-light)', padding: '4px 8px', borderRadius: 6 }}>
                                            {item.category}
                                        </span>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                className={`btn btn-icon btn-sm ${item.isAvailable ? 'btn-ghost' : 'btn-ghost'}`}
                                                onClick={() => handleToggleAvailable(item.id, item.isAvailable)}
                                                title={item.isAvailable ? 'Marcar como Agotado' : 'Marcar como Disponible'}
                                            >
                                                {item.isAvailable ? <Check size={16} color="var(--color-primary)" /> : <XCircle size={16} color="var(--color-text-muted)" />}
                                            </button>
                                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { setEditingItem(item); setIsModalOpen(true); }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleDelete(item.id)}>
                                                <Trash2 size={16} color="var(--color-error)" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {isModalOpen && (
                    <ModifierDishModal
                        merchantId={merchantId}
                        editingItem={editingItem}
                        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
                    />
                )}
            </main>
        </div>
    );
}
