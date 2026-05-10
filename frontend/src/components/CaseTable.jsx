import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import ConfidenceBadge from './ConfidenceBadge'

export default function CaseTable({ cases }) {
  return (
    <div className="card table-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div className="micro-label">Operations</div>
          <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--cream)' }}>Active case queue</h2>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{cases.length} visible</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Sample ID</th>
            <th>Tissue</th>
            <th>Stain</th>
            <th>Reviewer</th>
            <th>AI Score</th>
            <th>Confidence</th>
            <th>Status</th>
            <th>Flags</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {cases.map((item) => (
            <tr key={item.id}>
              <td style={{ fontWeight: 600, color: 'var(--cream)' }}>{item.caseId}</td>
              <td>{item.sampleId}</td>
              <td>{item.tissueType}</td>
              <td>{item.stainType}</td>
              <td>{item.assignedReviewer || 'Unassigned'}</td>
              <td>{item.aiAnalysis?.suggestedScore ?? '—'}</td>
              <td>{item.aiAnalysis ? <ConfidenceBadge confidence={item.aiAnalysis.confidence} /> : '—'}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td>
                <span
                  className="badge"
                  style={{
                    background: (item.aiAnalysis?.flags?.length || 0) > 0 ? 'var(--warning-bg)' : 'rgba(255,255,255,0.06)',
                    color: (item.aiAnalysis?.flags?.length || 0) > 0 ? 'var(--warning)' : 'var(--text-dim)'
                  }}
                >
                  {item.aiAnalysis?.flags?.length ?? 0}
                </span>
              </td>
              <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{new Date(item.updatedAt).toLocaleString()}</td>
              <td className="data-table-actions">
                <Link className="btn btn-outline btn-sm" to={`/cases/${item.id}`}>
                  Open review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
