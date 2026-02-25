import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, LogIn, Mail, Lock } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showCredentials, setShowCredentials] = useState(false);

    // Get register from AuthContext to correctly seed users with roles
    const { login, loginWithGoogle, register } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) { setError('Ingresa tu correo electrónico'); return; }
        if (!password.trim()) { setError('Ingresa tu contraseña'); return; }

        setIsLoading(true);
        const result = await login(email.trim(), password);

        if (result.success) {
            // Success handler is in onAuthStateChanged
        } else {
            setError(result.error || 'Credenciales inválidas');
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        const result = await loginWithGoogle();
        if (!result.success) {
            setError(result.error);
            setIsLoading(false);
        }
    };



    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: '#f8fafc',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decorative Blobs */}
            <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(238,101,43,0.15) 0%, rgba(255,138,87,0) 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0) 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />

            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                zIndex: 1
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '440px',
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '32px',
                    padding: '40px 32px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255,255,255,0.5)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Brand Header */}
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '20px',
                            background: 'linear-gradient(135deg, #ee652b 0%, #ea580c 100%)',
                            margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 12px 24px rgba(234,88,12,0.3)',
                            transform: 'rotate(-5deg)'
                        }}>
                            <span style={{ fontSize: 32, transform: 'rotate(5deg)' }}>🍽️</span>
                        </div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                            ¡Bienvenido de nuevo!
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
                            Ingresa tus datos para continuar
                        </p>
                    </div>

                    {/* Google Login */}
                    <button type="button" onClick={handleGoogleLogin} disabled={isLoading}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '16px',
                            background: 'white', border: '1px solid #e2e8f0',
                            color: '#0f172a', fontSize: '1rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease', opacity: isLoading ? 0.7 : 1
                        }}
                        onMouseOver={e => !isLoading && (e.currentTarget.style.background = '#f8fafc')}
                        onMouseOut={e => !isLoading && (e.currentTarget.style.background = 'white')}
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 20, height: 20 }} />
                        Continuar con Google
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '24px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>O INTENTA CON TU CORREO</span>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {error && (
                            <div style={{
                                background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                                padding: '12px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <span style={{ fontSize: '1rem' }}>⚠️</span>
                                {error}
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                Correo Electrónico
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                    <Mail size={20} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="ejemplo@correo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{
                                        width: '100%', padding: '14px 16px 14px 44px',
                                        background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px',
                                        fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none'
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#ee652b'}
                                    onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                />
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                                    Contraseña
                                </label>
                                <a href="#" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ee652b', textDecoration: 'none' }}>
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        width: '100%', padding: '14px 44px',
                                        background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px',
                                        fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none'
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#ee652b'}
                                    onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                                        color: '#94a3b8', display: 'flex', alignItems: 'center'
                                    }}>
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading}
                            style={{
                                width: '100%', padding: '16px', borderRadius: '16px',
                                background: 'linear-gradient(135deg, #ee652b 0%, #ea580c 100%)',
                                color: 'white', border: 'none', fontSize: '1.05rem', fontWeight: 800,
                                cursor: isLoading ? 'wait' : 'pointer', marginTop: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: '0 10px 25px -5px rgba(234,88,12,0.4)', transition: 'transform 0.1s',
                                opacity: isLoading ? 0.7 : 1
                            }}
                            onMouseDown={e => !isLoading && (e.currentTarget.style.transform = 'scale(0.98)')}
                            onMouseUp={e => !isLoading && (e.currentTarget.style.transform = 'scale(1)')}
                            onMouseLeave={e => !isLoading && (e.currentTarget.style.transform = 'scale(1)')}
                        >
                            {isLoading ? 'Iniciando...' : (
                                <>
                                    <LogIn size={20} /> Iniciar Sesión
                                </>
                            )}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: '#64748b' }}>
                        ¿No tienes una cuenta? <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register'); }} style={{ color: '#ee652b', fontWeight: 800, textDecoration: 'none' }}>Regístrate</a>
                    </p>


                </div>
            </div>
        </div>
    );
}
