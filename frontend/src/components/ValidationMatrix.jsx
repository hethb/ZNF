const labels = ['0', '1+', '2+', '3+']

export default function ValidationMatrix({ matrix }) {
  return (
    <div className="card">
      <div style={{ marginBottom: '0.75rem' }}>
        <div className="micro-label">Reference × AI</div>
        <h3 style={{ fontWeight: 700, margin: '0.15rem 0 0', fontSize: '1.05rem', color: 'var(--cream)' }}>Confusion matrix</h3>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Rows: reference pathologist. Columns: AI pre-score. Diagonal highlights concordant calls.
        </p>
      </div>
      <div className="table-wrap">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Human \ AI</th>
              {labels.map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((r) => (
              <tr key={r}>
                <th>{r}</th>
                {labels.map((c) => {
                  const val = matrix[r][c]
                  const isDiag = r === c
                  return (
                    <td key={c} className={isDiag ? 'matrix-diagonal' : ''} style={!isDiag ? { color: 'var(--text-muted)' } : undefined}>
                      {val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
