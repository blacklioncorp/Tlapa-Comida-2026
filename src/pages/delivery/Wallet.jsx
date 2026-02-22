import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { ArrowLeft, TrendingUp, ArrowDownCircle } from 'lucide-react';

export default function Wallet() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { orders } = useOrders();
    const [toast, setToast] = useState('');

    const myDeliveries = orders.filter(o => o.driverId === user.id && o.status === 'delivered');

    let saldoFavor = 0;
    let deudaEfectivo = 0;

    myDeliveries.forEach(o => {
        const fee = o.totals.deliveryFee || 0;
        const total = o.totals.total || 0;

        // Asume que las propinas también estarían sumadas en "fee" (para simplificar por ahora)
        if (o.payment?.method === 'cash') {
            // Repartidor retuvo el efectivo físico total. Su ganancia ya la tiene.
            // Le debe a la app (total - su fee)
            deudaEfectivo += (total - fee);
        } else {
            // Pago digital, la app tiene el dinero. Le debe al repartidor su ganancia.
            saldoFavor += fee;
        }
    });

    const netBalance = saldoFavor - deudaEfectivo;

    const handleAction = () => {
        if (netBalance > 0) {
            setToast(`Retiro de $${netBalance.toFixed(0)} solicitado. Se procesará en 1-2 días hábiles.`);
        } else if (netBalance < 0) {
            setToast(`Se ha generado una referencia de pago para depositar $${Math.abs(netBalance).toFixed(0)} a OXXO.`);
        } else {
            setToast('No tienes balances pendientes.');
        }
        setTimeout(() => setToast(''), 4000);
    };

    // Generate weekly data
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const weekData = useMemo(() => days.map((day) => ({
        day,
        amount: Math.round(Math.random() * 200 + 50 + (myDeliveries.length * 10)),
    })), [myDeliveries.length]);
    const maxAmount = Math.max(...weekData.map(d => d.amount));

    return (
        <div className="app-container">
            <div className="page-header">
                <button className="btn btn-icon btn-ghost" onClick={() => navigate('/delivery')}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Mi Billetera</h1>
            </div>

            <div style={{ padding: 16 }}>
                {/* Financial Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>

                    {/* Saldo a Favor */}
                    <div style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        borderRadius: 16, padding: 24, color: 'white',
                        boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 600 }}>Saldo a Favor (Nube)</p>
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 4, letterSpacing: -1 }}>${saldoFavor.toFixed(2)}</h2>
                                <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Ganancias digitales y propinas acumuladas.</p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 12 }}>
                                <TrendingUp size={24} />
                            </div>
                        </div>
                    </div>

                    {/* Deuda por Efectivo */}
                    <div style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        borderRadius: 16, padding: 24, color: 'white',
                        boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 600 }}>Deuda por Efectivo</p>
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 4, letterSpacing: -1 }}>${deudaEfectivo.toFixed(2)}</h2>
                                <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Efectivo físico que cobraste a clientes (Restaurante + App).</p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 12 }}>
                                <ArrowDownCircle size={24} />
                            </div>
                        </div>
                    </div>

                    {/* Net Action */}
                    <div style={{
                        background: 'var(--color-surface)', border: '1px solid var(--color-border-light)',
                        borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Balance Neto</p>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: netBalance >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                                {netBalance >= 0 ? `+ $${netBalance.toFixed(2)}` : `- $${Math.abs(netBalance).toFixed(2)}`}
                            </h3>
                        </div>
                        <button className={`btn ${netBalance >= 0 ? 'btn-primary' : 'btn-error'}`} onClick={handleAction}>
                            {netBalance >= 0 ? 'Retirar Fondos' : 'Depositar Efectivo'}
                        </button>
                    </div>
                </div>

                {/* Weekly Chart */}
                <h3 className="section-title">Resumen Semanal</h3>
                <div style={{
                    background: 'var(--color-surface)', borderRadius: 12, padding: 20,
                    border: '1px solid var(--color-border-light)', marginBottom: 24,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, gap: 8 }}>
                        {weekData.map((d, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                                    ${d.amount}
                                </span>
                                <div style={{
                                    width: '100%', height: `${(d.amount / maxAmount) * 80}px`,
                                    background: i === new Date().getDay() - 1 ? 'var(--color-primary)' : 'var(--color-primary-bg)',
                                    borderRadius: 6,
                                    transition: 'height 0.3s ease',
                                }} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{d.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* History */}
                <h3 className="section-title">Historial de Actividad</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {myDeliveries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                            <p>Aún no hay entregas</p>
                        </div>
                    ) : (
                        myDeliveries.map(order => (
                            <div key={order.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: 14, background: 'var(--color-surface)',
                                border: '1px solid var(--color-border-light)', borderRadius: 12,
                            }}>
                                <div>
                                    <h4 style={{ fontWeight: 700, fontSize: '0.9rem' }}>{order.orderNumber}</h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        {new Date(order.createdAt).toLocaleDateString('es-MX')}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontWeight: 800, color: order.payment?.method === 'cash' ? 'var(--color-error)' : 'var(--color-success)' }}>
                                        {order.payment?.method === 'cash' ? `- $${(order.totals.total - order.totals.deliveryFee).toFixed(0)}` : `+ $${order.totals.deliveryFee.toFixed(0)}`}
                                    </p>
                                    <span className={`badge ${order.payment?.method === 'cash' ? 'badge-error' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                                        {order.payment?.method === 'cash' ? 'Cobro en Efectivo' : 'Ganancia Nube'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Toast */}
            {toast && <div className="toast success">{toast}</div>}
        </div>
    );
}
