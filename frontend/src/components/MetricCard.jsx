export default function MetricCard({ title, value, hint }) {
  return (
    <div className="card metric-card">
      <div className="card-title">{title}</div>
      <div className="card-value">{value}</div>
      {hint ? <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '0.35rem' }}>{hint}</div> : null}
    </div>
  )
}
