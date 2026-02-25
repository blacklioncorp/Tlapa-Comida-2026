import { useNavigate } from 'react-router-dom';
import { useOrders } from '../../contexts/OrderContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { ORDER_STATUSES } from '../../data/seedData';
import { supabase } from '../../supabase';
import { ArrowLeft } from 'lucide-react';

export default function ClientOrders() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getOrdersByRole } = useOrders();
    const myOrders = getOrdersByRole(user.id, 'client');
    const [merchantsDict, setMerchantsDict] = useState({});

    useEffect(() => {
        const fetchMerchants = async () => {
            const uniqueIds = [...new Set(myOrders.map(o => o.merchantId))];
            if (uniqueIds.length === 0) return;
            const { data } = await supabase.from('merchants').select('id, name, logoUrl').in('id', uniqueIds);
            if (data) {
                const dict = {};
                data.forEach(m => dict[m.id] = m);
                setMerchantsDict(dict);
            }
        };
        fetchMerchants();
    }, [myOrders.length]);

    return (
        <div className="app-container">
            <div className="page-header">
                <button className="btn btn-icon btn-ghost" onClick={() => navigate('/')}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Mis Pedidos</h1>
            </div>

            <div style={{ padding: 16 }}>
                {myOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <span style={{ fontSize: 64, display: 'block', marginBottom: 16 }}>📋</span>
                        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Sin pedidos aún</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>¡Haz tu primer pedido!</p>
                        <button className="btn btn-primary" onClick={() => navigate('/')}>Ver restaurantes</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {myOrders.map(order => {
                            const merchant = merchantsDict[order.merchantId];
                            const statusInfo = ORDER_STATUSES[order.status];
                            const isActive = !['delivered', 'cancelled'].includes(order.status);
                            return (
                                <div key={order.id} className="card card-flat" style={{ borderRadius: 12 }}
                                    onClick={() => navigate(isActive ? `/tracking/${order.id}` : order.status === 'delivered' && !order.rating ? `/rating/${order.id}` : '#')}
                                >
                                    <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                                        {merchant && <img src={merchant.logoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <h4 style={{ fontWeight: 700 }}>{merchant?.name || 'Restaurante'}</h4>
                                                <span className={`badge badge-${statusInfo?.color || 'primary'}`}>
                                                    {statusInfo?.icon} {statusInfo?.label}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                {order.orderNumber} · {new Date(order.createdAt).toLocaleDateString('es-MX')}
                                            </p>
                                            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: 4 }}>
                                                ${order.totals.total.toFixed(2)} · {order.items.length} producto{order.items.length > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
