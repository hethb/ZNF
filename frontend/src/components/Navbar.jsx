import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/analyze', label: 'Analyze' },
  { to: '/batch', label: 'Batch' },
  { to: '/about', label: 'About' }
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/75 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="bg-gradient-to-r from-brand via-violet to-cyan bg-clip-text text-lg font-bold tracking-tight text-transparent">
          PathIQ
        </Link>
        <div className="flex items-center gap-1 rounded-none border border-slate-200/70 bg-white/80 p-1 shadow-soft">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-none px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-brand to-violet text-navy shadow-glow'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-navy'
                }`
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
