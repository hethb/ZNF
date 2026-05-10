export default function AuditTrail({ events }) {
  return (
    <div className="card">
      <div className="micro-label" style={{ marginBottom: '0.35rem' }}>
        Compliance
      </div>
      <h3 style={{ fontWeight: 700, margin: '0 0 0.65rem', fontSize: '1.05rem', color: 'var(--cream)' }}>Audit trail</h3>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {events.map((event) => (
          <div
            key={event.id}
            style={{
              borderLeft: '2px solid rgba(212, 107, 59, 0.45)',
              paddingLeft: '0.65rem',
              paddingBottom: '0.35rem'
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              {new Date(event.timestamp).toLocaleString()} · {event.actor}
            </div>
            <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.88rem' }}>{event.action}</div>
            {event.details ? <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 2 }}>{event.details}</div> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
