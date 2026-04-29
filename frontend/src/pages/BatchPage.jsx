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
    try {
      const data = await analyzeBatch(file)
      setRows(data.results || [])
      setCsvBase64(data.csv_base64 || '')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Batch analysis failed.')
    }
  }

  const onExport = () => {
    if (!csvBase64) return
    const blob = new Blob([Uint8Array.from(atob(csvBase64), (c) => c.charCodeAt(0))], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'batch_results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold text-slate-100">Batch Analysis</h1>

      <section className="mb-6 rounded-none border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="max-w-xs rounded-none border border-slate-300 bg-white px-4 py-2 text-sm"
          />
          <button onClick={onAnalyze} className="rounded-none bg-gradient-to-r from-brand to-violet px-5 py-2 text-sm font-semibold text-slate-100 shadow-glow">
            Analyze ZIP
          </button>
          <button onClick={onExport} disabled={!csvBase64} className="rounded-none border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40">
            Export CSV
          </button>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-none border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="confidence">Sort by confidence</option>
            <option value="intensity_score">Sort by score</option>
          </select>
        </div>
        {error && <p className="mt-3 rounded-none border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      <section className="overflow-hidden rounded-none border border-white/60 bg-white/80 shadow-soft backdrop-blur">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-indigo-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Tissue</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Needs Review</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No batch results yet. Upload a ZIP to begin.
                  </td>
                </tr>
              )}
              {sortedRows.map((r, i) => (
                <tr key={`${r.filename}-${i}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.filename}</td>
                  <td className="px-4 py-3 text-slate-700">{r.tissue_type || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{r.intensity_label || r.error || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{r.confidence ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{String(r.needs_review ?? '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
