import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import MetricsGlossary from '../components/MetricsGlossary'
import ScoreBadge from '../components/ScoreBadge'
import { submitFeedback } from '../services/api'
import { triageFromUncertainty } from '../utils/uncertainty'

const INTENSITY_LABELS_SHORT = ['0', '1+', '2+', '3+']

function buildPathiqReportHtml(result, previewDataUrl, triageLabel) {
  const heatmap = result.heatmap_base64 ? `data:image/png;base64,${result.heatmap_base64}` : ''
  const probs = (result.intensity_probabilities || []).map((p) => Math.round(Number(p) * 100))
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>PathIQ — HER2 patch report</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:1rem;color:#111}
h1{font-size:1.25rem}.meta{color:#555;font-size:0.9rem}img{max-width:100%;border:1px solid #ddd;border-radius:8px}
table{border-collapse:collapse;width:100%;margin-top:1rem}td,th{border:1px solid #ccc;padding:0.4rem 0.6rem;font-size:0.85rem}
.footer{margin-top:2rem;font-size:0.75rem;color:#666}</style></head><body>
<h1>PathIQ decision-support report</h1>
<p class="meta">HER2 IHC pilot · ${triageLabel} · Not a standalone diagnosis</p>
<table><tr><th>Predicted score</th><td>${result.intensity_label || '—'}</td></tr>
<tr><th>Confidence</th><td>${Math.round((result.confidence || 0) * 100)}%</td></tr>
<tr><th>Uncertainty (combined)</th><td>${Math.round(Number(result.uncertainty_combined || 0) * 100)}%</td></tr>
<tr><th>Tissue</th><td>${result.tissue_type || '—'}</td></tr>
<tr><th>Class % (0 / 1+ / 2+ / 3+)</th><td>${probs.join(' / ')}</td></tr></table>
${heatmap ? `<h2 style="margin-top:1.5rem;font-size:1rem">Grad-CAM overlay</h2><img src="${heatmap}" alt="heatmap"/>` : ''}
${previewDataUrl && previewDataUrl !== heatmap ? `<h2 style="margin-top:1.5rem;font-size:1rem">Original patch</h2><img src="${previewDataUrl}" alt="patch"/>` : ''}
<p class="footer">Exported from PathIQ. Attach to LIMS or sign-out packet as supplemental quantification. Heatmap is interpretability aid only.</p>
</body></html>`
}

export default function ResultsPage() {
  const { state } = useLocation()
  const result = state?.result
  const preview = state?.preview
  const heatmapSrc = result?.heatmap_base64 ? `data:image/png;base64,${result.heatmap_base64}` : ''

  const [showHeatmap, setShowHeatmap] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const [correctedScore, setCorrectedScore] = useState('')
  const [feedbackNote, setFeedbackNote] = useState('')
  const [feedbackSaved, setFeedbackSaved] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [reviewedBy, setReviewedBy] = useState('')
  const [caseIdField, setCaseIdField] = useState('')
  const [finalReview, setFinalReview] = useState(false)
  const [disagreementNote, setDisagreementNote] = useState('')

  const imgSrc = useMemo(() => {
    if (showHeatmap && heatmapSrc) return heatmapSrc
    return preview || ''
  }, [showHeatmap, heatmapSrc, preview])

  const probs = result?.intensity_probabilities || []
  const uncertaintyCombined = result?.uncertainty_combined ?? result?.uncertainty_std ?? 0
  const uncertaintyPct = Math.min(100, Math.round(Number(uncertaintyCombined) * 100))
  const triage = triageFromUncertainty(uncertaintyCombined)
  const confidencePct = Math.round((result?.confidence || 0) * 100)

  const onWheelZoom = useCallback((e) => {
    e.preventDefault()
    setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.002)))
  }, [])

  const onSubmitFeedback = useCallback(async () => {
    if (!result || correctedScore === '') return
    setFeedbackError('')
    setFeedbackLoading(true)
    setDisagreementNote('')
    try {
      const res = await submitFeedback({
        predicted_intensity_score: Number(result.intensity_score),
        corrected_intensity_score: Number(correctedScore),
        confidence: Number(result.confidence || 0),
        uncertainty_combined: Number(result.uncertainty_combined || 0),
        tissue_type: result.tissue_type || '',
        note: feedbackNote || '',
        image_name: 'uploaded_result',
        source: 'results_page',
        case_id: caseIdField || '',
        reviewed_by: reviewedBy || '',
        final_review: finalReview
      })
      setFeedbackSaved(true)
      if (res?.model_vs_pathologist_disagreement) {
        setDisagreementNote('Logged as model vs pathologist disagreement — useful for active learning and QA.')
      } else {
        setDisagreementNote('Correction matches model call (still logged for audit).')
      }
    } catch (e) {
      setFeedbackError(e?.response?.data?.detail || 'Could not save feedback.')
    } finally {
      setFeedbackLoading(false)
    }
  }, [result, correctedScore, feedbackNote, caseIdField, reviewedBy, finalReview])

  const onDownloadReport = useCallback(() => {
    if (!result) return
    const html = buildPathiqReportHtml(result, preview || '', triage.label)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pathiq-report.html'
    a.click()
    URL.revokeObjectURL(url)
  }, [result, preview, triage.label])

  const whyNarrative = useMemo(() => {
    if (!result || probs.length !== 4) return ''
    const [p0, p1, p2, p3] = probs.map(Number)
    const pct = (x) => Math.round(x * 100)
    const idx = Number(result.intensity_score)
    const dominant = [p0, p1, p2, p3].indexOf(Math.max(p0, p1, p2, p3))
    return (
      `Quant breakdown: negative mass ${pct(p0)}%, weak ${pct(p1)}%, moderate ${pct(p2)}%, strong ${pct(p3)}%. ` +
      `Discrete call ${INTENSITY_LABELS_SHORT[idx]} aligns with the largest head (${INTENSITY_LABELS_SHORT[dominant]} at ${pct(Math.max(p0, p1, p2, p3))}%). ` +
      `Use the histogram below as the primary "why this tier" readout beyond Grad-CAM.`
    )
  }, [probs, result])

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

  const stainBurden = result.stain_burden_0_100

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-28">
      <div
        className="mb-6 rounded-xl px-4 py-3 text-sm leading-relaxed"
        style={{
          background: triage.bg,
          border: `1px solid ${triage.border || 'rgba(212,178,140,0.15)'}`,
          color: triage.color
        }}
      >
        <span className="font-semibold" style={{ color: '#f4ece0' }}>Triage · </span>
        {triage.label}
        <span className="mt-1 block text-xs opacity-90" style={{ color: '#c4ad92' }}>
          Green = high confidence · Yellow = medium · Red = prioritize in review queue. Pathologists use PathIQ to sort
          work, not to replace sign-out.
        </span>
      </div>

      {/* Header */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label mb-1 block">Output</p>
          <h1 className="display-heading text-4xl">Analysis Result</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onDownloadReport} className="btn-ghost text-sm">
            Download HTML report
          </button>
          <Link to="/analyze" className="btn-ghost text-sm">
            ← Analyze Another
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        {/* Image panel — slide-like zoom/pan */}
        <section className="glass-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#7a6b59' }}
            >
              Patch viewer · Grad-CAM
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowHeatmap((v) => !v)
                  setZoom(1)
                  setPan({ x: 0, y: 0 })
                }}
                disabled={!heatmapSrc}
                className="btn-ghost rounded-lg px-3 py-1.5 text-xs disabled:opacity-40"
              >
                {showHeatmap && heatmapSrc ? 'Show Original' : 'Show Heatmap'}
              </button>
              <button
                type="button"
                className="btn-ghost rounded-lg px-3 py-1.5 text-xs"
                onClick={() => {
                  setZoom(1)
                  setPan({ x: 0, y: 0 })
                }}
              >
                Reset view
              </button>
            </div>
          </div>
          {!heatmapSrc && (
            <p className="mb-2 text-xs" style={{ color: '#7a6b59' }}>
              Heatmap unavailable for this run; showing original patch.
            </p>
          )}
          <div
            className="relative h-[420px] w-full overflow-hidden rounded-xl select-none"
            style={{
              background: 'rgba(0,0,0,0.35)',
              cursor: zoom > 1 ? (dragRef.current ? 'grabbing' : 'grab') : 'default'
            }}
            onWheel={onWheelZoom}
            onMouseDown={(e) => {
              if (zoom <= 1) return
              dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
            }}
            onMouseLeave={() => {
              dragRef.current = null
            }}
            onMouseUp={() => {
              dragRef.current = null
            }}
            onMouseMove={(e) => {
              if (!dragRef.current) return
              setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y })
            }}
          >
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center'
              }}
            >
              <img src={imgSrc} alt="Analysis result" className="max-h-full max-w-full object-contain" draggable={false} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: '#7a6b59' }}>
            <span>Wheel zoom · drag when zoomed · ~20× patch equivalent (calibrate µm/px to your scanner)</span>
            <span
              className="rounded border px-2 py-0.5 font-mono tabular-nums"
              style={{ borderColor: 'rgba(212,178,140,0.2)', color: '#a08060' }}
            >
              {Math.round(zoom * 100)}%
            </span>
          </div>
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
                and trend plots (HER2 pilot).
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
              {whyNarrative && (
                <p className="mt-4 text-xs leading-relaxed" style={{ color: '#a08060' }}>
                  <span className="font-semibold" style={{ color: '#c4ad92' }}>Why this tier: </span>
                  {whyNarrative}
                </p>
              )}
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
              Override the call for audit trail and future fine-tuning. Corrections append to feedback CSV plus a
              separate audit log (who / case / timestamp).
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={reviewedBy}
                onChange={(e) => setReviewedBy(e.target.value)}
                placeholder="Reviewed by (e.g. Dr. Chen)"
                className="input-dark w-full text-sm"
              />
              <input
                value={caseIdField}
                onChange={(e) => setCaseIdField(e.target.value)}
                placeholder="Case / accession ID"
                className="input-dark w-full text-sm"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: '#c4ad92' }}>
              <input type="checkbox" checked={finalReview} onChange={(e) => setFinalReview(e.target.checked)} />
              Mark as final reviewed (logged for compliance)
            </label>
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
            {disagreementNote && <p className="text-xs" style={{ color: '#8a9962' }}>{disagreementNote}</p>}
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
