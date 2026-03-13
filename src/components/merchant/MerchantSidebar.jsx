import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    LayoutDashboard, UtensilsCrossed, ShoppingBag,
    Settings, LogOut, X
} from 'lucide-react';

export default function MerchantSidebar({ isOpen, onClose }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/merchant' },
        { label: 'Menú / Platillos', icon: UtensilsCrossed, path: '/merchant/menu' },
        { label: 'Historial Pedidos', icon: ShoppingBag, path: '/merchant/orders' },
        { label: 'Ajustes Local', icon: Settings, path: '/merchant/settings' },
    ];

    const handleNav = (path) => {
        navigate(path);
        onClose?.();
    };

    const handleLogout = () => {
        logout();
        onClose?.();
    };

    return (
        <>
            {/* Overlay (mobile only) */}
            <div
                className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
                onClick={onClose}
            />

            <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`} style={{ background: '#111827' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="logo" style={{ color: 'white' }}>
                        Tlapa <span>Comercio</span>
                    </div>
                    {/* Close button - mobile only */}
                    <button
                        className="sidebar-close-btn"
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', color: '#9ca3af',
                            cursor: 'pointer', padding: 4, display: 'none'
                        }}
                    >
                        <X size={22} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                                onClick={() => handleNav(item.path)}
                                style={{ color: isActive ? 'white' : '#9ca3af' }}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div style={{ marginTop: 'auto' }}>
                    <button className="sidebar-link" onClick={handleLogout} style={{ color: '#ef4444' }}>
                        <LogOut size={18} /> Cerrar sesión
                    </button>
                </div>
            </aside>
        </>
    );
}
