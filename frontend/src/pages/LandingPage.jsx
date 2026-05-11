import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext'
import { workflowAuthConfig } from '../services/api'

const DEFAULT_SIGNUP_ROLES = ['Researcher', 'Pathologist', 'Technician']

const stats = [
  {
    value: '20M → 35M',
    label: 'Projected new cancer cases per year, 2022 → 2050',
    source: 'IARC / WHO, 2024'
  },
  {
    value: '+77%',
    label: 'Cancer-case growth driving downstream pathology workload',
    source: 'IARC, 2024'
  },
  {
    value: '~14,000',
    label: 'Projected US pathologist FTE by 2030 — demand outpacing supply',
    source: 'CAP / Arch Pathol Lab Med'
  }
]

const steps = [
  {
    n: 1,
    title: 'Upload slides + metadata',
    body: 'Drop one or many IHC patches, ROIs, or full cases. Tag tissue, biomarker, scanner, and reviewer in seconds.'
  },
  {
    n: 2,
    title: 'AI scores + flags uncertainty',
    body: 'Tissue-aware intensity scoring (0/1+/2+/3+) with calibrated uncertainty and Grad-CAM overlays so you see exactly what the model focused on.'
  },
  {
    n: 3,
    title: 'Pathologist signs out, audit auto-logs',
    body: 'Accept, override with rationale, or reroute. Every action is captured for QA, agreement metrics, and compliance exports.'
  }
]

const features = [
  {
    title: 'AI pre-scoring',
    body: 'Tissue-aware IHC intensity estimates with calibrated confidence for triage.'
  },
  {
    title: 'Uncertainty triage',
    body: 'Surface borderline patches, artifacts, and low-confidence regions before sign-out.'
  },
  {
    title: 'Pathologist override',
    body: 'Structured corrections, rationale capture, and final scores that stay clinician-owned.'
  },
  {
    title: 'Audit-ready reports',
    body: 'Immutable trails, CSV exports, and PDF summaries aligned to lab QA expectations.'
  },
  {
    title: 'QA analytics',
    body: 'Throughput, AI–human agreement, and reviewer variability in one operations-grade view.'
  },
  {
    title: 'Validation mode',
    body: 'Confusion matrices, Cohen\u2019s kappa, and concordance metrics for study-grade governance.'
  }
]

const audiences = [
  {
    role: 'Pathologists',
    title: 'Spend more time on judgment, less on counting.',
    points: [
      'Per-patch scores with confidence and stain-burden trend (0–100)',
      'Heatmap overlay shows the regions the AI weighted',
      'One-click override with note and audit log',
      'Personal activity dashboard with throughput and last-active'
    ]
  },
  {
    role: 'Lab directors',
    title: 'Triage, throughput, and AI–human agreement at a glance.',
    points: [
      'Operational dashboard: pending, flagged, agreement %, time saved',
      'Per-user case scoping and role-based access (RBAC)',
      'Bulk ingest of ZIP\u2019d patches with sorted-by-uncertainty results',
      'Compliance audit log exportable as CSV'
    ]
  },
  {
    role: 'Research teams',
    title: 'Validate models on your own cohort, not a vendor demo.',
    points: [
      'Upload patches + labels CSV to compute kappa and within-1 accuracy',
      'Confusion matrix UI for hold-out evaluation',
      'Pathologist corrections feed an active-learning CSV pipeline',
      'On-prem / VPC / SaaS — your data, your hosting'
    ]
  }
]

const trust = [
  {
    title: 'JWT + bcrypt',
    body: 'Stateless auth with hashed passwords and configurable token TTL.'
  },
  {
    title: 'Role-based access',
    body: 'Five roles, per-user case scoping, server-enforced — not just UI.'
  },
  {
    title: 'Immutable audit log',
    body: 'Every login, edit, and override timestamped and exportable.'
  },
  {
    title: 'Decision-support, not diagnosis',
    body: 'CDS-positioned with explicit disclaimers; pathologist signs out.'
  }
]

