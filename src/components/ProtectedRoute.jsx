import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '4px solid var(--color-primary-bg)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Verificando acceso...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to their default dashboard if they try to access something they aren't allowed to
        const defaultPath =
            user.role === 'client' ? '/' :
                user.role === 'merchant' ? '/merchant' :
                    user.role === 'driver' ? '/delivery' :
                        '/admin';
        return <Navigate to={defaultPath} replace />;
    }

    return children;
}
