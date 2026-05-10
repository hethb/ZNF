import { useState } from 'react'
import OverlayToggle from './OverlayToggle'
import SlideDeepZoom from './SlideDeepZoom'

export default function SlideViewer({ imageUrl, overlays, activeOverlay, onOverlayChange, useDeepZoom = false }) {
  const [zoom, setZoom] = useState(1)

  const overlayTint =
    activeOverlay === 'Tissue Mask'
      ? 'rgba(107, 143, 113, 0.28)'
      : activeOverlay === 'Heatmap'
        ? 'rgba(212, 107, 59, 0.32)'
        : activeOverlay === 'Uncertainty'
          ? 'rgba(212, 165, 116, 0.3)'
          : activeOverlay === 'Artifacts'
            ? 'rgba(139, 111, 168, 0.26)'
            : 'transparent'

  return (
    <div className="card card-glow" style={{ padding: '1rem 1.1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.75rem',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <div className="micro-label">Microscopy</div>
          <h3 style={{ fontWeight: 700, margin: '0.15rem 0 0', fontSize: '1.05rem', color: 'var(--cream)' }}>Slide viewer</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!useDeepZoom ? (
            <>
              <button className="btn btn-outline btn-sm" type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.2))}>
                −
              </button>
              <span style={{ minWidth: 52, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{Math.round(zoom * 100)}%</span>
              <button className="btn btn-outline btn-sm" type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}>
                +
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div style={{ marginBottom: '0.65rem' }}>
        <div className="micro-label" style={{ marginBottom: '0.35rem' }}>
          Overlays
        </div>
        <OverlayToggle overlays={overlays} activeOverlay={activeOverlay} onOverlayChange={onOverlayChange} />
      </div>

      <div className="slide-chrome">
        {useDeepZoom ? (
          <SlideDeepZoom imageUrl={imageUrl} height={560} />
        ) : (
          <div style={{ position: 'relative', overflow: 'auto', borderRadius: 10, maxHeight: 620 }}>
            <img
              src={imageUrl}
              alt="Whole slide"
              style={{
                width: '100%',
                maxHeight: 600,
                objectFit: 'cover',
                display: 'block',
                transform: `scale(${zoom})`,
                transformOrigin: 'center center'
              }}
            />
            {overlayTint !== 'transparent' ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(125deg, transparent 5%, ${overlayTint} 50%, transparent 92%)`,
                  pointerEvents: 'none',
                  mixBlendMode: 'screen'
                }}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
