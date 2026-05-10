const keys = [
  { label: '0', key: 'zero' },
  { label: '1+', key: 'onePlus' },
  { label: '2+', key: 'twoPlus' },
  { label: '3+', key: 'threePlus' }
]

export default function IntensityChart({ distribution }) {
  return (
    <div className="card">
      <div className="micro-label" style={{ marginBottom: '0.35rem' }}>
        Distribution
      </div>
      <h3 style={{ fontWeight: 700, margin: '0 0 0.65rem', fontSize: '1rem', color: 'var(--cream)' }}>Intensity distribution</h3>
      <div style={{ display: 'grid', gap: '0.55rem' }}>
        {keys.map(({ key, label }) => {
          const value = distribution?.[key] ?? 0
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span>{label}</span>
                <strong style={{ color: 'var(--cream)' }}>{value}%</strong>
              </div>
              <div className="progress">
                <span style={{ width: `${value}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
