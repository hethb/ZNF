import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext'
import { workflowAuthConfig } from '../services/api'

const DEFAULT_SIGNUP_ROLES = ['Researcher', 'Pathologist', 'Technician']

const features = [
  {
    title: 'AI pre-scoring',
    body: 'Tissue-aware IHC intensity estimates with calibrated confidence for triage.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 19V5M8 19V9M12 19v-6M16 19V7M20 19v-8" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: 'Uncertainty triage',
    body: 'Surface borderline patches, artifacts, and low-confidence regions before sign-out.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3a7 7 0 100 14 7 7 0 000-14zM12 8v4M12 16h.01" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: 'Pathologist review',
    body: 'Structured overrides, rationale capture, and final scores that stay clinician-owned.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 12l2 2 4-4M7 3h5l2 2h5v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: 'Audit-ready reports',
    body: 'Immutable trails, exports, and PDF summaries aligned to lab QA expectations.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M7 3h7l3 3v15H7V3zM9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: 'QA analytics',
    body: 'Throughput, agreement, and reviewer variability in one operations-grade view.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 20V10M10 20V4M16 20v-6M22 20V14" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: 'Validation mode',
    body: 'Confusion matrices and concordance metrics for study-grade model governance.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 4h16v16H4zM8 8h8M8 12h5M8 16h7" strokeLinejoin="round" />
      </svg>
    )
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

  const scrollToAccess = () => {
    document.getElementById('workflow-access')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
    <div className="hero">
      <div className="hero-grid-bg" />
      <div className="hero-blobs" aria-hidden>
        <div className="hero-blob" style={{ width: 420, height: 420, left: '-8%', top: '10%', background: 'rgba(212, 107, 59, 0.35)' }} />
        <div className="hero-blob" style={{ width: 360, height: 360, right: '-5%', top: '22%', background: 'rgba(196, 135, 90, 0.28)' }} />
        <div className="hero-blob" style={{ width: 300, height: 300, left: '35%', bottom: '-5%', background: 'rgba(139, 111, 168, 0.18)' }} />
      </div>

      <div className="hero-inner">
        <div className="landing-hero-grid">
          <div>
            <div className="kicker">PathIQ · Clinical AI workflow</div>
            <h1
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.85rem)',
                marginTop: 14,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.12,
                maxWidth: 720,
                color: 'var(--cream)'
              }}
            >
              AI-assisted IHC scoring for modern pathology workflows.
            </h1>
            <p style={{ maxWidth: 640, fontSize: '1.02rem', lineHeight: 1.65, color: 'var(--text-muted)', marginTop: '1rem' }}>
              PathIQ helps labs pre-score slides, flag uncertain regions, reduce variability, and generate audit-ready reports while keeping pathologists in control.
            </p>

            <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.35rem', flexWrap: 'wrap' }}>
              {user ? (
                <button className="btn btn-primary" type="button" onClick={goDashboard}>
                  Launch dashboard
                </button>
              ) : (
                <button className="btn btn-primary" type="button" onClick={scrollToAccess}>
                  Launch dashboard
                </button>
              )}
              <button className="btn btn-secondary" type="button" onClick={onDemoCase}>
                View demo case
              </button>
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
                Whole slide · 40×
              </span>
              <span className="badge badge-conf-mod" style={{ textTransform: 'none', letterSpacing: '0' }}>
                Uncertainty overlay
              </span>
            </div>
          </div>
        </div>

        <div className="grid-3" style={{ marginTop: '2.5rem' }}>
          {features.map((f) => (
            <article key={f.title} className="feature-card">
              <div className="feature-icon" style={{ color: 'var(--amber)' }}>
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>

        {!user ? (
          <div id="workflow-access" className="grid-2" style={{ marginTop: '2.25rem', alignItems: 'start', scrollMarginTop: 24 }}>
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
                    Demo accounts: <code>pathologist</code>/<code>demo123</code>, <code>admin</code>/<code>admin123</code>, <code>tech</code>/<code>demo123</code>, etc.
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
        ) : null}

        <p className="footer-note" style={{ marginTop: '2rem', maxWidth: 720 }}>
          PathIQ is intended as a research and workflow-support tool. It is not intended to independently diagnose disease or replace review by a qualified pathologist.
        </p>
      </div>

    </div>
  )
}
