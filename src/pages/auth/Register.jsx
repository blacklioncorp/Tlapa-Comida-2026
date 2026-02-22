import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        displayName: '', email: '', phone: '', password: '', confirmPassword: '', role: 'client'
    });
    const [error, setError] = useState('');
    const [agreed, setAgreed] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!agreed) { setError('Debes aceptar los términos y condiciones'); return; }
        if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return; }
        if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }

        const result = await register(form);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
    };

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    return (
        <div className="app-container">
            <div className="page-header">
                <button className="btn btn-icon btn-ghost" onClick={() => navigate('/login')}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Crear Cuenta</h1>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
                {error && (
                    <div style={{
                        background: 'var(--color-error-bg)', color: 'var(--color-error)',
                        padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem', fontWeight: 600
                    }}>{error}</div>
                )}

                <div className="form-group">
                    <label className="form-label">Nombre completo</label>
                    <input className="form-input" placeholder="Tu nombre" value={form.displayName}
                        onChange={(e) => update('displayName', e.target.value)} required />
                </div>

                <div className="form-group">
                    <label className="form-label">Correo electrónico</label>
                    <input className="form-input" type="email" placeholder="tu@correo.com" value={form.email}
                        onChange={(e) => update('email', e.target.value)} required />
                </div>

                <div className="form-group">
                    <label className="form-label">Número de teléfono</label>
                    <input className="form-input" type="tel" placeholder="+52 757 123 4567" value={form.phone}
                        onChange={(e) => update('phone', e.target.value)} required />
                </div>

                <div className="form-group">
                    <label className="form-label">Contraseña</label>
                    <input className="form-input" type="password" placeholder="••••••••" value={form.password}
                        onChange={(e) => update('password', e.target.value)} required />
                </div>

                <div className="form-group">
                    <label className="form-label">Confirmar contraseña</label>
                    <input className="form-input" type="password" placeholder="••••••••" value={form.confirmPassword}
                        onChange={(e) => update('confirmPassword', e.target.value)} required />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, cursor: 'pointer' }}>
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        Acepto los <a href="#" style={{ fontWeight: 700 }}>términos y condiciones</a>
                    </span>
                </label>

                <button type="submit" className="btn btn-primary btn-block btn-lg">
                    Registrarse
                </button>

                <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" style={{ fontWeight: 700 }}>Iniciar sesión</Link>
                </p>
            </form>
        </div>
    );
}
