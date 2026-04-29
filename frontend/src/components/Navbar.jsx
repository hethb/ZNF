import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/demo', label: 'Demo', end: false },
  { to: '/analyze', label: 'Analyze', end: false },
  { to: '/batch', label: 'Batch', end: false },
  { to: '/about', label: 'About', end: false }
]

export default function Navbar() {
  return (
    <header
      className="fixed left-0 right-0 top-0 z-40 flex justify-center px-4 pt-4"
      role="banner"
    >
      <nav
        className="flex w-full max-w-5xl items-center justify-between rounded-2xl px-5 py-3"
        style={{
          background: 'rgba(18, 12, 7, 0.78)',
          border: '1px solid rgba(212,178,140,0.10)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(212,178,140,0.06) inset'
        }}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          to="/"
          className="select-none"
          aria-label="PathIQ home"
        >
          <img
            src="/pathiq-logo-full.png"
            alt="PathIQ"
            className="h-10 w-auto object-contain"
          />
        </Link>

        {/* Nav pill container */}
        <div
          className="flex items-center gap-0.5 rounded-xl p-1"
          style={{
            background: 'rgba(212,178,140,0.04)',
            border: '1px solid rgba(212,178,140,0.07)'
          }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  isActive ? '' : 'hover:text-amber-100'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      background: 'linear-gradient(135deg, #c2621a, #8a3d0d)',
                      color: '#f4ece0',
                      boxShadow: '0 0 18px rgba(194,98,26,0.45)'
                    }
                  : { background: 'transparent', color: '#a08060' }
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  )
}
