import { formatCaseSummary } from '../utils/reportUtils'

export default function ReportPreview({ currentCase }) {
  const text = formatCaseSummary(currentCase)
  return (
    <div className="card" style={{ display: 'grid', gap: '0.65rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div className="micro-label">Audit trail</div>
          <h3 style={{ fontWeight: 700, margin: '0.15rem 0 0', fontSize: '1.05rem', color: 'var(--cream)' }}>Report preview</h3>
        </div>
        <span className="badge badge-status-final" style={{ textTransform: 'none', letterSpacing: '0' }}>
          Draft clinical summary
        </span>
      </div>
      <pre className="report-preview-body" style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>
        {text}
      </pre>
    </div>
  )
}
