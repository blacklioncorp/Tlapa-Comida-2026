import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Save } from 'lucide-react';
import { supabase } from '../supabase';
import ImageUpload from './ImageUpload';

export default function ModifierDishModal({ merchantId, editingItem, onClose, existingCategories = [] }) {
    // Estado base del platillo
    const [formData, setFormData] = useState({
        name: editingItem?.name || '',
        description: editingItem?.description || '',
        basePrice: editingItem?.price || 0, // Migramos de 'price' a 'basePrice'
        category: editingItem?.category || '',
        imageUrl: editingItem?.image || '',
        isAvailable: editingItem?.isAvailable ?? true,
        // Estado de Modificadores inicializado dinámicamente
        modifierGroups: editingItem?.modifiers || editingItem?.modifierGroups || []
    });

    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState('');

    useEffect(() => {
        if (editingItem?.category && !existingCategories.includes(editingItem.category)) {
            setIsCustomCategory(true);
            setCustomCategory(editingItem.category);
        }
    }, [editingItem, existingCategories]);

    // ---- MANEJADORES DE MODIFICADORES ---- //
    const addModifierGroup = () => {
        setFormData(prev => ({
            ...prev,
            modifierGroups: [
                ...prev.modifierGroups,
                {
                    id: `group_${Date.now()}`,
                    name: '',
                    isRequired: false,
                    minSelections: 0,
                    maxSelections: 1,
                    options: []
                }
            ]
        }));
    };

    const updateGroup = (groupIndex, field, value) => {
        const newGroups = [...formData.modifierGroups];
        newGroups[groupIndex][field] = value;
        setFormData({ ...formData, modifierGroups: newGroups });
    };

    const removeGroup = (groupIndex) => {
        const newGroups = [...formData.modifierGroups];
        newGroups.splice(groupIndex, 1);
        setFormData({ ...formData, modifierGroups: newGroups });
    };

    // ---- MANEJADORES DE OPCIONES ---- //
    const addOption = (groupIndex) => {
        const newGroups = [...formData.modifierGroups];
        newGroups[groupIndex].options.push({
            id: `opt_${Date.now()}`,
            name: '',
            priceExtra: 0,
            isAvailable: true
        });
        setFormData({ ...formData, modifierGroups: newGroups });
    };

    const updateOption = (groupIndex, optionIndex, field, value) => {
        const newGroups = [...formData.modifierGroups];
        newGroups[groupIndex].options[optionIndex][field] = value;
        setFormData({ ...formData, modifierGroups: newGroups });
    };

    const removeOption = (groupIndex, optionIndex) => {
        const newGroups = [...formData.modifierGroups];
        newGroups[groupIndex].options.splice(optionIndex, 1);
        setFormData({ ...formData, modifierGroups: newGroups });
    };

    // ---- GUARDAR EN SUPABASE ---- //
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const isNew = !editingItem?.id;
            const itemId = editingItem?.id || `item-${Date.now()}`;

            const payload = {
                id: itemId,
                merchantId,
                name: formData.name,
                description: formData.description,
                price: Number(formData.basePrice),
                originalPrice: Number(formData.basePrice),
                category: isCustomCategory ? customCategory : formData.category,
                imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
                isAvailable: formData.isAvailable,
                modifiers: formData.modifierGroups
            };

            if (isNew) {
                const { error } = await supabase.from('products').insert([payload]);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('products').update({ ...payload, updatedAt: new Date().toISOString() }).eq('id', itemId);
                if (error) throw error;
            }

            onClose(); // Cierra el modal tras guardar exitosamente
        } catch (error) {
            console.error("Error al guardar el platillo: ", error);
            alert("No se pudo guardar la configuración.");
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content" style={{ maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h2>{editingItem ? 'Editar Platillo' : 'Nuevo Platillo'}</h2>
                    <button className="btn btn-icon btn-ghost" type="button" onClick={onClose}><X /></button>
                </div>

                <form onSubmit={handleSave} style={{ padding: 24 }}>
                    {/* CAMPOS BASE DEL PLATILLO (Name, Desc, Price...) */}
                    <div className="form-group">
                        <label className="form-label">Nombre del Platillo</label>
                        <input className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Ej. Hamburguesa Doble" />
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Precio Base ($)</label>
                            <input type="number" step="0.5" className="form-input" value={formData.basePrice} onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })} required placeholder="0.00" />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Categoría</label>
                            <select
                                className="form-input"
                                value={isCustomCategory ? 'OTHER' : formData.category}
                                onChange={(e) => {
                                    if (e.target.value === 'OTHER') {
                                        setIsCustomCategory(true);
                                    } else {
                                        setIsCustomCategory(false);
                                        setFormData({ ...formData, category: e.target.value });
                                    }
                                }}
                                required
                            >
                                <option value="" disabled>Seleccionar...</option>
                                {existingCategories.map((cat, idx) => (
                                    <option key={idx} value={cat}>{cat}</option>
                                ))}
                                <option value="OTHER">+ Nueva Categoría</option>
                            </select>
                        </div>
                    </div>

                    {isCustomCategory && (
                        <div className="form-group" style={{ marginTop: -8, marginBottom: 20 }}>
                            <label className="form-label">Nombre de Categoría Nueva</label>
                            <input
                                className="form-input"
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                required
                                placeholder="Ej: Especialidades de la Casa"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Descripción</label>
                        <textarea className="form-input" rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required placeholder="Ingredientes y descripción..." />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Fotografía del Platillo (Opcional)</label>
                        <div style={{ marginTop: 8 }}>
                            <ImageUpload
                                currentImage={formData.imageUrl}
                                onImageChange={(base64) => setFormData({ ...formData, imageUrl: base64 })}
                                shape="banner"
                                size={140}
                                label=""
                                id="dish-image"
                            />
                        </div>
                    </div>

                    <hr style={{ margin: '32px 0 24px', borderColor: 'var(--color-border-light)' }} />

                    {/* SECCIÓN DINÁMICA DE GRUPOS DE MODIFICADORES */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Modificadores</h3>
                        <button type="button" className="btn btn-primary btn-sm" onClick={addModifierGroup}>
                            <Plus size={16} style={{ marginRight: 6 }} /> Agregar Grupo
                        </button>
                    </div>

                    {formData.modifierGroups.map((group, gIdx) => (
                        <div key={group.id} style={{ background: 'var(--color-surface-hover)', padding: 16, borderRadius: 12, marginBottom: 24, border: '1px solid var(--color-border-light)' }}>

                            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Nombre del Grupo (Ej. Tamaño)</label>
                                    <input className="form-input" value={group.name} onChange={(e) => updateGroup(gIdx, 'name', e.target.value)} required placeholder="Nombre del grupo..." />
                                </div>
                                <div style={{ width: 100 }}>
                                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Es Obligatorio</label>
                                    <select className="form-input" value={group.isRequired} onChange={(e) => updateGroup(gIdx, 'isRequired', e.target.value === 'true')}>
                                        <option value={true}>Sí</option>
                                        <option value={false}>No</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Mínimo de Selecciones</label>
                                    <input type="number" min="0" className="form-input" value={group.minSelections} onChange={(e) => updateGroup(gIdx, 'minSelections', parseInt(e.target.value) || 0)} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Máximo de Selecciones</label>
                                    <input type="number" min="1" className="form-input" value={group.maxSelections} onChange={(e) => updateGroup(gIdx, 'maxSelections', parseInt(e.target.value) || 1)} />
                                </div>
                                <button type="button" className="btn btn-icon btn-ghost" style={{ alignSelf: 'flex-end', marginBottom: 4 }} onClick={() => removeGroup(gIdx)}>
                                    <Trash2 color="var(--color-error)" size={20} />
                                </button>
                            </div>

                            {/* OPCIONES DEL GRUPO */}
                            <div style={{ marginLeft: 16, borderLeft: '3px solid var(--color-primary)', paddingLeft: 16 }}>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: 12, color: 'var(--color-text-muted)' }}>Opciones del Grupo</h4>

                                {group.options.map((opt, oIdx) => (
                                    <div key={opt.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                                        <input className="form-input" style={{ flex: 2 }} placeholder="Pizza Mediana" value={opt.name} onChange={(e) => updateOption(gIdx, oIdx, 'name', e.target.value)} required />
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <span style={{ position: 'absolute', left: 10, top: 10, color: 'var(--color-text-muted)' }}>$</span>
                                            <input type="number" step="0.5" className="form-input" style={{ paddingLeft: 24 }} placeholder="Costo extra" value={opt.priceExtra} onChange={(e) => updateOption(gIdx, oIdx, 'priceExtra', parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <button type="button" className="btn btn-icon btn-ghost btn-sm" onClick={() => removeOption(gIdx, oIdx)}>
                                            <X color="var(--color-error)" />
                                        </button>
                                    </div>
                                ))}

                                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => addOption(gIdx)}>
                                    + Agregar Opción
                                </button>
                            </div>
                        </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Save size={18} /> Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
