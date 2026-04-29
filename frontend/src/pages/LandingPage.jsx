import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const features = [
  {
    num: '01',
    title: 'Tumor-first scoring pipeline',
    text: 'Every slide is tissue-classified before intensity scoring to avoid inappropriate calls on non-tumor regions.'
  },
  {
    num: '02',
    title: 'Uncertainty-aware output',
    text: 'Monte Carlo dropout quantifies confidence and flags uncertain cases for manual review.'
  },
  {
    num: '03',
    title: 'Visual explanation with Grad-CAM',
    text: 'Heatmap overlays make predictions interpretable for pathology review and communication.'
  }
]

export default function LandingPage() {
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 })
  const [ripples, setRipples] = useState([])
  const heroRef = useRef(null)

  useEffect(() => {
    const onMove = (e) => {
      setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const orbX = (mouse.x - 0.5) * 60
  const orbY = (mouse.y - 0.5) * 50

  const handleHeroClick = (e) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const id = Date.now() + Math.random()
    setRipples((prev) => [...prev, { id, x, y }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 950)
  }

  return (
    <div className="relative z-10 pb-24 pt-28">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        onClick={handleHeroClick}
        className="relative mx-auto max-w-5xl cursor-default select-none px-4 pb-12 pt-8"
      >
        {/* Parallax orb — earthy amber ember, shifts with mouse */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2"
          style={{
            transform: `translate(calc(-50% + ${orbX}px), calc(-50% + ${orbY}px))`,
            transition: 'transform 0.65s cubic-bezier(0.23, 1, 0.32, 1)'
          }}
        >
          {/* Outer amber bloom */}
          <div
            className="h-96 w-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(194,98,26,0.26) 0%, rgba(138,153,98,0.10) 55%, transparent 72%)',
              filter: 'blur(60px)',
              animation: 'orbPulse 4.5s ease-in-out infinite'
            }}
          />
          {/* Inner glowing ember sphere */}
          <div
            className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: 'radial-gradient(circle at 38% 32%, rgba(245,175,90,0.95), rgba(194,98,26,0.88) 45%, rgba(100,45,10,0.72) 75%, rgba(20,10,4,0.5))',
              boxShadow: '0 0 55px 18px rgba(194,98,26,0.32), 0 0 110px 45px rgba(194,98,26,0.14)',
              animation: 'orbPulse 4.5s ease-in-out infinite'
            }}
          />
        </div>

        {/* Click ripples — warm amber */}
        {ripples.map((r) => (
          <div
            key={r.id}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full"
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              transform: 'translate(-50%, -50%)',
              border: '1px solid rgba(194,98,26,0.5)',
              animation: 'rippleExpand 0.95s ease-out forwards'
            }}
          />
        ))}

        {/* Hero text */}
        <div className="relative z-10 text-center">
          <div
            className="mb-6 inline-flex items-center gap-2.5 rounded-full px-4 py-1.5"
            style={{
              background: 'rgba(194,98,26,0.1)',
              border: '1px solid rgba(194,98,26,0.28)'
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: '#d9834a', animation: 'orbPulse 2.2s ease-in-out infinite' }}
            />
            <span className="section-label">AI-Powered Pathology</span>
          </div>

          <h1
            className="display-heading mx-auto max-w-3xl text-5xl md:text-6xl lg:text-7xl"
          >
            Modern IHC scoring
            <br />
            <span className="gradient-text">with AI confidence.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: '#c4ad92' }}>
            PathIQ gives pathologists a fast, interpretable AI-native workflow for tissue recognition,
            intensity scoring, uncertainty triage, and visual validation.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/analyze" className="btn-primary px-8 py-3 text-[0.9rem]">
              Analyze a Slide →
            </Link>
            <Link to="/batch" className="btn-ghost px-8 py-3 text-[0.9rem]">
              Batch Workflow
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature cards ──────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto mt-20 max-w-5xl px-4">
        <p className="section-label mb-3 block text-center">Core capabilities</p>
        <h2 className="display-heading mb-12 text-center text-3xl">
          Built for precision pathology
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="glass-card glass-card-hover p-6">
              <p
                className="mb-4 text-sm font-bold"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: 'linear-gradient(135deg, #e89c60, #c2621a)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                {f.num}
              </p>
              <h3 className="text-base font-semibold" style={{ color: '#f4ece0' }}>{f.title}</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: '#a08060' }}>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── CTA strip ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto mt-16 max-w-5xl px-4">
        <div className="glass-card relative overflow-hidden px-8 py-12 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(194,98,26,0.10), transparent 70%)'
            }}
          />
          <p className="section-label mb-2 block">Get started</p>
          <h2 className="display-heading relative text-2xl">
            Ready to score your first slide?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm" style={{ color: '#a08060' }}>
            Upload a single JPG/PNG or a ZIP batch. Results arrive in seconds.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-4">
            <Link to="/analyze" className="btn-primary">Analyze a Slide →</Link>
            <Link to="/batch" className="btn-ghost">Batch Workflow</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
