export default function FlagList({ flags }) {
  return (
    <div className="card">
      <div className="micro-label" style={{ marginBottom: '0.35rem' }}>
        Quality signals
      </div>
      <h3 style={{ fontWeight: 700, margin: '0 0 0.65rem', fontSize: '1rem', color: 'var(--cream)' }}>Flags</h3>
      {!flags?.length ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: 0 }}>No major flags were detected for this case.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.55rem' }}>
          {flags.map((flag, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 0.7rem',
                background: 'rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong style={{ color: 'var(--cream)' }}>{flag.type}</strong>
                <span
                  className="badge"
                  style={{
                    background: flag.severity === 'High' ? 'var(--danger-bg)' : 'var(--warning-bg)',
                    color: flag.severity === 'High' ? '#e8b4ae' : 'var(--warning)'
                  }}
                >
                  {flag.severity}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{flag.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
