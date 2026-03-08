import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Camera, Check, Upload, FileText, AlertCircle, ShieldCheck, User, Loader2 } from 'lucide-react';
import { uploadDriverDocument, updateDriverDocumentMeta, updateDriverSelfie } from '../../services/OnboardingService';

export default function Register() {
    const { register, user: authUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Step Control
    const initialRole = searchParams.get('role') || 'client';
    const [step, setStep] = useState(1); // 1: Basic, 2: Selfie, 3: Documents

    // Form States
    const [form, setForm] = useState({
        displayName: '', email: '', phone: '', password: '', confirmPassword: '', role: initialRole
    });
    const [error, setError] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [regResult, setRegResult] = useState(null);

    // Step 2 & 3 Specific States
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [capturedSelfie, setCapturedSelfie] = useState(null);
    const [uploadProgress, setUploadProgress] = useState({});
    const [documents, setDocuments] = useState({
        ine_front: null,
        ine_back: null,
        license: null,
        rfc: null,
        curp: null,
        non_criminal: null,
        address_proof: null
    });

    const isDriver = form.role === 'driver';

    useEffect(() => {
        if (step === 2 && isDriver) {
            startCamera();
        }
    }, [step]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setError('No se pudo acceder a la cámara. Por favor verifica los permisos.');
        }
    };

    const takePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            setCapturedSelfie({ blob, url });
        }, 'image/jpeg', 0.82);
    };

    const handleSubmitStep1 = async (e) => {
        e.preventDefault();
        setError('');
        if (!agreed) { setError('Debes aceptar los términos y condiciones'); return; }
        if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return; }
        if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }

        setIsLoading(true);
        const result = await register(form);
        if (result.success) {
            setRegResult(result.user);
            if (isDriver) {
                setStep(2);
            } else {
                navigate('/');
            }
        } else {
            setError(result.error);
        }
        setIsLoading(false);
    };

    const handleSelfieSubmit = async () => {
        if (!capturedSelfie) return;
        setIsLoading(true);
        try {
            const url = await uploadDriverDocument(regResult.id, 'selfie', capturedSelfie.blob);
            await updateDriverSelfie(regResult.id, url);
            setStep(3);
        } catch (err) {
            setError('Error al subir la fotografía. Reintenta.');
        }
        setIsLoading(false);
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            setDocuments(prev => ({ ...prev, [type]: file }));
        }
    };

    const handleFinishOnboarding = async () => {
        const required = ['ine_front', 'ine_back', 'license', 'rfc', 'curp', 'non_criminal', 'address_proof'];
        const missing = required.filter(r => !documents[r]);

        if (missing.length > 0) {
            setError('Por favor sube todos los documentos obligatorios.');
            return;
        }

        setIsLoading(true);
        try {
            const urls = {};
            for (const docType of required) {
                setUploadProgress(prev => ({ ...prev, [docType]: 'uploading' }));
                const url = await uploadDriverDocument(regResult.id, docType, documents[docType]);
                urls[docType] = url;
                setUploadProgress(prev => ({ ...prev, [docType]: 'done' }));
            }
            await updateDriverDocumentMeta(regResult.id, urls);
            setStep(4); // Success screen
        } catch (err) {
            setError('Error al subir documentos. Reintenta.');
        }
        setIsLoading(false);
    };

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    // --- RENDER HELPERS ---
    const renderStep1 = () => (
        <form onSubmit={handleSubmitStep1} style={{ padding: 24 }}>
            {error && <div className="error-box">{error}</div>}

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

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Siguiente'}
            </button>

            {isDriver && (
                <div style={{ marginTop: 16, padding: 12, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd', display: 'flex', gap: 10 }}>
                    <ShieldCheck size={20} color="#0369a1" />
                    <p style={{ fontSize: '0.75rem', color: '#0369a1', margin: 0 }}>
                        Estás registrándote como <strong>Repartidor</strong>. Prepararemos tu expediente legal en los siguientes pasos.
                    </p>
                </div>
            )}
        </form>
    );

    const renderStep2 = () => (
        <div style={{ padding: 24, textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>Identidad Visual</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
                Captura una selfie clara de tu rostro para tu perfil operativo.
            </p>

            <div style={{
                position: 'relative', width: '100%', aspectRatio: '1/1', background: '#000',
                borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--color-primary)',
                marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {!capturedSelfie ? (
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                ) : (
                    <img src={capturedSelfie.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Selfie" />
                )}

                {/* Guide Overlay */}
                {!capturedSelfie && (
                    <div style={{ position: 'absolute', inset: 0, border: '60px solid rgba(0,0,0,0.3)', borderRadius: '50%', pointerEvents: 'none' }} />
                )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                {!capturedSelfie ? (
                    <button onClick={takePhoto} className="btn btn-primary btn-block btn-lg">
                        <Camera size={20} style={{ marginRight: 8 }} /> Tomar Foto
                    </button>
                ) : (
                    <>
                        <button onClick={() => setCapturedSelfie(null)} className="btn btn-ghost btn-block btn-lg" disabled={isLoading}>
                            Repetir
                        </button>
                        <button onClick={handleSelfieSubmit} className="btn btn-primary btn-block btn-lg" disabled={isLoading}>
                            {isLoading ? 'Subiendo...' : 'Confirmar'}
                        </button>
                    </>
                )}
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );

    const renderStep3 = () => {
        const docs = [
            { id: 'ine_front', label: 'INE / Identificación (Frente)' },
            { id: 'ine_back', label: 'INE / Identificación (Reverso)' },
            { id: 'license', label: 'Licencia de Conducir Vigente' },
            { id: 'rfc', label: 'RFC (Constancia Fiscal)' },
            { id: 'curp', label: 'CURP (Formato reciente)' },
            { id: 'non_criminal', label: 'Carta No Antecedentes' },
            { id: 'address_proof', label: 'Comprobante Domicilio (< 3 meses)' }
        ];

        return (
            <div style={{ padding: 24 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>Expediente Legal</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
                    Sube fotos o PDFs legibles de tus documentos.
                </p>

                <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
                    {docs.map(d => (
                        <label key={d.id} className="doc-upload-card" style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '2px dashed var(--color-border)',
                            borderRadius: 12, cursor: 'pointer', transition: '0.2s',
                            borderColor: documents[d.id] ? 'var(--color-success)' : 'var(--color-border)',
                            background: documents[d.id] ? '#f0fdf4' : 'transparent'
                        }}>
                            <input type="file" onChange={(e) => handleFileChange(e, d.id)} hidden accept="image/*,.pdf" />
                            {documents[d.id] ? (
                                <Check size={20} color="var(--color-success)" />
                            ) : (
                                <Upload size={20} color="var(--color-text-muted)" />
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{d.label}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    {documents[d.id] ? documents[d.id].name : 'Sin archivo seleccionado'}
                                </div>
                            </div>
                            {uploadProgress[d.id] === 'uploading' && <Loader2 size={16} className="animate-spin" />}
                        </label>
                    ))}
                </div>

                <button onClick={handleFinishOnboarding} className="btn btn-primary btn-block btn-lg" disabled={isLoading}>
                    {isLoading ? 'Subiendo Expediente...' : 'Finalizar Registro'}
                </button>
            </div>
        );
    };

    const renderSuccess = () => (
        <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{
                width: 80, height: 80, background: 'var(--color-success-bg)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
            }}>
                <ShieldCheck size={40} color="var(--color-success)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>¡Expediente Recibido!</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>
                Tu solicitud está en revisión. Te notificaremos por correo cuando tu cuenta sea aprobada para comenzar a repartir.
            </p>
            <button onClick={() => navigate('/')} className="btn btn-primary btn-block">
                Entendido
            </button>
        </div>
    );

    return (
        <div className="app-container">
            <div className="page-header">
                {step === 1 && (
                    <button className="btn btn-icon btn-ghost" onClick={() => navigate('/login')}>
                        <ArrowLeft size={20} />
                    </button>
                )}
                <h1>{step === 1 ? 'Crear Cuenta' : isDriver ? 'Onboarding Delivery' : 'Registro'}</h1>
            </div>

            <style>{`
                .error-box {
                    background: var(--color-error-bg); color: var(--color-error);
                    padding: 10px 16px; borderRadius: 8; marginBottom: 16; fontSize: 0.875rem; fontWeight: 600;
                }
                .doc-upload-card:hover { border-color: var(--color-primary); background: #f8fafc; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderSuccess()}

            {step === 1 && (
                <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem', color: 'var(--color-text-secondary)', paddingBottom: 40 }}>
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" style={{ fontWeight: 700 }}>Iniciar sesión</Link>
                </p>
            )}
        </div>
    );
}
