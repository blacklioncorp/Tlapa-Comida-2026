import { useState, useRef } from 'react';
import { Camera, Upload, X, Image } from 'lucide-react';

/**
 * Reusable image upload component.
 * Converts selected file to base64 for localStorage-based persistence.
 *
 * Props:
 * - currentImage: string (URL or base64)
 * - onImageChange: (base64String) => void
 * - shape: 'circle' | 'rounded' | 'banner' (default: 'rounded')
 * - size: number (px for width/height, or height for banner)
 * - label: string
 * - id: string (unique ID for accessibility)
 */
export default function ImageUpload({
    currentImage,
    onImageChange,
    shape = 'rounded',
    size = 100,
    label = 'Subir foto',
    id = 'image-upload',
}) {
    const [preview, setPreview] = useState(currentImage || '');
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef(null);

    const isBanner = shape === 'banner';
    const isCircle = shape === 'circle';

    const handleFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        // Max 2MB
        if (file.size > 2 * 1024 * 1024) {
            alert('La imagen debe pesar menos de 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            setPreview(base64);
            onImageChange(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleRemove = () => {
        setPreview('');
        onImageChange('');
        if (inputRef.current) inputRef.current.value = '';
    };

    const containerStyle = {
        width: isBanner ? '100%' : size,
        height: isBanner ? size : isCircle ? size : size,
        borderRadius: isCircle ? '50%' : isBanner ? 12 : 12,
        border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: dragging ? 'var(--color-primary-bg)' : 'var(--color-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', cursor: 'pointer', position: 'relative',
        transition: 'all 0.2s ease',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isBanner ? 'stretch' : 'center', gap: 8 }}>
            {label && (
                <label htmlFor={id} className="form-label" style={{ fontSize: '0.8rem', margin: 0, cursor: 'pointer' }}>
                    {label}
                </label>
            )}

            <div
                style={containerStyle}
                onClick={() => inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragging(false)}
            >
                {preview ? (
                    <>
                        <img
                            src={preview}
                            alt="Preview"
                            style={{
                                width: '100%', height: '100%', objectFit: 'cover',
                            }}
                        />
                        {/* Remove button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                            style={{
                                position: 'absolute', top: 4, right: 4,
                                width: 24, height: 24, borderRadius: '50%',
                                background: 'rgba(0,0,0,0.6)', color: 'white',
                                border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <X size={14} />
                        </button>
                        {/* Change overlay */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'opacity 0.2s',
                        }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                            onMouseOut={(e) => e.currentTarget.style.opacity = 0}
                        >
                            <Camera size={24} color="white" />
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: 12 }}>
                        {isBanner ? <Image size={32} color="var(--color-text-muted)" /> :
                            <Camera size={isCircle ? 24 : 28} color="var(--color-text-muted)" />}
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                            {isBanner ? 'Arrastra o haz clic para subir' : 'Subir'}
                        </p>
                    </div>
                )}
            </div>

            <input
                ref={inputRef}
                id={id}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInputChange}
                style={{ display: 'none' }}
            />
        </div>
    );
}
