import { confusionMatrix, validationCases } from '../data/mockValidation'
import ValidationMatrix from '../components/ValidationMatrix'
import MetricCard from '../components/MetricCard'

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ValidationPage() {
  const matches = validationCases.filter((item) => item.referenceScore === item.aiScore).length
  const agreementRate = Math.round((matches / validationCases.length) * 100)

  const onExportValidationSummary = () => {
    const header = ['Case ID', 'Reference Score', 'AI Score', 'Match', 'Confidence', 'Notes']
    const rows = validationCases.map((item) => [
      item.caseId,
      item.referenceScore,
      item.aiScore,
      item.referenceScore === item.aiScore ? 'Match' : 'Mismatch',
      `${item.confidence}%`,
      item.notes
    ])
    const content = [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
    downloadFile('pathiq_validation_summary.csv', content, 'text/csv;charset=utf-8')
  }

  return (
    <div style={{ display: 'grid', gap: '1.15rem' }}>
      <header>
        <div className="micro-label">Model governance</div>
        <h1 className="page-title">Validation mode</h1>
        <p className="page-subtitle">Benchmark AI pre-scores against reference reads with transparent concordance metrics.</p>
      </header>

      <section className="grid-4">
        <MetricCard title="Agreement rate" value={`${agreementRate}%`} hint="Exact label match on pilot set" />
        <MetricCard title="Accuracy" value="84%" hint="Clinical validation slice (demo)" />
        <MetricCard title="Sensitivity" value="88%" hint="High-positive cases" />
        <MetricCard title="Specificity" value="91%" hint="Low / negative cases" />
        <MetricCard title="Validation cases" value={validationCases.length} hint="Frozen reference cohort" />
      </section>

      <section className="card table-wrap">
        <div className="micro-label" style={{ marginBottom: '0.35rem' }}>
          Cohort
        </div>
        <h3 style={{ fontWeight: 700, margin: '0 0 0.75rem', color: 'var(--cream)' }}>Validation set</h3>
        <table>
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Reference score</th>
              <th>AI score</th>
              <th>Match</th>
              <th>Confidence</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {validationCases.map((item) => (
              <tr key={item.caseId}>
                <td style={{ fontWeight: 600, color: 'var(--cream)' }}>{item.caseId}</td>
                <td>{item.referenceScore}</td>
                <td>{item.aiScore}</td>
                <td>{item.referenceScore === item.aiScore ? <span className="badge badge-conf-high">Match</span> : <span className="badge badge-conf-low">Mismatch</span>}</td>
                <td>{item.confidence}%</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{item.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <ValidationMatrix matrix={confusionMatrix} />

      <div>
        <button className="btn btn-primary" type="button" onClick={onExportValidationSummary}>
          Export validation summary
        </button>
      </div>
    </div>
  )
}
