import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { analyzeImage, health } from '../services/api'

const DEMO_SLIDES = [
  { path: '/demo/slide1.png', label: 'Example patch A' },
  { path: '/demo/slide2.png', label: 'Example patch B' },
  { path: '/demo/slide3.png', label: 'Example patch C' },
  { path: '/demo/slide4.png', label: 'Example patch D' }
]

export default function DemoPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(null)
  const [loadingKey, setLoadingKey] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const h = await health()
        if (!cancelled) setReady(Boolean(h?.model_loaded))
      } catch {
        if (!cancelled) setReady(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const runDemo = useCallback(
    async (path) => {
      setErr('')
      setLoadingKey(path)
      try {
        const res = await fetch(path)
        if (!res.ok) throw new Error(`Missing ${path} — run the image generator script (see README).`)
        const blob = await res.blob()
        const name = path.split('/').pop() || 'demo.png'
        const file = new File([blob], name, { type: blob.type || 'image/png' })
        const preview = URL.createObjectURL(blob)
        const result = await analyzeImage(file)
        navigate('/results', { state: { result, preview } })
      } catch (e) {
        setErr(e?.response?.data?.detail || e?.message || 'Demo run failed.')
      } finally {
        setLoadingKey(null)
      }
    },
    [navigate]
  )

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-28">
      <div className="mb-8">
        <p className="section-label mb-2 block">Live demo</p>
        <h1 className="display-heading text-4xl">Try PathIQ on example slides</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: '#a08060' }}>
          No upload needed—each patch runs through the same pipeline as Analyze (tissue context,
          intensity, uncertainty, Grad-CAM). For YC or investor screens, pair this with a short Loom
          walkthrough.
        </p>
      </div>

      {ready === false && (
        <div
          className="mb-6 rounded-xl px-4 py-3 text-sm leading-relaxed"
          style={{
            background: 'rgba(194,138,26,0.1)',
            border: '1px solid rgba(194,138,26,0.28)',
            color: '#e8c06a'
          }}
        >
          <strong>Backend models not loaded.</strong> From the repo root, with the backend venv active,
          run{' '}
          <code className="rounded px-1.5 py-0.5 text-xs" style={{ background: 'rgba(0,0,0,0.35)' }}>
            python scripts/bootstrap_minimal_demo.py
          </code>{' '}
          (synthetic training for a working demo), then{' '}
          <code className="rounded px-1.5 py-0.5 text-xs" style={{ background: 'rgba(0,0,0,0.35)' }}>
            uvicorn backend.api:app --reload
          </code>
          . Replace with a public IHC cohort for real validation—see{' '}
          <code className="text-xs">docs/PUBLIC_IHC_DATASETS.md</code>.
        </div>
      )}

      {ready === true && (
        <p className="mb-6 text-sm" style={{ color: '#8a9962' }}>
          Models are loaded—click any card to run analysis.
        </p>
      )}

      {err && (
        <div
          className="mb-6 rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(194,60,40,0.1)',
            border: '1px solid rgba(194,60,40,0.25)',
            color: '#f0a090'
          }}
        >
          {err}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {DEMO_SLIDES.map(({ path, label }) => (
          <div key={path} className="glass-card overflow-hidden p-4">
            <img
              src={path}
              alt=""
              className="mb-3 h-40 w-full rounded-lg object-cover"
              style={{ background: 'rgba(0,0,0,0.35)' }}
            />
            <p className="mb-3 text-sm font-medium" style={{ color: '#f4ece0' }}>{label}</p>
            <button
              type="button"
              disabled={ready !== true || loadingKey !== null}
              onClick={() => runDemo(path)}
              className="btn-primary w-full py-2.5 text-sm disabled:opacity-40"
            >
              {loadingKey === path ? 'Running…' : 'Run analysis'}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm" style={{ color: '#7a6b59' }}>
        <Link to="/analyze" className="font-semibold underline underline-offset-2" style={{ color: '#d9834a' }}>
          Upload your own slide →
        </Link>
      </p>
    </div>
  )
}
