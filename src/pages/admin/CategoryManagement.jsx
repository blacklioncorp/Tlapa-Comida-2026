import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';
import {
    BarChart3, Store, Users, ShoppingBag, Settings, LogOut,
    Plus, Trash2, Save, X, DollarSign, LayoutGrid, Gift,
    Image as ImageIcon, Smile, Type, Eye, Truck
} from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';

const EMOJI_OPTIONS = [
    '🍕', '🍔', '🌮', '🍣', '🥗', '🍝', '🍰', '🍩',
    '🥤', '☕', '🍗', '🌯', '🥟', '🍜', '🧁', '🍲',
    '🥩', '🍱', '🥪', '🧀', '🍟', '🥘', '🫔', '🥡',
];

export default function CategoryManagement() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ name: '', icon: '🍕', image: '' });
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let subscription = null;

        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
                if (error) throw error;
                setCategories(data || []);
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setLoading(false);
            }
        };

        const setupRealtime = () => {
            subscription = supabase.channel('public:categories')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, payload => {
                    if (payload.eventType === 'INSERT') {
                        setCategories(current => [...current, payload.new].sort((a, b) => a.name.localeCompare(b.name)));
                    } else if (payload.eventType === 'UPDATE') {
                        setCategories(current => current.map(c => c.id === payload.new.id ? payload.new : c));
                    } else if (payload.eventType === 'DELETE') {
                        setCategories(current => current.filter(c => c.id !== payload.old.id));
                    }
                })
                .subscribe();
        };

        fetchCategories();
        setupRealtime();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, []);

    const handleSave = async () => {
        if (!form.name.trim()) return;
        try {
            const newCat = {
                id: `cat-${Date.now()}`,
                name: form.name,
                label: form.name,
                icon: form.icon,
                image: form.image,
            };

            const { error } = await supabase.from('categories').insert([newCat]);
            if (error) throw error;

            setIsModalOpen(false);
            setForm({ name: '', icon: '🍕', image: '' });
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Error al guardar la categoría: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar esta categoría? Los comercios asociados podrían quedar huérfanos.')) {
            try {
                const { error } = await supabase.from('categories').delete().eq('id', id);
                if (error) throw error;
            } catch (error) {
                console.error('Error deleting category:', error);
                alert('No se pudo eliminar la categoría.');
            }
        }
    };

    const openModal = () => {
        setForm({ name: '', icon: '🍕', image: '' });
        setShowEmojiPicker(false);
        setIsModalOpen(true);
    };

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="logo">Tlapa <span>Comida</span></div>
                <nav className="sidebar-nav">
                    <button className="sidebar-link" onClick={() => navigate('/admin')}>
                        <BarChart3 size={18} /> Dashboard
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/merchants')}>
                        <Store size={18} /> Comercios
                    </button>
                    <button className="sidebar-link active">
                        <LayoutGrid size={18} /> Categorías
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/users')}>
                        <Users size={18} /> Usuarios
                    </button>
                    <button className="sidebar-link" onClick={() => navigate('/admin/delivery')}>
                        <Truck size={18} /> Repartidores
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
                <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Categorías</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
                            Gestiona las {categories.length} categorías de comida disponibles en la plataforma.
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={openModal} style={{ borderRadius: 12 }}>
                        <Plus size={18} /> Nueva Categoría
                    </button>
                </header>

                <div className="admin-content">
                    {/* Categories Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: 20,
                    }}>
                        {categories.map(cat => (
                            <div
                                key={cat.id}
                                style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    boxShadow: 'var(--shadow-md)',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    position: 'relative',
                                    cursor: 'default',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                }}
                            >
                                {/* Image with gradient overlay */}
                                <div style={{ position: 'relative', height: 140, overflow: 'hidden' }}>
                                    {cat.image ? (
                                        <img
                                            src={cat.image}
                                            alt={cat.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                display: 'block',
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div style={{
                                        display: cat.image ? 'none' : 'flex',
                                        width: '100%',
                                        height: '100%',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'linear-gradient(135deg, #fed7aa, #fdba74)',
                                        fontSize: 48,
                                    }}>
                                        {cat.icon}
                                    </div>
                                    {/* Gradient overlay */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: 50,
                                        background: 'linear-gradient(transparent, rgba(0,0,0,0.4))',
                                    }} />
                                    {/* Delete button */}
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            width: 32,
                                            height: 32,
                                            borderRadius: 8,
                                            border: 'none',
                                            background: 'rgba(0,0,0,0.5)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'background 0.2s ease',
                                            opacity: 0.7,
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = '#ef4444';
                                            e.currentTarget.style.opacity = '1';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'rgba(0,0,0,0.5)';
                                            e.currentTarget.style.opacity = '0.7';
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {/* Card footer */}
                                <div style={{
                                    padding: '14px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                }}>
                                    <span style={{
                                        fontSize: 22,
                                        width: 36,
                                        height: 36,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'var(--color-primary-bg)',
                                        borderRadius: 8,
                                        flexShrink: 0,
                                    }}>
                                        {cat.icon}
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                        <h3 style={{
                                            fontSize: '0.95rem',
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}>
                                            {cat.name || cat.label}
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add Category Card */}
                        <div
                            onClick={openModal}
                            style={{
                                borderRadius: 16,
                                overflow: 'hidden',
                                border: '2px dashed var(--color-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                gap: 8,
                                minHeight: 194,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                color: 'var(--color-text-muted)',
                                background: 'transparent',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'var(--color-primary)';
                                e.currentTarget.style.color = 'var(--color-primary)';
                                e.currentTarget.style.background = 'var(--color-primary-bg)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--color-border)';
                                e.currentTarget.style.color = 'var(--color-text-muted)';
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <Plus size={28} />
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Agregar categoría</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    background: 'var(--color-primary-bg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <LayoutGrid size={20} color="var(--color-primary)" />
                                </div>
                                <h2>Nueva Categoría</h2>
                            </div>
                            <button
                                className="btn btn-icon btn-ghost"
                                onClick={() => setIsModalOpen(false)}
                                style={{ flexShrink: 0 }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {/* Preview */}
                            <div style={{
                                background: 'linear-gradient(135deg, #fff5f0, #fed7aa)',
                                borderRadius: 12,
                                padding: 20,
                                textAlign: 'center',
                                marginBottom: 20,
                            }}>
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    margin: '0 auto 8px',
                                    borderRadius: 16,
                                    background: 'var(--color-surface)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 32,
                                    boxShadow: 'var(--shadow-md)',
                                }}>
                                    {form.icon}
                                </div>
                                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                                    {form.name || 'Nombre de categoría'}
                                </p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                    Vista previa
                                </p>
                            </div>

                            {/* Name */}
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Type size={14} /> Nombre
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="Ej: Sushi, Tacos, Postres..."
                                    autoFocus
                                />
                            </div>

                            {/* Emoji */}
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Smile size={14} /> Icono
                                </label>
                                <div
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '10px 16px',
                                        border: '2px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s ease',
                                    }}
                                >
                                    <span style={{ fontSize: 28 }}>{form.icon}</span>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        Toca para cambiar el emoji
                                    </span>
                                </div>
                                {showEmojiPicker && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(8, 1fr)',
                                        gap: 4,
                                        padding: 12,
                                        marginTop: 8,
                                        background: 'var(--color-border-light)',
                                        borderRadius: 12,
                                    }}>
                                        {EMOJI_OPTIONS.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => {
                                                    setForm({ ...form, icon: emoji });
                                                    setShowEmojiPicker(false);
                                                }}
                                                style={{
                                                    fontSize: 22,
                                                    padding: 6,
                                                    border: 'none',
                                                    borderRadius: 8,
                                                    cursor: 'pointer',
                                                    background: form.icon === emoji ? 'var(--color-primary-bg)' : 'transparent',
                                                    transition: 'background 0.15s ease',
                                                }}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Image Upload */}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <ImageIcon size={14} /> Imagen (Opcional)
                                </label>
                                <div style={{ marginTop: 8 }}>
                                    <ImageUpload
                                        currentImage={form.image}
                                        onImageChange={(base64) => setForm({ ...form, image: base64 })}
                                        shape="banner"
                                        size={120}
                                        label=""
                                        id="cat-image"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={!form.name.trim()}
                                style={{ borderRadius: 10 }}
                            >
                                <Save size={16} /> Crear Categoría
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
