import { Link } from 'react-router-dom'
import { useState } from 'react'

const features = [
  {
    title: 'Tumor-first scoring pipeline',
    text: 'Every slide is tissue-classified before intensity scoring to avoid inappropriate calls on non-tumor regions.'
  },
  {
    title: 'Uncertainty-aware output',
    text: 'Monte Carlo dropout quantifies confidence and flags uncertain cases for manual review.'
  },
  {
    title: 'Visual explanation with Grad-CAM',
    text: 'Heatmap overlays make predictions interpretable for pathology review and communication.'
  }
]

export default function LandingPage() {
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50 })
  const [mode, setMode] = useState('hyper')
  const [ripples, setRipples] = useState([])

  const glowStrength = mode === 'hyper' ? 0.48 : 0.28
  const glowRadius = mode === 'hyper' ? 44 : 32

  return (
    <div className="pb-12 text-slate-100">
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div
          className="relative overflow-hidden rounded-none border border-white/10 bg-white/5 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-12"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            const x = ((event.clientX - rect.left) / rect.width) * 100
            const y = ((event.clientY - rect.top) / rect.height) * 100
            setSpotlight({ x, y })
          }}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            const x = ((event.clientX - rect.left) / rect.width) * 100
            const y = ((event.clientY - rect.top) / rect.height) * 100
            const id = Date.now() + Math.random()
            setRipples((prev) => [...prev, { id, x, y }])
            window.setTimeout(() => {
              setRipples((prev) => prev.filter((ripple) => ripple.id !== id))
            }, 700)
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle at ${spotlight.x}% ${spotlight.y}%, rgba(99,102,241,${glowStrength}), transparent ${glowRadius}%)`
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle at ${spotlight.x}% ${spotlight.y}%, rgba(6,182,212,0.2), transparent ${glowRadius + 12}%)`
            }}
          />
          {ripples.map((ripple) => (
            <div
              key={ripple.id}
              className="pointer-events-none absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 border border-brand/60 opacity-80 animate-ping"
              style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}
            />
          ))}
          <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-brand/45 to-cyan/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-gradient-to-tr from-violet/40 to-brand/20 blur-3xl" />

          <p className="relative mb-4 inline-flex rounded-none border border-brand/30 bg-brand/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100">
            AI-Powered Pathology Workflow
          </p>
          <h1 className="relative max-w-4xl text-4xl font-bold leading-tight text-slate-100 md:text-5xl">
            Modern IHC scoring with confidence-aware AI assistance.
          </h1>
          <p className="relative mt-5 max-w-3xl text-base leading-7 text-slate-200 md:text-lg">
            PathIQ helps pathologists move faster with an elegant, AI-native workflow for tissue recognition, intensity scoring,
            uncertainty triage, and visual validation.
          </p>
          <div className="relative mt-4 flex items-center gap-2 text-xs">
            <span className="text-slate-200">Move/click to interact:</span>
            <button
              type="button"
              onClick={() => setMode('calm')}
              className={`border px-2 py-1 ${mode === 'calm' ? 'border-slate-100 bg-white/20 text-slate-100' : 'border-slate-300/70 bg-white/10 text-slate-200'}`}
            >
              Calm
            </button>
            <button
              type="button"
              onClick={() => setMode('hyper')}
              className={`border px-2 py-1 ${mode === 'hyper' ? 'border-slate-100 bg-white/20 text-slate-100' : 'border-slate-300/70 bg-white/10 text-slate-200'}`}
            >
              Hyper
            </button>
          </div>

          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link to="/analyze" className="rounded-none bg-gradient-to-r from-brand via-violet to-cyan px-6 py-2.5 text-sm font-semibold text-slate-100 shadow-glow">
              Analyze a Slide
            </Link>
            <Link to="/batch" className="rounded-none border border-white/20 bg-white/20 px-6 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/30">
              Batch Workflow
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-none border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h3 className="text-base font-semibold text-slate-100">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-200">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
