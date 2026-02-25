import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { ArrowLeft, TrendingUp, Calendar, Clock, ChevronRight, DollarSign, Wallet as WalletIcon, CheckCircle } from 'lucide-react';

export default function Wallet() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { orders } = useOrders();
    const [activeTab, setActiveTab] = useState('Semana');
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const myDeliveries = orders.filter(o => o.driverId === user.id && o.status === 'delivered');

    let saldoFavor = 0;
    let deudaEfectivo = 0;

    myDeliveries.forEach(o => {
        const fee = o.totals.deliveryFee || 0;
        const total = o.totals.total || 0;

        if (o.payment?.method === 'cash') {
            deudaEfectivo += (total - fee);
        } else {
            saldoFavor += fee;
        }
    });

    const netBalance = saldoFavor - deudaEfectivo;
    const withdrawable = netBalance > 0 ? netBalance : 0;

    const handleWithdraw = () => {
        setIsWithdrawing(true);
        setTimeout(() => {
            setIsWithdrawing(false);
            setShowWithdrawModal(false);
            alert(`¡Retiro de $${withdrawable.toFixed(2)} procesado exitosamente!`);
        }, 1500);
    };

    // Generate weekly data for the chart
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const weekData = useMemo(() => days.map((day, idx) => ({
        day,
        amount: Math.round(idx === 6 ? 0 : Math.random() * 300 + 100), // dummy data
        isActive: idx === new Date().getDay() - 1 // approximate current day
    })), []);
    const maxAmount = Math.max(...weekData.map(d => d.amount), 500); // 500 fallback

    // Group deliveries by approximate day for the list
    const recentActivity = [
        { date: 'Jueves 20, Ago', deliveries: 12, amount: 450.00 },
        { date: 'Miércoles 19, Ago', deliveries: 15, amount: 650.00 },
        { date: 'Martes 18, Ago', deliveries: 8, amount: 280.00 },
        { date: 'Lunes 17, Ago', deliveries: 18, amount: 820.00 },
    ];

    return (
        <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
            {/* Header */}
            <div style={{ background: 'white', padding: '16px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #f1f5f9' }}>
                <button style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => navigate('/delivery')}>
                    <ArrowLeft size={20} color="#0f172a" />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, flex: 1, textAlign: 'center', paddingRight: 40 }}>Mis Ganancias</h1>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {/* Main Balance Card */}
                <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: 24, padding: 24, color: 'white', marginBottom: 24, boxShadow: '0 10px 25px rgba(16,185,129,0.3)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.9, marginBottom: 8 }}>Esta Semana</p>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>${withdrawable.toFixed(2)}</h2>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(4px)' }}>
                        <Calendar size={14} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Próximo depósito: Lunes 24</span>
                    </div>
                </div>

                {/* Deuda Efectivo banner (if negative) */}
                {netBalance < 0 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 16, padding: '16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: '#ef4444', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <DollarSign size={20} color="white" />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#991b1b', fontWeight: 700 }}>Deuda por Efectivo</p>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#7f1d1d' }}>${Math.abs(netBalance).toFixed(2)}</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#b91c1c' }}>Paga en OXXO para evitar bloqueo.</p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 24 }}>
                    {['Semana', 'Mes', 'Histórico'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                            background: activeTab === tab ? 'white' : 'transparent',
                            color: activeTab === tab ? '#0f172a' : '#64748b',
                            boxShadow: activeTab === tab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}>
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Chart */}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Resumen de la semana</h3>
                <div style={{ background: 'white', borderRadius: 20, padding: '24px 16px', border: '1px solid #f1f5f9', marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 140, gap: 8 }}>
                        {weekData.map((d, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: d.isActive ? '#10b981' : '#94a3b8' }}>
                                    ${d.amount}
                                </span>
                                <div style={{
                                    width: '100%', maxWidth: 32, height: `${(d.amount / maxAmount) * 100}px`,
                                    background: d.isActive ? '#10b981' : '#e2e8f0',
                                    borderRadius: 6, transition: 'height 0.3s ease'
                                }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{d.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* List */}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Actividad Reciente</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 80 }}>
                    {recentActivity.map((item, idx) => (
                        <div key={idx} style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ background: '#f8fafc', width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Clock size={20} color="#94a3b8" />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{item.date}</h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{item.deliveries} entregas</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>${item.amount.toFixed(2)}</span>
                                <ChevronRight size={16} color="#cbd5e1" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Withdraw Button Fixed at Bottom */}
            {withdrawable > 0 && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: 'white', borderTop: '1px solid #f1f5f9', zIndex: 10 }}>
                    <button onClick={() => setShowWithdrawModal(true)} style={{ width: '100%', padding: '18px', background: '#ea580c', color: 'white', border: 'none', borderRadius: 16, fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(234,88,12,0.3)' }}>
                        Retirar Ganancias
                    </button>
                </div>
            )}

            {/* Withdraw Modal Overlay */}
            {showWithdrawModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: 480, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, animation: 'slideUp 0.3s ease' }}>
                        <div style={{ width: 40, height: 5, background: '#cbd5e1', borderRadius: 3, margin: '0 auto 24px' }} />

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', marginBottom: 24, color: '#0f172a' }}>Retirar a Banco</h2>

                        <div style={{ background: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                <span style={{ color: '#64748b', fontWeight: 600 }}>Monto disponible</span>
                                <span style={{ fontWeight: 800, color: '#0f172a' }}>${withdrawable.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px dashed #cbd5e1', marginBottom: 16 }}>
                                <span style={{ color: '#64748b', fontWeight: 600 }}>Comisión</span>
                                <span style={{ fontWeight: 700, color: '#ea580c' }}>-$15.00</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Recibirás</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>${(withdrawable - 15).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div style={{ border: '2px solid #10b981', background: '#ecfdf5', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, cursor: 'pointer' }}>
                            <div style={{ background: 'white', width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <WalletIcon size={20} color="#10b981" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>BBVA</h4>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>**** 4567</p>
                            </div>
                            <CheckCircle size={24} color="#10b981" />
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setShowWithdrawModal(false)} disabled={isWithdrawing} style={{ flex: 1, padding: '16px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={handleWithdraw} disabled={isWithdrawing} style={{ flex: 2, padding: '16px', background: '#ea580c', color: 'white', border: 'none', borderRadius: 16, fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(234,88,12,0.3)' }}>
                                {isWithdrawing ? 'Procesando...' : 'Confirmar Retiro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
