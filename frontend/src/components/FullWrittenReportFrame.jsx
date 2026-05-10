/**
 * Renders the generated HTML report in an isolated iframe (print-safe styling is inside the document).
 */
export default function FullWrittenReportFrame({ html, title = 'Integrated laboratory report' }) {
  if (!html) return null
  return (
    <div className="card" style={{ display: 'grid', gap: '0.65rem', padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1rem 0' }}>
        <div className="micro-label">Written report</div>
        <h3 style={{ fontWeight: 700, margin: '0.2rem 0 0', fontSize: '1.05rem', color: 'var(--cream)' }}>{title}</h3>
        <p className="footer-note" style={{ margin: '0.35rem 0 0' }}>
          MLA-style layout (12 pt Times, double-spacing, 1″ margins, Works Cited). Each figure has a titled heading and a full explanatory caption. Print or save as PDF from your browser.
        </p>
      </div>
      <iframe
        title={title}
        srcDoc={html}
        sandbox="allow-popups allow-modals"
        style={{
          width: '100%',
          minHeight: '72vh',
          border: 'none',
          borderTop: '1px solid var(--border-subtle)',
          background: '#fff'
        }}
      />
    </div>
  )
}
