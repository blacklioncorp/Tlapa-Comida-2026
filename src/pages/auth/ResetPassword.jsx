import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, ShieldCheck, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabase';

export default function ResetPassword() {
    const navigate = useNavigate();
    const { resetPassword } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        // Check if we have a valid recovery session
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsValidSession(true);
            } else {
                setError('El enlace de recuperación ha expirado o no es válido.');
            }
            setCheckingSession(false);
        };
        checkSession();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);
        const result = await resetPassword(password);
        if (result.success) {
            setIsSuccess(true);
        } else {
            setError(result.error);
        }
        setIsLoading(false);
    };

    if (checkingSession) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
            </div>
        );
    }

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
                    {!isSuccess ? (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: '20px',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 12px 24px rgba(16,185,129,0.3)',
                                    transform: 'rotate(-5deg)'
                                }}>
                                    <ShieldCheck size={32} color="white" />
                                </div>
                                <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                                    Nueva contraseña
                                </h1>
                                <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
                                    Ingresa tu nueva clave de acceso segura
                                </p>
                            </div>

                            {error && (
                                <div style={{
                                    marginBottom: '24px',
                                    background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                                    padding: '12px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600,
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                    <AlertCircle size={20} />
                                    {error}
                                </div>
                            )}

                            {isValidSession ? (
                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                            Contraseña nueva
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                                <Lock size={20} />
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                style={{
                                                    width: '100%', padding: '14px 44px',
                                                    background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px',
                                                    fontSize: '1rem', color: '#0f172a', outline: 'none'
                                                }}
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

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                            Confirmar contraseña
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                                <Lock size={20} />
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                style={{
                                                    width: '100%', padding: '14px 44px',
                                                    background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px',
                                                    fontSize: '1rem', color: '#0f172a', outline: 'none'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <button type="submit" disabled={isLoading}
                                        style={{
                                            width: '100%', padding: '16px', borderRadius: '16px',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white', border: 'none', fontSize: '1.05rem', fontWeight: 800,
                                            cursor: isLoading ? 'wait' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            boxShadow: '0 10px 25px -5px rgba(5,150,105,0.4)',
                                            opacity: isLoading ? 0.7 : 1
                                        }}
                                    >
                                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Actualizar contraseña'}
                                    </button>
                                </form>
                            ) : (
                                <button
                                    onClick={() => navigate('/forgot-password')}
                                    style={{
                                        width: '100%', padding: '16px', borderRadius: '16px',
                                        background: '#ee652b', color: 'white', border: 'none',
                                        fontWeight: 700, cursor: 'pointer'
                                    }}
                                >
                                    Solicitar nuevo enlace
                                </button>
                            )}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%',
                                background: '#f0fdf4',
                                margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid #bbf7d0'
                            }}>
                                <CheckCircle2 size={48} color="#16a34a" />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                                ¡Contraseña actualizada!
                            </h2>
                            <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '32px' }}>
                                Tu nueva contraseña ha sido establecida correctamente.
                                Ahora puedes volver a entrar al sistema.
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                style={{
                                    width: '100%', padding: '16px', borderRadius: '16px',
                                    background: '#10b981', color: 'white', border: 'none',
                                    fontWeight: 700, cursor: 'pointer',
                                    boxShadow: '0 10px 25px -5px rgba(16,185,129,0.3)'
                                }}
                            >
                                Iniciar sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
