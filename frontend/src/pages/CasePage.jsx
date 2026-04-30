import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { analyzeCase } from '../services/api'
import { triageFromUncertainty, triageDotStyle } from '../utils/uncertainty'

const LABELS = ['0', '1+', '2+', '3+']

export default function CasePage() {
  const [files, setFiles] = useState([])
  const [caseId, setCaseId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const onPick = (e) => {
    const list = Array.from(e.target.files || [])
    setFiles(list)
    setData(null)
    setError('')
  }

  const onRun = async () => {
    if (!files.length) return
    setError('')
    setLoading(true)
    try {
      const res = await analyzeCase(files, { caseId })
      setData(res)
    } catch (err) {
      setData(null)
      setError(err?.response?.data?.detail || 'Case analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  const onExportCsv = () => {
    const b64 = data?.csv_base64
    if (!b64) return
    const blob = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = data.filename || 'case_export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const summary = data?.summary
  const rows = data?.results || []

  const dist = summary?.patch_score_distribution_pct
  const sortedPreview = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.error && !b.error) return 1
      if (!a.error && b.error) return -1
      return (b.uncertainty_combined ?? 0) - (a.uncertainty_combined ?? 0)
    })
  }, [rows])

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-28">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label mb-1 block">Workflow</p>
          <h1 className="display-heading text-4xl">Case upload</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: '#a08060' }}>
            Pathologists think in cases: multiple ROIs or patches per accession. Upload several images at
            once for batch scoring, a case-level distribution, suggested call, and review flags—then export
            CSV for LIMS or QA.
          </p>
        </div>
        <Link to="/analyze" className="btn-ghost text-sm">
          ← Single / ZIP
        </Link>
      </div>

      <section className="glass-card mb-6 space-y-4 p-5">
        <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: '#7a6b59' }}>
          Case ID (optional)
        </label>
        <input
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          placeholder="e.g. ACC-2026-0142"
          className="input-dark max-w-md"
        />
        <label
          className="relative mt-2 flex cursor-pointer flex-wrap items-center gap-3 rounded-lg text-sm"
          style={{
            background: 'rgba(212,178,140,0.05)',
            border: '1px solid rgba(212,178,140,0.12)',
            padding: '0.75rem 1rem',
            color: files.length ? '#d9834a' : '#7a6b59'
          }}
        >
          <input type="file" accept=".jpg,.jpeg,.png" multiple className="absolute inset-0 cursor-pointer opacity-0" onChange={onPick} />
          {files.length ? `${files.length} image(s) selected` : 'Choose multiple JPG/PNG ROIs…'}
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onRun} disabled={!files.length || loading} className="btn-primary">
            {loading ? 'Scoring case…' : 'Run case scoring'}
          </button>
          <button type="button" onClick={onExportCsv} disabled={!data?.csv_base64} className="btn-ghost">
            Export case CSV
          </button>
        </div>
        {error && (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(194,60,40,0.1)', border: '1px solid rgba(194,60,40,0.25)', color: '#f0a090' }}>
            {error}
          </div>
        )}
      </section>

      {summary && (
        <section className="glass-card mb-6 space-y-5 p-6">
          <p className="section-label">Case-level summary</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl p-4" style={{ background: 'rgba(212,178,140,0.06)', border: '1px solid rgba(212,178,140,0.1)' }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: '#7a6b59' }}>Patches OK</p>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: '#f4ece0' }}>
                {summary.n_analyzed_ok} / {summary.n_images}
              </p>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(212,178,140,0.06)', border: '1px solid rgba(212,178,140,0.1)' }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: '#7a6b59' }}>Suggested score</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#f4ece0' }}>
                {summary.suggested_final_label || '—'}
              </p>
              <p className="mt-1 text-xs" style={{ color: '#7a6b59' }}>
                Majority of patch calls
                {summary.soft_consensus_score != null && summary.soft_consensus_score !== summary.suggested_final_score
                  ? ` · soft mean peaks at ${summary.soft_consensus_label}`
                  : ''}
              </p>
            </div>
            <div className="rounded-xl p-4 sm:col-span-2" style={{ background: 'rgba(212,178,140,0.06)', border: '1px solid rgba(212,178,140,0.1)' }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: '#7a6b59' }}>% of patches at each tier</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {dist &&
                  LABELS.map((k) => (
                    <div key={k} className="min-w-[4.5rem]">
                      <p className="text-xs" style={{ color: '#c4ad92' }}>
                        {k}
                      </p>
                      <p className="text-xl font-bold tabular-nums" style={{ color: '#f4ece0' }}>
                        {dist[k]}%
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          {summary.needs_review_count > 0 && (
            <div
              className="rounded-lg px-4 py-3 text-sm font-medium"
              style={{
                background: 'rgba(194,138,26,0.1)',
                border: '1px solid rgba(194,138,26,0.28)',
                color: '#e8c06a'
              }}
            >
              Needs review: {summary.needs_review_count} region(s) — triage these first.
              {summary.needs_review_filenames?.length ? (
                <span className="mt-2 block text-xs font-normal opacity-90">{summary.needs_review_filenames.join(', ')}</span>
              ) : null}
            </div>
          )}
        </section>
      )}

      {sortedPreview.length > 0 && (
        <section className="glass-card overflow-hidden">
          <div className="border-b px-5 py-3" style={{ borderColor: 'rgba(212,178,140,0.08)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7a6b59' }}>
              Regions (sorted by uncertainty — triage first)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(212,178,140,0.05)' }}>
                  {['Triage', 'File', 'Score', 'Uncertainty', 'Review'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: '#7a6b59' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPreview.map((r, i) => (
                  <tr key={`${r.filename}-${i}`} className="table-row-dark">
                    <td className="px-5 py-3">
                      {!r.error ? (
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          title={triageFromUncertainty(r.uncertainty_combined).label}
                          style={triageDotStyle(r.uncertainty_combined)}
                        />
                      ) : (
                        <span style={{ color: '#7a6b59' }}>—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: '#f4ece0' }}>
                      {r.filename}
                    </td>
                    <td className="px-5 py-3" style={{ color: '#c4ad92' }}>
                      {r.intensity_label || r.error || '—'}
                    </td>
                    <td className="px-5 py-3 tabular-nums" style={{ color: '#c4ad92' }}>
                      {r.uncertainty_combined != null ? `${Math.round(Number(r.uncertainty_combined) * 100)}%` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {r.needs_review ? (
                        <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: 'rgba(194,138,26,0.12)', color: '#e8c06a' }}>
                          Review
                        </span>
                      ) : (
                        <span style={{ color: '#7a6b59' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
