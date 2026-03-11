import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    BarChart3, Store, LayoutGrid, Users, Truck, ShoppingBag,
    Gift, DollarSign, Settings, LogOut, X
} from 'lucide-react';

export default function AdminSidebar({ isOpen, onClose }) {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { path: '/admin', icon: BarChart3, label: 'Dashboard' },
        { path: '/admin/merchants', icon: Store, label: 'Comercios' },
        { path: '/admin/categories', icon: LayoutGrid, label: 'Categorías' },
        { path: '/admin/users', icon: Users, label: 'Usuarios' },
        { path: '/admin/delivery', icon: Truck, label: 'Repartidores' },
        { path: '/admin/orders', icon: ShoppingBag, label: 'Pedidos' },
        { path: '/admin/promotions', icon: Gift, label: 'Promociones' },
        { path: '/admin/finance', icon: DollarSign, label: 'Finanzas' },
        { path: '/admin/settings', icon: Settings, label: 'Ajustes' }
    ];

    const handleNavigation = (path) => {
        navigate(path);
        if (onClose) onClose();
    };

    const handleLogout = () => {
        if (onClose) onClose();
        logout();
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside className={`admin-sidebar ${isOpen ? 'mobile-open' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
                    <div className="logo" style={{ marginBottom: 0 }}>Tlapa <span>Comida</span></div>

                    {/* Close button for mobile */}
                    <button
                        className="mobile-close-btn"
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                            onClick={() => handleNavigation(item.path)}
                        >
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto' }}>
                    <button className="sidebar-link" onClick={handleLogout}>
                        <LogOut size={18} /> Cerrar sesión
                    </button>
                </div>
            </aside>
        </>
    );
}
