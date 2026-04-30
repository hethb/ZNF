import { useState } from 'react'
import { Link } from 'react-router-dom'
import { runBenchmark } from '../services/api'

export default function BenchmarkPage() {
  const [zip, setZip] = useState(null)
  const [labels, setLabels] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const onRun = async () => {
    if (!zip) return
    setError('')
    setLoading(true)
    try {
      const res = await runBenchmark(zip, labels || null)
      setData(res)
    } catch (err) {
      setData(null)
      setError(err?.response?.data?.detail || 'Benchmark failed.')
    } finally {
      setLoading(false)
    }
  }

  const m = data?.metrics
  const cm = m?.confusion_matrix
  const labelsNote = data?.labels_note

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-28">
      <div className="mb-7">
        <p className="section-label mb-1 block">Validation</p>
        <h1 className="display-heading text-4xl">Benchmark mode</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: '#a08060' }}>
          Upload the same ZIP you use for batch scoring plus an optional CSV of pathologist labels
          (columns <code className="text-[#d9834a]">filename</code>, <code className="text-[#d9834a]">label</code> with integers 0–3).
          PathIQ returns exact accuracy, within-one accuracy, Cohen&apos;s kappa, and a confusion matrix for internal QA.
        </p>
        <Link to="/batch" className="btn-ghost mt-4 inline-block text-sm">
          ← Batch scoring
        </Link>
      </div>

      <section className="glass-card mb-6 space-y-4 p-5">
        <label className="relative inline-block cursor-pointer rounded-lg text-sm" style={{ background: 'rgba(212,178,140,0.05)', border: '1px solid rgba(212,178,140,0.12)', padding: '0.5rem 0.875rem', color: zip ? '#d9834a' : '#7a6b59' }}>
          <input type="file" accept=".zip" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => setZip(e.target.files?.[0] || null)} />
          {zip ? zip.name : 'ZIP of patches…'}
        </label>
        <label className="relative ml-0 inline-block cursor-pointer rounded-lg text-sm md:ml-3" style={{ background: 'rgba(212,178,140,0.05)', border: '1px solid rgba(212,178,140,0.12)', padding: '0.5rem 0.875rem', color: labels ? '#d9834a' : '#7a6b59' }}>
          <input type="file" accept=".csv,text/csv" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => setLabels(e.target.files?.[0] || null)} />
          {labels ? labels.name : 'Labels CSV (optional)…'}
        </label>
        <div>
          <button type="button" className="btn-primary" disabled={!zip || loading} onClick={onRun}>
            {loading ? 'Running…' : 'Run benchmark'}
          </button>
        </div>
        {error && (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(194,60,40,0.1)', border: '1px solid rgba(194,60,40,0.25)', color: '#f0a090' }}>
            {error}
          </div>
        )}
        {labelsNote ? <p className="text-sm" style={{ color: '#7a6b59' }}>{labelsNote}</p> : null}
      </section>

      {m && (
        <section className="glass-card mb-6 space-y-4 p-6">
          <p className="section-label">Agreement metrics</p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Metric label="Matched rows" value={m.n_matched} />
            <Metric label="Cohen κ" value={m.cohen_kappa} />
            <Metric label="Exact accuracy" value={m.accuracy_exact} suffix="" isRatio />
            <Metric label="Within ±1" value={m.accuracy_within_1} suffix="" isRatio />
          </div>
          {Array.isArray(cm) && cm.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#7a6b59' }}>
                Confusion matrix (rows = true, cols = predicted)
              </p>
              <div className="overflow-x-auto">
                <table className="border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="p-2" />
                      {(m.confusion_labels || [0, 1, 2, 3]).map((c) => (
                        <th key={c} className="p-2 text-xs font-semibold" style={{ color: '#c4ad92' }}>
                          pred {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cm.map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 text-xs font-semibold" style={{ color: '#c4ad92' }}>
                          true {m.confusion_labels?.[i] ?? i}
                        </td>
                        {row.map((cell, j) => (
                          <td key={j} className="p-2 text-center tabular-nums" style={{ background: 'rgba(212,178,140,0.06)', color: '#f4ece0', border: '1px solid rgba(212,178,140,0.08)' }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function Metric({ label, value, suffix = '', isRatio }) {
  const display = isRatio && typeof value === 'number' ? `${Math.round(value * 1000) / 10}%` : value
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(212,178,140,0.06)', border: '1px solid rgba(212,178,140,0.1)' }}>
      <p className="text-xs uppercase tracking-widest" style={{ color: '#7a6b59' }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: '#f4ece0' }}>
        {display}
        {suffix}
      </p>
    </div>
  )
}
