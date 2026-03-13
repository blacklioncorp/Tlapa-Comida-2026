import { useState, useEffect } from 'react';
import { X, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WelcomePromoModal() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if the user has already seen the promo in this session/device
        const hasSeenPromo = localStorage.getItem('tlapa_seen_welcome_promo_v1');
        
        if (!hasSeenPromo) {
            // Slight delay to allow the home page to load first
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('tlapa_seen_welcome_promo_v1', 'true');
    };

    const handleUseCoupon = () => {
        handleClose();
        navigate('/promotions');
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999, // Super high z-index to appear over everything
            padding: 24,
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes popUp { 
                    0% { transform: scale(0.8) translateY(20px); opacity: 0; } 
                    100% { transform: scale(1) translateY(0); opacity: 1; } 
                }
            `}</style>
            
            <div style={{
                background: 'linear-gradient(145deg, #ff7e5f 0%, #feb47b 100%)',
                borderRadius: 24,
                width: '100%',
                maxWidth: 360,
                position: 'relative',
                animation: 'popUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                overflow: 'hidden'
            }}>
                {/* Close Button */}
                <button 
                    onClick={handleClose}
                    style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        zIndex: 10
                    }}
                >
                    <X size={20} />
                </button>

                {/* Decorative Elements */}
                <div style={{ position: 'absolute', top: -40, left: -40, width: 120, height: 120, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.15)', borderRadius: '50%' }} />

                <div style={{ padding: '40px 24px 32px', textAlign: 'center', position: 'relative' }}>
                    
                    <div style={{ 
                        background: 'white', 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%', 
                        margin: '0 auto 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                    }}>
                        <Gift size={40} color="#ff7e5f" />
                    </div>

                    <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, marginBottom: 8, lineHeight: 1.2 }}>
                        ¡Tienes un cupón<br/>pendiente por usar!
                    </h2>
                    
                    <div style={{ 
                        background: 'rgba(255,255,255,0.2)', 
                        backdropFilter: 'blur(10px)',
                        padding: '12px 24px', 
                        borderRadius: 100, 
                        display: 'inline-block',
                        marginBottom: 24,
                        border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                        <span style={{ color: 'white', fontSize: '2.5rem', fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            20% OFF
                        </span>
                    </div>

                    <p style={{ color: 'white', fontSize: '0.9rem', marginBottom: 24, opacity: 0.9 }}>
                        En tu primer pedido con el código <strong>TLAPA20</strong>. ¡Aprovecha ahora!
                    </p>

                    <button 
                        onClick={handleUseCoupon}
                        style={{
                            background: 'white',
                            color: '#ff7e5f',
                            border: 'none',
                            padding: '16px 32px',
                            borderRadius: 100,
                            fontWeight: 800,
                            fontSize: '1.1rem',
                            width: '100%',
                            cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                            transition: 'transform 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Usa tu cupón
                    </button>
                    
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            opacity: 0.7,
                            marginTop: 16,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        Quizá más tarde
                    </button>
                </div>
            </div>
        </div>
    );
}
