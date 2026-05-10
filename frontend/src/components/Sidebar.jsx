import { NavLink } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/upload', label: 'Upload' },
  { to: '/review-queue', label: 'Review queue' },
  { to: '/reports', label: 'Reports', matchPath: '/reports', matchQuery: (q) => q.get('view') !== 'full' },
  { to: '/reports?view=full', label: 'Full lab report (MLA)', matchPath: '/reports', matchQuery: (q) => q.get('view') === 'full' },
  { to: '/analytics', label: 'QA analytics' },
  { to: '/validation', label: 'Validation' },
  { to: '/settings', label: 'Settings' }
]

function pathAllowed(navTo, prefixes) {
  if (!prefixes?.length) return true
  const raw = navTo.split('?')[0].replace(/\/$/, '') || '/'
  const p = raw
  return prefixes.some((pref) => {
    const base = pref.replace(/\/$/, '') || '/'
    return p === base || p.startsWith(`${base}/`)
  })
}

export default function Sidebar() {
  const { user, logout, allowedPrefixes, authMode } = useAppState()

  const visible = navItems.filter((item) => authMode !== 'server' || pathAllowed(item.to, allowedPrefixes))

  return (
    <aside className="sidebar">
      <div style={{ padding: '0.5rem 0.4rem 1rem' }}>
        <div className="kicker">PathIQ</div>
        <div style={{ fontWeight: 800, marginTop: 6, fontSize: '1.05rem', color: 'var(--cream)', letterSpacing: '-0.02em' }}>
          IHC workflow cockpit
        </div>
        <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          <span style={{ color: 'var(--sand)' }}>{user?.name || 'Guest'}</span>
          <span style={{ color: 'var(--text-dim)' }}> · </span>
          {user?.role || 'No role'}
          <span style={{ color: 'var(--text-dim)' }}> · </span>
          {authMode === 'server' ? 'API sync' : 'Offline'}
        </div>
      </div>

      <nav aria-label="Primary" style={{ display: 'grid', gap: '0.32rem', flex: 1 }}>
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link-item ${isActive ? 'nav-link-item-active' : ''}`}
            {...(item.matchPath
              ? {
                  isActive: (_match, loc) => {
                    if (loc.pathname !== item.matchPath) return false
                    return item.matchQuery(new URLSearchParams(loc.search))
                  }
                }
              : {})}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button className="btn btn-outline" type="button" style={{ marginTop: '1rem', width: '100%' }} onClick={logout}>
        Log out
      </button>
      <p className="footer-note" style={{ padding: '0.75rem 0.15rem 0' }}>
        Server sign-in enables JWT auth, RBAC, case sync, PDF reports, and compliance audit export.
      </p>
    </aside>
  )
}
