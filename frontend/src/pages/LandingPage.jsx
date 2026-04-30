import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const features = [
  {
    tag: 'Context',
    title: 'Tissue class + stain readout',
    text:
      'Patch-level intensity stays paired with tissue bucket so mixed ROIs—stroma-heavy, tumor edge—stay legible instead of collapsing to a single opaque score.',
    span: 'md:col-span-2'
  },
  {
    tag: 'Triage',
    title: 'When the model hesitates',
    text:
      'Dropout-derived spread and entropy-style signals mark rows for human review before they hit your sign-out queue.',
    span: ''
  },
  {
    tag: 'Explain',
    title: 'Where the network looks',
    text:
      'Heatmap overlays for communication with residents, referrers, or QA—not a black-box probability in isolation.',
    span: ''
  }
]

function SpecimenGrid() {
  return (
    <div className="specimen-grid" aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  )
}

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

  const orbX = (mouse.x - 0.5) * 40
  const orbY = (mouse.y - 0.5) * 32

  const handleHeroClick = (e) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const id = Date.now() + Math.random()
    setRipples((prev) => [...prev, { id, x, y }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 900)
  }

  return (
    <div className="relative z-10 pb-28 pt-28">
      <section
        ref={heroRef}
        onClick={handleHeroClick}
        className="relative mx-auto max-w-6xl cursor-default select-none px-4 pb-16 pt-6 md:pt-10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-1/2 hidden lg:block"
          style={{
            transform: `translate(0, -50%) translate(${orbX * 0.3}px, ${orbY * 0.3}px)`,
            transition: 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
          }}
        >
          <div
            className="rounded-full blur-3xl"
            style={{
              width: 320,
              height: 320,
              background:
                'radial-gradient(circle, rgba(194,98,26,0.2) 0%, rgba(138,153,98,0.08) 50%, transparent 70%)',
              animation: 'orbPulse 5s ease-in-out infinite'
            }}
          />
        </div>

        {ripples.map((r) => (
          <div
            key={r.id}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full border border-[rgba(194,98,26,0.35)]"
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              transform: 'translate(-50%, -50%)',
              animation: 'rippleExpand 0.9s ease-out forwards'
            }}
          />
        ))}

        <div className="relative z-10 grid gap-12 lg:grid-cols-12 lg:gap-8 lg:items-center">
          <div className="lg:col-span-7">
            <div className="mb-8 flex flex-wrap items-center gap-4">
              <span className="section-label">Patch reads · IHC</span>
              <span className="hidden h-px flex-1 min-w-[3rem] sm:block" style={{ background: 'rgba(212,178,140,0.2)' }} />
            </div>

            <h1 className="display-heading max-w-xl text-4xl sm:text-5xl md:text-6xl">
              Stain scores you can
              <br />
              <span className="gradient-text">argue with.</span>
            </h1>

            <p className="type-pull mt-8 max-w-lg border-l border-[rgba(194,98,26,0.35)] pl-5">
              PathIQ is decision-support for patch exports: tissue label, four-tier read, uncertainty flags,
              and a heatmap—built from the same transfer-learning habits as the ZNF835 IHC work, now
              marker-agnostic.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/demo" className="btn-primary">
                Demo (no upload)
              </Link>
              <Link to="/analyze" className="btn-ghost">
                Single slide
              </Link>
              <Link to="/batch" className="btn-ghost">
                Batch CSV
              </Link>
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-8 lg:col-span-5 lg:items-end">
            <div
              className="surface-editorial w-full max-w-sm p-6 pl-7"
              style={{ borderLeftWidth: 4, borderLeftColor: 'rgba(138,153,98,0.5)' }}
            >
              <p className="font-['Syne',sans-serif] text-xs font-semibold tracking-widest text-[#8a9962]">
                FIELD LAYOUT
              </p>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: '#a08060' }}>
                Six-by-four placeholder grid—echo of tiled WSI views—sits opposite the copy so the hero
                is not another centered headline on a void.
              </p>
            </div>
            <SpecimenGrid />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-8 max-w-6xl px-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-label mb-2">What ships today</p>
            <h2 className="display-heading text-2xl sm:text-3xl md:text-4xl">Three levers, one stack</h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed md:text-right" style={{ color: '#7a6b59' }}>
            No carousel. No icon trio in circles. Just the parts a lab would actually wire into a pilot.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map((f, i) => (
            <article
              key={f.title}
              className={`glass-card glass-card-hover p-7 ${f.span} ${i === 1 ? 'md:translate-y-4' : i === 2 ? 'md:-translate-y-2' : ''}`}
            >
              <p className="font-['Syne',sans-serif] text-[0.65rem] font-bold tracking-[0.2em] text-[#c27a40]">
                {f.tag}
              </p>
              <h3 className="mt-3 font-['Syne',sans-serif] text-lg font-semibold tracking-tight" style={{ color: '#f4ece0' }}>
                {f.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed" style={{ color: '#a08060' }}>
                {f.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-20 max-w-6xl px-4">
        <div className="surface-editorial p-8 pl-9 md:p-10 md:pl-12" style={{ borderLeftColor: 'rgba(138,153,98,0.45)' }}>
          <p className="section-label mb-3 block" style={{ color: '#8a9962' }}>
            Paper → product
          </p>
          <p className="max-w-3xl text-lg leading-relaxed md:text-xl" style={{ color: '#c4ad92' }}>
            The stack still carries the habits of{' '}
            <cite className="font-semibold not-italic" style={{ color: '#f4ece0' }}>
              Exploring the Oncogenic Potential of Zinc Finger Protein 835 (ZNF835) in Cancer
            </cite>
            —held-out metrics, confusion-matrix discipline, reproducible tensors—but PathIQ is deliberately
            boring software: upload, read, export. The manuscript stays the citation trail; the UI stays
            out of its way.
          </p>
          <p className="mt-6">
            <Link
              to="/about"
              className="font-['Syne',sans-serif] text-sm font-semibold uppercase tracking-wider underline decoration-[rgba(194,98,26,0.5)] underline-offset-4"
              style={{ color: '#d9834a' }}
            >
              About & lineage →
            </Link>
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-16 max-w-6xl px-4">
        <div className="surface-editorial relative overflow-hidden px-8 py-11 text-left md:px-12 md:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full opacity-40"
            style={{
              background: 'radial-gradient(circle, rgba(194,98,26,0.25), transparent 70%)',
              filter: 'blur(40px)'
            }}
          />
          <p className="section-label mb-2">Next step</p>
          <h2 className="display-heading relative max-w-md text-2xl md:text-3xl">
            Try a patch on your machine.
          </h2>
          <p className="relative mt-4 max-w-lg text-base leading-relaxed" style={{ color: '#a08060' }}>
            Demo uses bundled frames; analyze accepts your JPG/PNG; batch zips a folder and returns a
            sortable table.
          </p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link to="/demo" className="btn-primary">
              Open demo
            </Link>
            <Link to="/analyze" className="btn-ghost">
              Analyze
            </Link>
            <Link to="/batch" className="btn-ghost">
              Batch
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
