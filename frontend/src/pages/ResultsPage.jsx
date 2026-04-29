import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ScoreBadge from '../components/ScoreBadge'

export default function ResultsPage() {
  const { state } = useLocation()
  const [showHeatmap, setShowHeatmap] = useState(true)

  if (!state?.result) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-28">
        <div className="glass-card p-8 text-center">
          <p style={{ color: '#c4ad92' }}>
            No result found.{' '}
            <Link
              to="/analyze"
              className="font-semibold underline underline-offset-2"
              style={{ color: '#d9834a' }}
            >
              Upload a slide
            </Link>{' '}
            to begin.
          </p>
        </div>
      </div>
    )
  }

  const { result, preview } = state
  const heatmapSrc = result.heatmap_base64 ? `data:image/png;base64,${result.heatmap_base64}` : ''
  const confidencePct = Math.round((result.confidence || 0) * 100)

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-28">
      {/* Header */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label mb-1 block">Output</p>
          <h1 className="display-heading text-4xl">Analysis Result</h1>
        </div>
        <Link to="/analyze" className="btn-ghost text-sm">
          ← Analyze Another
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        {/* Image panel */}
        <section className="glass-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#7a6b59' }}
            >
              Grad-CAM Overlay
            </span>
            <button onClick={() => setShowHeatmap((v) => !v)} className="btn-ghost rounded-lg px-3 py-1.5 text-xs">
              {showHeatmap ? 'Show Original' : 'Show Heatmap'}
            </button>
          </div>
          <img
            src={showHeatmap && heatmapSrc ? heatmapSrc : preview}
            alt="Analysis result"
            className="h-[420px] w-full rounded-xl object-contain"
            style={{ background: 'rgba(0,0,0,0.35)' }}
          />
        </section>

        {/* Metrics panel */}
        <section className="glass-card space-y-6 p-6">
          {result.needs_review && (
            <div
              className="rounded-lg px-4 py-3 text-sm font-medium"
              style={{
                background: 'rgba(194,138,26,0.1)',
                border: '1px solid rgba(194,138,26,0.28)',
                color: '#e8c06a'
              }}
            >
              ⚠ Flagged for manual review due to elevated uncertainty.
            </div>
          )}

          {/* Score */}
          <div>
            <p className="section-label mb-3 block">Predicted Intensity</p>
            <ScoreBadge score={result.intensity_score} label={result.intensity_label} />
          </div>

          {/* Confidence bar */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="section-label">Confidence</p>
              <span className="text-base font-bold" style={{ color: '#f4ece0' }}>{confidencePct}%</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ background: 'rgba(212,178,140,0.1)' }}
            >
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{
                  width: `${confidencePct}%`,
                  background: 'linear-gradient(90deg, #c2621a, #8a9962)',
                  boxShadow: '0 0 12px rgba(194,98,26,0.5)'
                }}
              />
            </div>
          </div>

          {/* Detail rows */}
          <div
            className="space-y-3 rounded-xl p-4 text-sm"
            style={{ background: 'rgba(212,178,140,0.04)', border: '1px solid rgba(212,178,140,0.08)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#7a6b59' }}>
                Tissue type
              </span>
              <span className="font-medium" style={{ color: '#f4ece0' }}>{result.tissue_type || '—'}</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(212,178,140,0.07)' }} />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#7a6b59' }}>
                Uncertainty (std)
              </span>
              <span className="font-mono text-sm font-medium" style={{ color: '#f4ece0' }}>
                {result.uncertainty_std ?? '—'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
