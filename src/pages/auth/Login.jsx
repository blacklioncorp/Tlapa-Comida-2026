import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { UtensilsCrossed, Truck, Store, Shield, Eye, EyeOff, LogIn, ChevronDown, ChevronUp } from 'lucide-react';

const CREDENTIALS_HINT = [
    { role: 'Admin', email: 'admin@tlapacomida.mx', pass: 'admin2024' },
    { role: 'Cliente', email: 'maria@ejemplo.com', pass: 'maria123' }
];

export default function Login() {
    const { login, loginAs, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [showCredentials, setShowCredentials] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) { setError('Ingresa tu correo o teléfono'); return; }
        if (!password.trim()) { setError('Ingresa tu contraseña'); return; }

        const result = await login(email.trim(), password);
        if (result.success) {
            // Success handler is now in onAuthStateChanged in AuthContext
            // Navigator will be handled by role redirect or home
        } else {
            // HACK DE DESARROLLO: Si las credenciales de prueba usadas no existen en Firebase, las creamos.
            const isTestUser = CREDENTIALS_HINT.find(c => c.email === email.trim() && c.pass === password);
            if (isTestUser) {
                try {
                    setError('Autocisando base de datos con esta credencial...');
                    await createUserWithEmailAndPassword(auth, email.trim(), password);
                    // AuthContext capturará la creación y ensamblará el rol correcto en la base de datos automáticamente
                    setError('');
                    return;
                } catch (registerErr) {
                    console.error("No se pudo auto-sembrar la cuenta de prueba:", registerErr);
                }
            }

            setError(result.error);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        const result = await loginWithGoogle();
        if (!result.success) {
            setError(result.error);
        }
    };

    const handleFillCredentials = (cred) => {
        setEmail(cred.email);
        setPassword(cred.pass);
        setError('');
    };

    return (
        <div className="app-container" style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
            <div style={{ padding: '48px 24px 24px', textAlign: 'center' }}>
                {/* Logo */}
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ee652b, #ff8a57)',
                    margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(238,101,43,0.3)'
                }}>
                    <span style={{ fontSize: 36 }}>🍽️</span>
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>
                    Tlapa <span style={{ color: 'var(--color-primary)' }}>Comida</span>
                </h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    Sabor local hasta tu puerta
                </p>
            </div>

            {/* Google Login */}
            <div style={{ padding: '0 24px 16px' }}>
                <button type="button" onClick={handleGoogleLogin} className="btn btn-outline btn-block btn-lg"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        background: 'white', border: '2px solid var(--color-border-light)', color: 'var(--color-text)'
                    }}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 18 }} />
                    Continuar con Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--color-border-light)' }}></div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>o con tu correo</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--color-border-light)' }}></div>
                </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} style={{ padding: '0 24px 16px' }}>
                {error && (
                    <div style={{
                        background: 'var(--color-error-bg)', color: 'var(--color-error)',
                        padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem', fontWeight: 600
                    }}>{error}</div>
                )}

                <div className="form-group">
                    <label className="form-label">Correo electrónico</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="tu@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Contraseña</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            style={{ paddingRight: 42 }}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                                color: 'var(--color-text-muted)',
                            }}>
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }}>
                    <LogIn size={18} /> Iniciar Sesión
                </button>

                <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    ¿No tienes cuenta?{' '}
                    <a href="/register" style={{ fontWeight: 700 }}>Regístrate</a>
                </p>
            </form>

            {/* Credentials Helper */}
            <div style={{ padding: '0 24px 16px' }}>
                <button onClick={() => setShowCredentials(!showCredentials)}
                    style={{
                        width: '100%', background: 'var(--color-border-light)', border: 'none',
                        borderRadius: 10, padding: '10px 16px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 600,
                    }}>
                    <span>🔑 Credenciales de prueba</span>
                    {showCredentials ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showCredentials && (
                    <div style={{
                        marginTop: 8, background: 'var(--color-surface)', borderRadius: 12,
                        border: '1px solid var(--color-border-light)', overflow: 'hidden',
                    }}>
                        {CREDENTIALS_HINT.map((cred, i) => (
                            <button key={i} onClick={() => handleFillCredentials(cred)}
                                style={{
                                    width: '100%', background: 'none', border: 'none',
                                    borderBottom: i < CREDENTIALS_HINT.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                                    padding: '10px 16px', cursor: 'pointer', textAlign: 'left',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    transition: 'background 0.15s',
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'var(--color-primary-bg)'}
                                onMouseOut={e => e.currentTarget.style.background = 'none'}>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-text)' }}>
                                        {cred.role}
                                    </span>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                        {cred.email}
                                    </p>
                                </div>
                                <span style={{
                                    fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-primary)',
                                    background: 'var(--color-primary-bg)', padding: '3px 8px', borderRadius: 6,
                                }}>Usar</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Login by Role removed per user request */}
        </div>
    );
}
