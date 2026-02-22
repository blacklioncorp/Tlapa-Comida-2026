import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '../../contexts/OrderContext';
import { MERCHANTS } from '../../data/seedData';
import { Star } from 'lucide-react';

function StarSelector({ rating, setRating }) {
    return (
        <div className="star-rating" style={{ justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map(star => (
                <button key={star} className={`star ${star <= rating ? 'filled' : ''}`}
                    onClick={() => setRating(star)}
                    style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
                    <Star size={36} fill={star <= rating ? '#fbbf24' : 'none'} color={star <= rating ? '#fbbf24' : '#d1d5db'} />
                </button>
            ))}
        </div>
    );
}

export default function OrderRating() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { orders, rateOrder } = useOrders();
    const order = orders.find(o => o.id === orderId);
    const [foodRating, setFoodRating] = useState(0);
    const [driverRating, setDriverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    if (!order) return null;

    const merchant = MERCHANTS.find(m => m.id === order.merchantId);

    const handleSubmit = () => {
        rateOrder(orderId, { food: foodRating, driver: driverRating, comment });
        setSubmitted(true);
        setTimeout(() => navigate('/'), 2000);
    };

    if (submitted) {
        return (
            <div className="app-container">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 32, textAlign: 'center' }}>
                    <span style={{ fontSize: 64, marginBottom: 16 }}>🎉</span>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>¡Gracias por tu opinión!</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Tu calificación nos ayuda a mejorar</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div style={{ padding: 24, textAlign: 'center' }}>
                <span style={{ fontSize: 64, display: 'block', marginBottom: 16, marginTop: 32 }}>🍽️</span>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>¡Gracias por tu pedido!</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>{order.orderNumber}</p>

                {/* Rate Food */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                        {merchant && <img src={merchant.logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
                        <h3 style={{ fontWeight: 700 }}>Califica tu comida</h3>
                    </div>
                    {merchant && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>{merchant.name}</p>}
                    <StarSelector rating={foodRating} setRating={setFoodRating} />
                </div>

                {/* Rate Driver */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                        }}>🛵</div>
                        <h3 style={{ fontWeight: 700 }}>Califica a tu repartidor</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>Carlos M.</p>
                    <StarSelector rating={driverRating} setRating={setDriverRating} />
                </div>

                {/* Comment */}
                <textarea className="form-input form-textarea"
                    placeholder="¿Qué te pareció el servicio? (opcional)"
                    value={comment} onChange={(e) => setComment(e.target.value)}
                    style={{ marginBottom: 24, textAlign: 'left' }} rows={3} />

                <button className="btn btn-primary btn-block btn-lg" onClick={handleSubmit}
                    disabled={foodRating === 0}>
                    Enviar calificación
                </button>

                <button className="btn btn-ghost btn-block" onClick={() => navigate('/')}
                    style={{ marginTop: 8 }}>
                    Omitir
                </button>
            </div>
        </div>
    );
}
