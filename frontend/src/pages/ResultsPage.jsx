import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import MetricsGlossary from '../components/MetricsGlossary'
import ScoreBadge from '../components/ScoreBadge'
import { submitFeedback } from '../services/api'

const INTENSITY_LABELS_SHORT = ['0', '1+', '2+', '3+']

export default function ResultsPage() {
  const { state } = useLocation()
  const result = state?.result
  const preview = state?.preview
  const heatmapSrc = result?.heatmap_base64 ? `data:image/png;base64,${result.heatmap_base64}` : ''
  const [showHeatmap, setShowHeatmap] = useState(true)

  const imgSrc = useMemo(() => {
    if (showHeatmap && heatmapSrc) return heatmapSrc
    return preview || ''
  }, [showHeatmap, heatmapSrc, preview])

  if (!result) {
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

  const probs = result.intensity_probabilities || []
  const uncertaintyCombined = result.uncertainty_combined ?? result.uncertainty_std ?? 0
  const uncertaintyPct = Math.min(100, Math.round(Number(uncertaintyCombined) * 100))
  const confidencePct = Math.round((result.confidence || 0) * 100)
  const stainBurden = result.stain_burden_0_100
  const [correctedScore, setCorrectedScore] = useState('')
  const [feedbackNote, setFeedbackNote] = useState('')
  const [feedbackSaved, setFeedbackSaved] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  const onSubmitFeedback = async () => {
    if (correctedScore === '') return
    setFeedbackError('')
    setFeedbackLoading(true)
    try {
      await submitFeedback({
        predicted_intensity_score: Number(result.intensity_score),
        corrected_intensity_score: Number(correctedScore),
        confidence: Number(result.confidence || 0),
        uncertainty_combined: Number(result.uncertainty_combined || 0),
        tissue_type: result.tissue_type || '',
        note: feedbackNote || '',
        image_name: 'uploaded_result',
        source: 'results_page'
      })
      setFeedbackSaved(true)
    } catch (e) {
      setFeedbackError(e?.response?.data?.detail || 'Could not save feedback.')
    } finally {
      setFeedbackLoading(false)
    }
  }

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
            <button
              type="button"
              onClick={() => setShowHeatmap((v) => !v)}
              disabled={!heatmapSrc}
              className="btn-ghost rounded-lg px-3 py-1.5 text-xs disabled:opacity-40"
            >
              {showHeatmap && heatmapSrc ? 'Show Original' : 'Show Heatmap'}
            </button>
          </div>
          {!heatmapSrc && (
            <p className="mb-2 text-xs" style={{ color: '#7a6b59' }}>
              Heatmap unavailable for this run; showing original patch.
            </p>
          )}
          <img
            src={imgSrc}
            alt="Analysis result"
            className="h-[420px] w-full rounded-xl object-contain"
            style={{ background: 'rgba(0,0,0,0.35)' }}
          />
        </section>

        {/* Metrics panel */}
        <section className="glass-card space-y-6 p-6">
          {result.non_tumor_context && (
            <div
              className="rounded-lg px-4 py-3 text-sm leading-relaxed"
              style={{
                background: 'rgba(138,153,98,0.08)',
                border: '1px solid rgba(138,153,98,0.25)',
                color: '#c4cfa8'
              }}
            >
              <span className="font-semibold">ROI context.</span>{' '}
              {result.no_tumor_guidance || `No tumor tissue detected in this patch (${result.tissue_type}). Try selecting a tumor-rich ROI and rerun analysis.`}
            </div>
          )}

          {result.needs_review && (
            <div
              className="rounded-lg px-4 py-3 text-sm font-medium"
              style={{
                background: 'rgba(194,138,26,0.1)',
                border: '1px solid rgba(194,138,26,0.28)',
                color: '#e8c06a'
              }}
            >
              ⚠ Flagged for manual review: diffuse class probabilities (high uncertainty).
            </div>
          )}

          {/* Score */}
          <div>
            <p className="section-label mb-3 block">Predicted Intensity</p>
            <ScoreBadge score={result.intensity_score} label={result.intensity_label} />
          </div>

          {/* Stain burden — continuous readout */}
          {stainBurden != null && !Number.isNaN(stainBurden) && (
            <div>
              <p className="section-label mb-2 block">Stain burden (0–100)</p>
              <p className="mb-2 text-xs leading-relaxed" style={{ color: '#a08060' }}>
                Weighted expectation from class probabilities—complements discrete 0/1+/2+/3 for lab analytics
                and trend plots (marker-agnostic).
              </p>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-2xl font-bold tabular-nums" style={{ color: '#f4ece0' }}>
                  {Math.round(stainBurden)}
                </span>
                <span className="text-xs" style={{ color: '#7a6b59' }}>higher → more signal mass on patch</span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full"
                style={{ background: 'rgba(212,178,140,0.1)' }}
              >
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(0, stainBurden))}%`,
                    background: 'linear-gradient(90deg, #8a9962, #c2621a)',
                    boxShadow: '0 0 12px rgba(138,153,98,0.35)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Class distribution */}
          {probs.length === 4 && (
            <div>
              <p className="section-label mb-3 block">Class distribution (MC mean)</p>
              <div className="space-y-2">
                {probs.map((p, i) => (
                  <div key={INTENSITY_LABELS_SHORT[i]} className="flex items-center gap-3">
                    <span className="w-8 text-xs font-semibold tabular-nums" style={{ color: '#c4ad92' }}>
                      {INTENSITY_LABELS_SHORT[i]}
                    </span>
                    <div
                      className="h-2 flex-1 overflow-hidden rounded-full"
                      style={{ background: 'rgba(212,178,140,0.08)' }}
                    >
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round(p * 100))}%`,
                          background: 'linear-gradient(90deg, #c2621a, #e89c60)'
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums" style={{ color: '#f4ece0' }}>
                      {Math.round(p * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confidence bar */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="section-label">Top-class confidence</p>
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

          {/* Uncertainty (combined) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="section-label">Uncertainty (combined)</p>
              <span className="text-base font-bold tabular-nums" style={{ color: '#f4ece0' }}>
                {uncertaintyPct}%
              </span>
            </div>
            <p className="mb-2 text-xs leading-relaxed" style={{ color: '#7a6b59' }}>
              max(MC dropout std on top class, normalized entropy). MC std can be 0 when dropout is inactive;
              entropy still reflects spread across 0–3+.
            </p>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ background: 'rgba(212,178,140,0.1)' }}
            >
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{
                  width: `${uncertaintyPct}%`,
                  background: 'linear-gradient(90deg, #64748b, #c2621a)'
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
                MC std (top class)
              </span>
              <span className="font-mono text-sm font-medium" style={{ color: '#f4ece0' }}>
                {result.uncertainty_std ?? '—'}
              </span>
            </div>
            {result.prediction_entropy != null && (
              <>
                <div style={{ borderTop: '1px solid rgba(212,178,140,0.07)' }} />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#7a6b59' }}>
                    Entropy
                  </span>
                  <span className="font-mono text-sm font-medium" style={{ color: '#f4ece0' }}>
                    {result.prediction_entropy}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Pathologist feedback loop */}
          <div
            className="space-y-3 rounded-xl p-4 text-sm"
            style={{ background: 'rgba(212,178,140,0.04)', border: '1px solid rgba(212,178,140,0.08)' }}
          >
            <p className="section-label">Disagree with this score?</p>
            <p style={{ color: '#a08060' }}>
              Save a correction to build a pilot training set (logged to backend CSV).
            </p>
            <div className="flex items-center gap-2">
              <select
                value={correctedScore}
                onChange={(e) => setCorrectedScore(e.target.value)}
                className="input-dark cursor-pointer"
              >
                <option value="">Correct score…</option>
                <option value="0">0</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
              </select>
              <button
                type="button"
                onClick={onSubmitFeedback}
                disabled={feedbackLoading || correctedScore === '' || feedbackSaved}
                className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
              >
                {feedbackSaved ? 'Saved' : feedbackLoading ? 'Saving…' : 'Save correction'}
              </button>
            </div>
            <textarea
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="Optional note (artifact, edge effect, staining issue...)"
              className="input-dark min-h-20 w-full resize-y"
            />
            {feedbackError && <p style={{ color: '#f0a090' }}>{feedbackError}</p>}
          </div>
        </section>
      </div>

      <MetricsGlossary
        className="mt-8"
        eyebrow="Reading this result"
        headingId="results-metrics-heading"
        lead="The values above are for this patch only. Each metric below is decision-support—not a standalone diagnosis. Use them together with tissue context and your own review."
      />
    </div>
  )
}