const faq = [
  {
    q: 'Is PathIQ FDA-cleared?',
    a: 'No. PathIQ is positioned as clinical decision-support software intended to assist pathologists with IHC quantification and visualization, not to replace independent clinical judgment. Production deployments require regulatory review with qualified counsel; we do not currently market PathIQ as a stand-alone diagnostic device.'
  },
  {
    q: 'Where does our slide data live?',
    a: 'Wherever you host. The reference deployment uses Render (API + Postgres) and Vercel (frontend), but the entire stack is open and runs in any Docker host (Fly.io, Railway, AWS, your own VPC). Slide images are processed in-memory and never written to disk by default; the database stores users, structured case metadata, and an audit trail.'
  },
  {
    q: 'Which biomarkers does PathIQ support?',
    a: 'The model is biomarker-agnostic: it scores 0/1+/2+/3+ stain intensity on any chromogenic IHC patch with tissue context. We started from HER2 / ZNF835 research and the architecture generalizes to any marker once you fine-tune on a labelled cohort. We ship training scripts and a manifest template for public datasets like TUPAC16/HER2.'
  },
  {
    q: 'How is "uncertainty" calculated?',
    a: 'Two complementary signals: Monte-Carlo dropout standard deviation on the predicted class, and normalized entropy of the softmax distribution. The triage UI uses max(MC std, entropy_norm) so a flat distribution (genuinely ambiguous patch) and a noisy prediction both flag for review.'
  },
  {
    q: 'Can pathologists override the AI?',
    a: 'Yes — that is the central design tenet. Every score has a one-click override with optional rationale text and "final reviewed" flag. Corrections are written to a separate feedback CSV plus the compliance audit log, and they feed the active-learning queue for future fine-tuning.'
  },
  {
    q: 'How does pricing work?',
    a: 'Our working hypothesis is $500 per pathologist seat per month on annual contracts, with per-slide metering as an option for high-volume send-out groups. We are still actively price-testing in pilots — get in touch and we will scope a five-week design-partner engagement.'
  }
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { user, loginOffline, loginWithServer, signupWithServer } = useAppState()
  const [name, setName] = useState('')
  const [role, setRole] = useState('Pathologist')
  const [username, setUsername] = useState('pathologist')
  const [password, setPassword] = useState('demo123')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [authTab, setAuthTab] = useState('signin')
  const [signupForm, setSignupForm] = useState({
    username: '',
    password: '',
    displayName: '',
    role: DEFAULT_SIGNUP_ROLES[0]
  })
  const [authConfig, setAuthConfig] = useState({
    signup_enabled: true,
    signup_roles: DEFAULT_SIGNUP_ROLES,
    min_password_length: 8
  })

  useEffect(() => {
    let cancelled = false
    workflowAuthConfig()
      .then((cfg) => {
        if (cancelled) return
        setAuthConfig({
          signup_enabled: cfg?.signup_enabled !== false,
          signup_roles: Array.isArray(cfg?.signup_roles) && cfg.signup_roles.length ? cfg.signup_roles : DEFAULT_SIGNUP_ROLES,
          min_password_length: cfg?.min_password_length || 8
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const goDashboard = () => navigate('/dashboard')

  const scrollTo = (id) => () => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const onServerLogin = async (e) => {
    e.preventDefault()
    setServerError('')
    setLoading(true)
    try {
      await loginWithServer(username, password)
      goDashboard()
    } catch (err) {
      setServerError(err?.response?.data?.detail || err?.message || 'Sign-in failed. Is the API running?')
    } finally {
      setLoading(false)
    }
  }

  const updateSignupField = (key, value) => setSignupForm((prev) => ({ ...prev, [key]: value }))

  const onSignup = async (e) => {
    e.preventDefault()
    setServerError('')
    setLoading(true)
    try {
      await signupWithServer({
        username: signupForm.username.trim().toLowerCase(),
        password: signupForm.password,
        displayName: signupForm.displayName.trim() || signupForm.username.trim(),
        role: signupForm.role
      })
      goDashboard()
    } catch (err) {
      setServerError(err?.response?.data?.detail || err?.message || 'Could not create your account.')
    } finally {
      setLoading(false)
    }
  }

  const onOfflineContinue = () => {
    loginOffline({ name: name || 'Dr. Demo', role })
    goDashboard()
  }

  const onDemoCase = () => {
    loginOffline({ name: 'Dr. Patel', role: 'Pathologist' })
    navigate('/cases/1')
  }

  return (
    <div className="landing-page">
      {/* —— Sticky top nav —— */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <a href="#top" className="landing-brand" onClick={scrollTo('top')}>
            <span className="landing-brand-mark">P</span>
            PathIQ
          </a>
          <div className="landing-nav-links">
            <a href="#how" onClick={scrollTo('how')}>How it works</a>
            <a href="#features" onClick={scrollTo('features')}>Features</a>
            <a href="#audiences" onClick={scrollTo('audiences')}>Who it&rsquo;s for</a>
            <a href="#faq" onClick={scrollTo('faq')}>FAQ</a>
          </div>
          <div className="landing-nav-cta">
            {user ? (
              <button className="btn btn-primary btn-sm" type="button" onClick={goDashboard}>
                Open dashboard
              </button>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" type="button" onClick={scrollTo('access')}>
                  Sign in
                </button>
                <button className="btn btn-primary btn-sm" type="button" onClick={scrollTo('access')}>
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* —— Hero —— */}
      <section id="top" className="hero" style={{ minHeight: 'auto', padding: '3.25rem 1.5rem 3.25rem' }}>
        <div className="hero-grid-bg" />
        <div className="hero-blobs" aria-hidden>
          <div className="hero-blob" style={{ width: 420, height: 420, left: '-8%', top: '10%', background: 'rgba(212, 107, 59, 0.35)' }} />
          <div className="hero-blob" style={{ width: 360, height: 360, right: '-5%', top: '22%', background: 'rgba(196, 135, 90, 0.28)' }} />
          <div className="hero-blob" style={{ width: 300, height: 300, left: '35%', bottom: '-5%', background: 'rgba(139, 111, 168, 0.18)' }} />
        </div>

        <div className="hero-inner">
          <div className="landing-hero-grid">
            <div>
              <span className="landing-eyebrow">
                <span className="landing-eyebrow-dot" />
                Clinical decision-support for IHC
              </span>
              <h1 className="landing-headline">
                AI-assisted IHC scoring, built for the way <span className="landing-headline-accent">pathologists actually work.</span>
              </h1>
              <p className="landing-subhead">
                PathIQ pre-scores immunohistochemistry slides with calibrated uncertainty, surfaces what the model looked at, and routes ambiguous cases to your review queue — so one pathologist can do the work of two without giving up sign-out authority.
              </p>

              <div className="landing-cta-row">
                {user ? (
                  <button className="btn btn-primary" type="button" onClick={goDashboard}>
                    Launch dashboard
                  </button>
                ) : (
                  <button className="btn btn-primary" type="button" onClick={scrollTo('access')}>
                    Get started — free
                  </button>
                )}
                <button className="btn btn-secondary" type="button" onClick={onDemoCase}>
                  View a demo case
                </button>
                <span className="landing-cta-meta">No credit card · sign-up takes 30 seconds</span>
              </div>
            </div>

            <div className="card card-glow" style={{ position: 'relative', overflow: 'hidden', minHeight: 280 }}>
              <svg viewBox="0 0 400 320" width="100%" height="auto" style={{ display: 'block', opacity: 0.95 }} aria-hidden>
                <defs>
                  <radialGradient id="tissueGlow" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="rgba(212,107,59,0.45)" />
                    <stop offset="55%" stopColor="rgba(28,26,24,0)" />
                  </radialGradient>
                  <linearGradient id="heatmap" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#d46b3b" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#5a2c18" stopOpacity="0.35" />
                  </linearGradient>
                </defs>
                <rect width="400" height="320" fill="url(#tissueGlow)" />
                <g opacity="0.35" stroke="rgba(232,220,200,0.25)" strokeWidth="0.5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <line key={`v${i}`} x1={(i + 0.5) * 32} y1="0" x2={(i + 0.5) * 32} y2="320" />
                  ))}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={(i + 0.5) * 32} x2="400" y2={(i + 0.5) * 32} />
                  ))}
                </g>
                <path
                  d="M40 200 C90 120 140 260 200 180 S320 80 360 140"
                  fill="none"
                  stroke="url(#heatmap)"
                  strokeWidth="18"
                  strokeLinecap="round"
                  opacity="0.55"
                />
                <path
                  d="M60 240 C120 160 180 280 240 200 S300 140 340 200"
                  fill="none"
                  stroke="rgba(212,165,116,0.5)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  opacity="0.45"
                />
                <circle cx="120" cy="110" r="36" fill="rgba(212,107,59,0.22)" />
                <circle cx="260" cy="150" r="52" fill="rgba(107,143,113,0.12)" />
                <circle cx="300" cy="90" r="22" fill="rgba(212,165,116,0.2)" />
              </svg>
              <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span className="badge" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-subtle)', color: 'var(--sand)' }}>
                  Whole slide · 40&times;
                </span>
                <span className="badge badge-conf-mod" style={{ textTransform: 'none', letterSpacing: '0' }}>
                  Uncertainty overlay
                </span>
              </div>
            </div>
          </div>

          {/* Stat strip */}
          <div className="landing-stat-strip">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="landing-stat-value">{s.value}</div>
                <div className="landing-stat-label">{s.label}</div>
                <div className="landing-stat-source">{s.source}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* —— Problem framing —— */}
      <section className="landing-section landing-section-divider">
        <span className="landing-eyebrow">
          <span className="landing-eyebrow-dot" />
          Why now
        </span>
        <h2 className="landing-section-title">The pathology bottleneck is structural — and getting worse.</h2>
        <p className="landing-section-lead">
          Slide volume is growing, the workforce isn&rsquo;t, and inter-reader agreement on the discrete 0/1+/2+/3+ score
          is famously inconsistent across labs. AI-assisted scoring, triage, and QC is one of the few scalable levers that
          doesn&rsquo;t require linear growth in pathologist FTE.
        </p>
      </section>

      {/* —— How it works —— */}
      <section id="how" className="landing-section landing-section-divider">
        <span className="landing-eyebrow">
          <span className="landing-eyebrow-dot" />
          How it works
        </span>
        <h2 className="landing-section-title">Three steps, one cockpit, full audit trail.</h2>
        <p className="landing-section-lead">
          Drop slides, get scored cases sorted by uncertainty, then sign out. PathIQ stays out of the way until it has
          something useful to say.
        </p>
        <div className="landing-step-grid">
          {steps.map((s) => (
            <article key={s.n} className="landing-step-card">
              <div className="landing-step-number">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* —— Features grid —— */}
      <section id="features" className="landing-section landing-section-divider">
        <span className="landing-eyebrow">
          <span className="landing-eyebrow-dot" />
          What&rsquo;s in the box
        </span>
        <h2 className="landing-section-title">Six surfaces that ship today.</h2>
        <p className="landing-section-lead">
          Built for real-world IHC workflows — from intake to sign-out — not a one-off score endpoint.
        </p>
        <div className="grid-3" style={{ marginTop: '2rem' }}>
          {features.map((f) => (
            <article key={f.title} className="feature-card">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>

        {/* Product preview tile */}
        <div className="landing-product-preview">
          <div className="landing-preview-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="micro-label">Live result</div>
              <span className="badge badge-conf-mod">Needs review</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--cream)', letterSpacing: '-0.02em' }}>2+</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>moderate</span>
            </div>
            <div className="landing-preview-row">
              <span>Confidence</span><span>74%</span>
            </div>
            <div className="landing-preview-row">
              <span>Uncertainty (combined)</span><span>0.31</span>
            </div>
            <div className="landing-preview-row">
              <span>Stain burden (0–100)</span><span>62</span>
            </div>
            <div className="landing-preview-row">
              <span>Tissue context</span><span>tumor · 91%</span>
            </div>
          </div>
          <div className="landing-preview-card">
            <div className="micro-label">Class distribution (MC mean)</div>
            {[
              { label: '0', pct: 6 },
              { label: '1+', pct: 18 },
              { label: '2+', pct: 58 },
              { label: '3+', pct: 18 }
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 24, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>{row.label}</span>
                <div className="progress" style={{ flex: 1 }}>
                  <span style={{ width: `${row.pct}%` }} />
                </div>
                <span style={{ width: 36, textAlign: 'right', color: 'var(--cream)', fontSize: '0.78rem', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{row.pct}%</span>
              </div>
            ))}
            <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Why this tier: the 2+ head dominates at 58% with non-trivial 1+/3+ mass — flagged for human review.
            </div>
          </div>
        </div>
      </section>

      {/* —— Audiences —— */}
      <section id="audiences" className="landing-section landing-section-divider">
        <span className="landing-eyebrow">
          <span className="landing-eyebrow-dot" />
          Built for your role
        </span>
        <h2 className="landing-section-title">One product, three jobs to be done.</h2>
        <div className="landing-audience-grid">
          {audiences.map((a) => (
            <article key={a.role} className="landing-audience-card">
              <div className="landing-audience-role">
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }} />
                {a.role}
              </div>
              <h3>{a.title}</h3>
              <ul className="landing-audience-list">
                {a.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* —— Compliance / governance —— */}
      <section className="landing-section landing-section-divider">
        <span className="landing-eyebrow">
          <span className="landing-eyebrow-dot" />
          Governance
        </span>
        <h2 className="landing-section-title">Built like clinical software, not a demo.</h2>
        <p className="landing-section-lead">
          Auth, RBAC, and an audit trail are first-class — not a bolt-on you write yourself before a pilot.
        </p>
        <div className="landing-trust-grid">
          {trust.map((t) => (
            <div key={t.title} className="landing-trust-pill">
              <div className="landing-trust-pill-title">{t.title}</div>
              <div className="landing-trust-pill-body">{t.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* —— CTA panel + access cards —— */}
      <section id="access" className="landing-section landing-section-divider" style={{ scrollMarginTop: 80 }}>
        {!user ? (
          <>
            <div className="landing-cta-panel">
              <span className="landing-eyebrow">
                <span className="landing-eyebrow-dot" />
                Get started
              </span>
              <h2 style={{ marginTop: 12 }}>Try PathIQ in your browser, right now.</h2>
              <p>
                Create an account in 30 seconds — your activity, cases, and corrections sync to your dashboard. Or jump
                into the offline sandbox first if you just want to poke around.
              </p>
              <div className="landing-cta-row" style={{ justifyContent: 'center' }}>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    setAuthTab('signup')
                    document.getElementById('access-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  Create your account
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    setAuthTab('signin')
                    document.getElementById('access-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  Sign in
                </button>
              </div>
            </div>

            <div id="access-form" className="grid-2" style={{ marginTop: '2rem', alignItems: 'start' }}>
              <section className="card" style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <div className="micro-label">Secure access</div>
                  <h3 style={{ fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cream)' }}>
                    {authTab === 'signin' ? 'Sign in (API + RBAC)' : 'Create your account'}
                  </h3>
                </div>
                {authConfig.signup_enabled ? (
                  <div role="tablist" aria-label="Account access" style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 999, border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.25)', alignSelf: 'start' }}>
                    {[
                      { id: 'signin', label: 'Sign in' },
                      { id: 'signup', label: 'Create account' }
                    ].map((tab) => {
                      const active = authTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => {
                            setAuthTab(tab.id)
                            setServerError('')
                          }}
                          style={{
                            appearance: 'none',
                            border: 'none',
                            padding: '0.35rem 0.85rem',
                            borderRadius: 999,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: active ? 'var(--amber)' : 'transparent',
                            color: active ? '#1c1a18' : 'var(--text-muted)'
                          }}
                        >
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                ) : null}

                {authTab === 'signin' ? (
                  <form onSubmit={onServerLogin} style={{ display: 'grid', gap: '0.75rem' }}>
                    <p className="page-subtitle" style={{ fontSize: '0.86rem', margin: 0 }}>
                      Demo accounts: <code>pathologist</code>/<code>demo123</code>, <code>admin</code>/<code>admin123</code>, <code>tech</code>/<code>demo123</code>.
                    </p>
                    <div>
                      <label className="label">Username</label>
                      <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
                    </div>
                    <div>
                      <label className="label">Password</label>
                      <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                    </div>
                    {serverError ? <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0 }}>{serverError}</p> : null}
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      {loading ? 'Signing in…' : 'Sign in & sync cases'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={onSignup} style={{ display: 'grid', gap: '0.75rem' }}>
                    <p className="page-subtitle" style={{ fontSize: '0.86rem', margin: 0 }}>
                      Your activity (logins, cases created, edits) is tracked privately to your account so you can see your own throughput on the dashboard.
                    </p>
                    <div className="grid-2">
                      <div>
                        <label className="label">Username</label>
                        <input
                          className="input"
                          value={signupForm.username}
                          onChange={(e) => updateSignupField('username', e.target.value)}
                          autoComplete="username"
                          placeholder="lowercase letters, digits, . _ -"
                          minLength={3}
                          maxLength={32}
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Display name</label>
                        <input
                          className="input"
                          value={signupForm.displayName}
                          onChange={(e) => updateSignupField('displayName', e.target.value)}
                          placeholder="Dr. Patel"
                        />
                      </div>
                    </div>
                    <div className="grid-2">
                      <div>
                        <label className="label">Password</label>
                        <input
                          className="input"
                          type="password"
                          value={signupForm.password}
                          onChange={(e) => updateSignupField('password', e.target.value)}
                          autoComplete="new-password"
                          minLength={authConfig.min_password_length}
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Role</label>
                        <select
                          className="select"
                          value={signupForm.role}
                          onChange={(e) => updateSignupField('role', e.target.value)}
                        >
                          {(authConfig.signup_roles || DEFAULT_SIGNUP_ROLES).map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="page-subtitle" style={{ fontSize: '0.78rem', margin: 0, color: 'var(--text-muted)' }}>
                      Admin and Lab Director roles are invite-only. Contact your administrator if you need elevated access.
                    </p>
                    {serverError ? <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0 }}>{serverError}</p> : null}
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      {loading ? 'Creating account…' : 'Create account & sign in'}
                    </button>
                  </form>
                )}
              </section>

              <section className="card" style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <div className="micro-label">Sandbox</div>
                  <h3 style={{ fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cream)' }}>Continue offline (demo)</h3>
                </div>
                <p className="page-subtitle" style={{ fontSize: '0.86rem', margin: 0 }}>
                  No API required. Cases stay in this browser until you sign in with the server.
                </p>
                <div className="grid-2">
                  <div>
                    <label className="label">Display name</label>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Patel" />
                  </div>
                  <div>
                    <label className="label">Role (UI only)</label>
                    <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
                      <option>Admin</option>
                      <option>Lab Director</option>
                      <option>Pathologist</option>
                      <option>Technician</option>
                      <option>Researcher</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-secondary" type="button" onClick={onOfflineContinue}>
                  Enter cockpit (offline)
                </button>
              </section>
            </div>
          </>
        ) : (
          <div className="landing-cta-panel">
            <h2>Welcome back, {user.name || user.username}.</h2>
            <p>You&rsquo;re signed in as {user.role}. Pick up where you left off.</p>
            <div className="landing-cta-row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" type="button" onClick={goDashboard}>
                Open dashboard
              </button>
            </div>
          </div>
        )}
      </section>

      {/* —— FAQ —— */}
      <section id="faq" className="landing-section landing-section-divider">
        <span className="landing-eyebrow">
          <span className="landing-eyebrow-dot" />
          Frequently asked
        </span>
        <h2 className="landing-section-title">Answers before you ask.</h2>
        <div className="landing-faq">
          {faq.map((item) => (
            <details key={item.q} className="landing-faq-item">
              <summary>{item.q}</summary>
              <div className="landing-faq-body">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* —— Footer —— */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            <div className="landing-brand" style={{ marginBottom: 10 }}>
              <span className="landing-brand-mark">P</span>
              PathIQ
            </div>
            <p className="landing-footer-disclaimer">
              PathIQ is intended as a research and clinical decision-support tool. It is not FDA-cleared and is not
              intended to independently diagnose disease or replace review by a qualified pathologist. Engage qualified
              regulatory counsel before clinical distribution.
            </p>
          </div>
          <div className="landing-footer-meta">
            <div>&copy; {new Date().getFullYear()} PathIQ</div>
            <div style={{ marginTop: 4 }}>Built with FastAPI · React · Postgres</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
