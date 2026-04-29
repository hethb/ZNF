import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import ScoreBadge from '../components/ScoreBadge'

export default function ResultsPage() {
  const { state } = useLocation()
  const [showHeatmap, setShowHeatmap] = useState(true)

  if (!state?.result) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-slate-200">
        No result found. <Link to="/analyze" className="font-medium text-brand underline">Upload a slide</Link> to begin.
      </div>
    )
  }

  const { result, preview } = state
  const heatmapSrc = result.heatmap_base64 ? `data:image/png;base64,${result.heatmap_base64}` : ''
  const confidencePct = Math.round((result.confidence || 0) * 100)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-100">Analysis Result</h1>
        <Link to="/analyze" className="rounded-none border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Analyze Another
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-none border border-white/60 bg-white/80 p-4 shadow-soft backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Grad-CAM overlay</span>
            <button
              onClick={() => setShowHeatmap((v) => !v)}
              className="rounded-none border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              {showHeatmap ? 'Show Original' : 'Show Heatmap'}
            </button>
          </div>
          <img src={showHeatmap && heatmapSrc ? heatmapSrc : preview} alt="result" className="h-[450px] w-full rounded-none object-contain" />
        </section>

        <section className="space-y-4 rounded-none border border-white/60 bg-white/80 p-6 shadow-soft backdrop-blur">
          {result.needs_review && (
            <div className="rounded-none border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Flagged for manual review due to elevated uncertainty.
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Predicted intensity</p>
            <ScoreBadge score={result.intensity_score} label={result.intensity_label} />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Confidence</p>
            <div className="h-2.5 w-full rounded-none bg-slate-200">
              <div className="h-2.5 rounded-none bg-gradient-to-r from-brand to-violet transition-all" style={{ width: `${confidencePct}%` }} />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-700">{confidencePct}%</p>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-700">
            <p><span className="text-slate-500">Tissue type:</span> <span className="font-medium">{result.tissue_type}</span></p>
            <p><span className="text-slate-500">Uncertainty (std):</span> <span className="font-medium">{result.uncertainty_std}</span></p>
          </div>
        </section>
      </div>
    </div>
  )
}
