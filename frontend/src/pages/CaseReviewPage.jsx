import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCases } from '../context/CaseContext'
import StatusBadge from '../components/StatusBadge'
import ConfidenceBadge from '../components/ConfidenceBadge'
import SlideViewer from '../components/SlideViewer'
import IntensityChart from '../components/IntensityChart'
import FlagList from '../components/FlagList'
import AuditTrail from '../components/AuditTrail'
import { OVERRIDE_OPTIONS } from '../types/case'

const overlays = ['Original', 'Tissue Mask', 'Heatmap', 'Uncertainty', 'Artifacts']

export default function CaseReviewPage() {
  const { id } = useParams()
  const { cases, saveReviewDraft, finalizeCase, exportCaseReport } = useCases()
  const currentCase = useMemo(() => cases.find((item) => item.id === id), [cases, id])

  const [finalScore, setFinalScore] = useState('2+')
  const [overrideReason, setOverrideReason] = useState('AI score accepted')
  const [reviewerNotes, setReviewerNotes] = useState('')
  const [activeOverlay, setActiveOverlay] = useState('Heatmap')
  const [useDeepZoom, setUseDeepZoom] = useState(true)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    if (!currentCase) return
    const draft = currentCase.reviewDraft
    setReviewerNotes(draft?.reviewerNotes ?? '')
    setOverrideReason(draft?.overrideReason ?? 'AI score accepted')
    setFinalScore(draft?.finalScore || currentCase.aiAnalysis?.suggestedScore || '0')
  }, [currentCase?.id])

  if (!currentCase) {
    return (
      <div className="card">
        Case not found.{' '}
        <Link to="/dashboard" style={{ color: 'var(--copper)' }}>
          Return to dashboard
        </Link>
        .
      </div>
    )
  }

  const heatmapUrl = currentCase.aiAnalysis?.heatmapUrl
  const baseImage = currentCase.imageUrl || '/demo/slide1.png'
  const slideImageUrl = heatmapUrl && activeOverlay === 'Heatmap' ? heatmapUrl : baseImage

  const onSaveReview = async () => {
    setSaveMsg('')
    await saveReviewDraft({
      id: currentCase.id,
      finalScore,
      reviewer: currentCase.assignedReviewer || 'Pathologist',
      overrideReason,
      reviewerNotes
    })
    setSaveMsg('Draft saved.')
    setTimeout(() => setSaveMsg(''), 2500)
  }

  const onFinalize = async () => {
    setSaveMsg('')
    await finalizeCase({
      id: currentCase.id,
      finalScore,
      reviewer: currentCase.assignedReviewer || 'Pathologist',
      overrideReason,
      reviewerNotes
    })
  }

  return (
    <div style={{ display: 'grid', gap: '1.15rem' }}>
      <header>
        <div className="micro-label">Review workspace</div>
        <h1 className="page-title">Case review</h1>
        <p className="page-subtitle">Inspect overlays, reconcile AI pre-score with tissue context, and record the pathologist decision.</p>
      </header>

      <section className="review-layout">
        <aside className="card" style={{ display: 'grid', gap: '0.65rem', alignContent: 'start' }}>
          <div>
            <div className="micro-label">Case record</div>
            <h3 style={{ fontWeight: 700, margin: '0.2rem 0 0', fontSize: '1rem', color: 'var(--cream)' }}>Metadata</h3>
          </div>
          <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Case ID</span>
              <div style={{ fontWeight: 600, color: 'var(--cream)' }}>{currentCase.caseId}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Sample</span>
              <div>{currentCase.sampleId}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Tissue</span>
              <div>{currentCase.tissueType}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Stain</span>
              <div>{currentCase.stainType}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Reviewer</span>
              <div>{currentCase.assignedReviewer || 'Unassigned'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-dim)' }}>Status</span>
              <StatusBadge status={currentCase.status} />
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Uploaded</span>
              <div>{new Date(currentCase.uploadedAt).toLocaleString()}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Intake notes</span>
              <div>{currentCase.notes || '—'}</div>
            </div>
          </div>

          <hr className="divider" />

          <div className="micro-label">Workflow</div>
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            <Link className="btn btn-secondary" to="/dashboard">
              Back to queue
            </Link>
            <Link className="btn btn-outline" to="/reports">
              Open reports
            </Link>
          </div>
        </aside>

        <div className="review-panel-center" style={{ display: 'grid', gap: '0.55rem' }}>
          <label className="check-row">
            <input type="checkbox" checked={useDeepZoom} onChange={(e) => setUseDeepZoom(e.target.checked)} />
            Deep zoom (OpenSeadragon)
          </label>
          <SlideViewer
            useDeepZoom={useDeepZoom}
            imageUrl={slideImageUrl}
            overlays={overlays}
            activeOverlay={activeOverlay}
            onOverlayChange={setActiveOverlay}
          />
        </div>

        <aside style={{ display: 'grid', gap: '0.75rem', alignContent: 'start' }}>
          <div className="card ai-rail-card">
            <div className="micro-label">Model output</div>
            <h3 style={{ fontWeight: 700, margin: '0.2rem 0 0.5rem', fontSize: '1.05rem', color: 'var(--cream)' }}>AI analysis</h3>
            <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-muted)' }}>Suggested score</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--amber)' }}>{currentCase.aiAnalysis?.suggestedScore ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Confidence</span>
                <ConfidenceBadge confidence={currentCase.aiAnalysis?.confidence || 0} />
              </div>
              <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5 }}>
                {currentCase.aiAnalysis?.uncertaintySummary}
              </p>
            </div>
          </div>

          <IntensityChart distribution={currentCase.aiAnalysis?.intensityDistribution} />
          <FlagList flags={currentCase.aiAnalysis?.flags} />

          <div className="card card-glow" style={{ display: 'grid', gap: '0.65rem' }}>
            <div>
              <div className="micro-label">Pathologist decision</div>
              <h3 style={{ fontWeight: 700, margin: '0.2rem 0 0', fontSize: '1rem', color: 'var(--cream)' }}>Final review</h3>
            </div>

            <div>
              <label className="label">Final score (IHC)</label>
              <div className="score-chips">
                {['0', '1+', '2+', '3+'].map((score) => (
                  <button
                    key={score}
                    type="button"
                    className={`score-chip ${finalScore === score ? 'score-chip-active' : ''}`}
                    onClick={() => setFinalScore(score)}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Override reason</label>
              <select className="select" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}>
                {OVERRIDE_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Reviewer notes</label>
              <textarea rows={4} value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)} placeholder="Document staining pattern, QC context, or consult rationale…" />
            </div>

            {saveMsg ? (
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--success)' }}>{saveMsg}</p>
            ) : null}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button className="btn btn-secondary" type="button" onClick={onSaveReview}>
                Save review
              </button>
              <button className="btn btn-primary" type="button" onClick={onFinalize}>
                Finalize case
              </button>
              <button className="btn btn-outline" type="button" onClick={() => exportCaseReport(currentCase.id, currentCase.assignedReviewer)}>
                Export report
              </button>
            </div>
          </div>
        </aside>
      </section>

      <AuditTrail events={currentCase.auditTrail} />
    </div>
  )
}
