import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, ArrowLeft, Send, CheckCircle2, Loader2 } from 'lucide-react';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { sendPasswordResetEmail } = useAuth();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) {
            setError('Por favor ingresa tu correo electrónico');
            return;
        }

        setIsLoading(true);
        const result = await sendPasswordResetEmail(email.trim());
        if (result.success) {
            setIsSent(true);
        } else {
            setError(result.error);
        }
        setIsLoading(false);
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
                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            alignSelf: 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginBottom: '24px',
                            padding: '8px 0'
                        }}
                    >
                        <ArrowLeft size={18} /> Volver al inicio
                    </button>

                    {!isSent ? (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: '20px',
                                    background: 'linear-gradient(135deg, #ee652b 0%, #ea580c 100%)',
                                    margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 12px 24px rgba(234,88,12,0.3)'
                                }}>
                                    <Mail size={32} color="white" />
                                </div>
                                <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                                    Recuperar contraseña
                                </h1>
                                <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
                                    Te enviaremos un enlace para restablecer tu cuenta
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                                            required
                                            style={{
                                                width: '100%', padding: '14px 16px 14px 44px',
                                                background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px',
                                                fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={isLoading}
                                    style={{
                                        width: '100%', padding: '16px', borderRadius: '16px',
                                        background: 'linear-gradient(135deg, #ee652b 0%, #ea580c 100%)',
                                        color: 'white', border: 'none', fontSize: '1.05rem', fontWeight: 800,
                                        cursor: isLoading ? 'wait' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        boxShadow: '0 10px 25px -5px rgba(234,88,12,0.4)',
                                        opacity: isLoading ? 0.7 : 1
                                    }}
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            <Send size={20} /> Enviar enlace
                                        </>
                                    )}
                                </button>
                            </form>
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
                                ¡Correo enviado!
                            </h2>
                            <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '32px' }}>
                                Hemos enviado un enlace de recuperación a <strong>{email}</strong>.
                                Revisa tu bandeja de entrada (y la carpeta de spam).
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                style={{
                                    width: '100%', padding: '16px', borderRadius: '16px',
                                    background: '#f1f5f9', color: '#0f172a', border: 'none',
                                    fontWeight: 700, cursor: 'pointer'
                                }}
                            >
                                Volver al login
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
