import { useState } from 'react';
import { MapPin, X, Save } from 'lucide-react';

export default function AddressModal({ currentAddress, onSave, onClose }) {
    const [address, setAddress] = useState(currentAddress || {
        label: 'Casa',
        street: '',
        colony: 'Centro',
        reference: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!address.street.trim()) return;
        onSave(address);
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ maxWidth: 400, padding: 24, borderRadius: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MapPin color="var(--color-primary)" /> {currentAddress ? 'Editar Dirección' : 'Agregar Dirección'}
                    </h2>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Nombre (Ej: Casa, Oficina)</label>
                        <input
                            className="form-input"
                            value={address.label}
                            onChange={e => setAddress({ ...address, label: e.target.value })}
                            placeholder="Ej: Casa"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Calle y Número *</label>
                        <input
                            className="form-input"
                            value={address.street}
                            onChange={e => setAddress({ ...address, street: e.target.value })}
                            placeholder="Ej: Calle Morelos 123"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Colonia / Barrio</label>
                        <input
                            className="form-input"
                            value={address.colony}
                            onChange={e => setAddress({ ...address, colony: e.target.value })}
                            placeholder="Ej: Centro"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Referencia (Opcional)</label>
                        <textarea
                            className="form-input form-textarea"
                            value={address.reference}
                            onChange={e => setAddress({ ...address, reference: e.target.value })}
                            placeholder="Ej: Fachada azul, junto a la tienda"
                            rows={2}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: 12 }}>
                        <Save size={18} /> Guardar Dirección
                    </button>
                </form>
            </div>
        </div>
    );
}
