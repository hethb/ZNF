import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { analyzeBatch } from '../services/api'

export default function BatchPage() {
  const { state } = useLocation()
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState(state?.preloadResults || [])
  const [csvBase64, setCsvBase64] = useState(state?.preloadCsvBase64 || '')
  const [sortBy, setSortBy] = useState('confidence')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortBy] ?? -1
      const bv = b[sortBy] ?? -1
      return bv > av ? 1 : -1
    })
  }, [rows, sortBy])

  const onAnalyze = async () => {
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const data = await analyzeBatch(file)
      setRows(data.results || [])
      setCsvBase64(data.csv_base64 || '')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Batch analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  const onExport = () => {
    if (!csvBase64) return
    const blob = new Blob(
      [Uint8Array.from(atob(csvBase64), (c) => c.charCodeAt(0))],
      { type: 'text/csv' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'batch_results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-28">
      {/* Header */}
      <div className="mb-7">
        <p className="section-label mb-2 block">Batch Processing</p>
        <h1 className="display-heading text-4xl">Batch Analysis</h1>
      </div>

      {/* Toolbar */}
      <section className="glass-card mb-5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <label
            className="relative cursor-pointer rounded-lg text-sm"
            style={{
              background: 'rgba(212,178,140,0.05)',
              border: '1px solid rgba(212,178,140,0.12)',
              padding: '0.5rem 0.875rem',
              color: file ? '#d9834a' : '#7a6b59'
            }}
          >
            <input
              type="file"
              accept=".zip"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? file.name : 'Choose ZIP file…'}
          </label>

          <button onClick={onAnalyze} disabled={!file || loading} className="btn-primary">
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing…
              </>
            ) : 'Analyze ZIP'}
          </button>

          <button onClick={onExport} disabled={!csvBase64} className="btn-ghost">
            ↓ Export CSV
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-dark cursor-pointer"
          >
            <option value="confidence">Sort by confidence</option>
            <option value="intensity_score">Sort by score</option>
          </select>
        </div>

        {error && (
          <div
            className="mt-4 rounded-lg px-4 py-3 text-sm"
            style={{
              background: 'rgba(194,60,40,0.1)',
              border: '1px solid rgba(194,60,40,0.25)',
              color: '#f0a090'
            }}
          >
            {error}
          </div>
        )}
      </section>

      {/* Results table */}
      <section className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(212,178,140,0.05)', borderBottom: '1px solid rgba(212,178,140,0.08)' }}>
                {['Filename', 'Tissue', 'Score', 'Confidence', 'Needs Review'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-widest"
                    style={{ color: '#7a6b59' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center" style={{ color: '#7a6b59' }}>
                    No batch results yet. Upload a ZIP to begin.
                  </td>
                </tr>
              ) : (
                sortedRows.map((r, i) => (
                  <tr key={`${r.filename}-${i}`} className="table-row-dark">
                    <td className="px-5 py-3.5 font-medium" style={{ color: '#f4ece0' }}>{r.filename}</td>
                    <td className="px-5 py-3.5" style={{ color: '#c4ad92' }}>{r.tissue_type || '—'}</td>
                    <td className="px-5 py-3.5" style={{ color: '#c4ad92' }}>{r.intensity_label || r.error || '—'}</td>
                    <td className="px-5 py-3.5">
                      {r.confidence != null ? (
                        <span
                          className="inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            background: 'rgba(194,98,26,0.15)',
                            border: '1px solid rgba(194,98,26,0.28)',
                            color: '#d9834a'
                          }}
                        >
                          {Math.round(r.confidence * 100)}%
                        </span>
                      ) : (
                        <span style={{ color: '#7a6b59' }}>—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {r.needs_review ? (
                        <span
                          className="inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            background: 'rgba(194,138,26,0.12)',
                            border: '1px solid rgba(194,138,26,0.26)',
                            color: '#e8c06a'
                          }}
                        >
                          Review
                        </span>
                      ) : (
                        <span style={{ color: '#7a6b59' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
