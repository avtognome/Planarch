import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Check, X, Sliders, Sun, Contrast, RotateCcw } from 'lucide-react';

export interface ImageCropModalProps {
  file: File;
  aspectRatio?: number; // e.g. 1 for square (portraits), 16/9, or undefined for free
  title?: string;
  onComplete: (dataUrl: string, fileName: string) => void;
  onCancel: () => void;
}

export function ImageCropModal({
  file,
  aspectRatio: initialAspectRatio = 1,
  title = 'Crop & Adjust Image',
  onComplete,
  onCancel
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(initialAspectRatio);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [brightness, setBrightness] = useState(0); // -50 to 50
  const [contrast, setContrast] = useState(0); // -50 to 50
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load file into object URL
  useEffect(() => {
    if (typeof URL === 'undefined' || !URL.createObjectURL) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        imgRef.current = img;
      };
    }
    return () => {
      if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file]);

  // Handle Drag / Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch support for drag/pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setBrightness(0);
    setContrast(0);
    setPan({ x: 0, y: 0 });
  };

  // Perform Crop & Adjust Export to DataURL
  const handleApply = async () => {
    const img = imgRef.current;
    if (!img) return;

    setProcessing(true);
    try {
      const targetWidth = 600;
      const targetHeight = aspectRatio ? Math.round(targetWidth / aspectRatio) : 600;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      // Clear & set background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Filters for brightness and contrast
      const bVal = 100 + brightness;
      const cVal = 100 + contrast;
      ctx.filter = `brightness(${bVal}%) contrast(${cVal}%)`;

      // Transform coordinate space to center of target
      ctx.save();
      ctx.translate(targetWidth / 2, targetHeight / 2);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Calculate base scale to fit
      // When rotated 90 or 270, natural width and height swap
      const isRotated90 = rotation === 90 || rotation === 270;
      const effectiveW = isRotated90 ? img.naturalHeight : img.naturalWidth;
      const effectiveH = isRotated90 ? img.naturalWidth : img.naturalHeight;

      // Base scaling to cover the target area
      const scaleCover = Math.max(targetWidth / effectiveW, targetHeight / effectiveH);
      const totalScale = scaleCover * zoom;

      // Scale
      ctx.scale(totalScale, totalScale);

      // Pan translation (needs rotation correction if rotated)
      const rad = (-rotation * Math.PI) / 180;
      const pX = (pan.x * Math.cos(rad) - pan.y * Math.sin(rad)) / totalScale;
      const pY = (pan.x * Math.sin(rad) + pan.y * Math.cos(rad)) / totalScale;

      ctx.translate(pX, pY);

      // Draw image centered
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      // Export as WebP with fallback
      let dataUrl = canvas.toDataURL('image/webp', 0.88);
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      }

      onComplete(dataUrl, file.name);
    } catch (err) {
      console.error('Failed to export cropped image:', err);
    } finally {
      setProcessing(false);
    }
  };

  // Preview Crop Box Dimensions
  const boxWidth = 280;
  const boxHeight = aspectRatio ? Math.round(boxWidth / aspectRatio) : 280;

  return (
    <div className="modal-backdrop" onClick={onCancel} style={{ zIndex: 9999 }}>
      <div
        className="modal image-crop-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '440px', width: '92vw', padding: '20px' }}
      >
        <div className="between" style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        {/* Viewport / Crop Area */}
        <div
          ref={containerRef}
          className="crop-viewport-container"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'relative',
            width: '100%',
            height: '280px',
            background: '#090d16',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            border: '1px solid var(--line)'
          }}
        >
          {/* Target crop frame guideline */}
          <div
            style={{
              position: 'absolute',
              width: `${boxWidth}px`,
              height: `${boxHeight}px`,
              border: '2px solid rgba(245, 158, 11, 0.85)',
              borderRadius: aspectRatio === 1 ? '50%' : '6px',
              boxShadow: '0 0 0 9999px rgba(10, 15, 26, 0.65)',
              pointerEvents: 'none',
              zIndex: 10
            }}
          />

          {imageSrc && (
            <img
              src={imageSrc}
              alt="Crop preview"
              style={{
                position: 'absolute',
                maxWidth: 'none',
                transformOrigin: 'center center',
                transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                filter: `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`,
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                pointerEvents: 'none',
                maxHeight: '260px'
              }}
              draggable={false}
            />
          )}

          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '10px',
              fontSize: '10px',
              color: '#94a3b8',
              zIndex: 12,
              pointerEvents: 'none'
            }}
          >
            Drag to pan
          </div>
        </div>

        {/* Controls Toolbar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          {/* Zoom & Rotation */}
          <div className="between" style={{ gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <ZoomOut size={15} style={{ opacity: 0.6 }} />
              <input
                type="range"
                aria-label="Zoom"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                style={{ flex: 1, margin: 0 }}
              />
              <ZoomIn size={15} style={{ opacity: 0.6 }} />
              <span style={{ fontSize: '11px', minWidth: '32px', textAlign: 'right' }}>
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <button
              type="button"
              className="icon-button"
              onClick={handleRotate}
              title="Rotate 90°"
              aria-label="Rotate 90 degrees"
              style={{ padding: '6px', border: '1px solid var(--line)', borderRadius: '6px' }}
            >
              <RotateCw size={15} />
            </button>
          </div>

          {/* Adjustments: Brightness & Contrast */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div className="between" style={{ fontSize: '10px', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sun size={12} /> Brightness
                </span>
                <span>{brightness > 0 ? `+${brightness}` : brightness}</span>
              </div>
              <input
                type="range"
                aria-label="Brightness"
                min="-50"
                max="50"
                value={brightness}
                onChange={e => setBrightness(parseInt(e.target.value, 10))}
                style={{ width: '100%', margin: 0 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div className="between" style={{ fontSize: '10px', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Contrast size={12} /> Contrast
                </span>
                <span>{contrast > 0 ? `+${contrast}` : contrast}</span>
              </div>
              <input
                type="range"
                aria-label="Contrast"
                min="-50"
                max="50"
                value={contrast}
                onChange={e => setContrast(parseInt(e.target.value, 10))}
                style={{ width: '100%', margin: 0 }}
              />
            </div>
          </div>

          {/* Optional Aspect Ratio presets if not locked */}
          {!initialAspectRatio && (
            <div className="inline" style={{ gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', marginRight: '4px' }}>Ratio:</span>
              {[
                { label: 'Free', val: undefined },
                { label: '1:1', val: 1 },
                { label: '16:9', val: 16 / 9 },
                { label: '4:3', val: 4 / 3 }
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  className={aspectRatio === opt.val ? 'primary' : 'secondary'}
                  onClick={() => setAspectRatio(opt.val)}
                  style={{ padding: '3px 8px', fontSize: '10px', borderRadius: '4px' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Footer Actions */}
          <div className="between" style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
            <button
              type="button"
              className="secondary"
              onClick={handleReset}
              style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px' }}
            >
              <RotateCcw size={13} /> Reset
            </button>

            <div className="inline" style={{ gap: '8px' }}>
              <button type="button" className="secondary" onClick={onCancel}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleApply}
                disabled={processing}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Check size={14} /> {processing ? 'Processing…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
