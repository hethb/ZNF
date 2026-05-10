import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/demo', label: 'Demo', end: false },
  { to: '/analyze', label: 'Analyze', end: false },
  { to: '/case', label: 'Case', end: false },
  { to: '/batch', label: 'Batch', end: false },
  { to: '/benchmark', label: 'Bench', end: false },
  { to: '/pilot', label: 'Pilot', end: false },
  { to: '/about', label: 'About', end: false }
]

export default function Navbar() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex justify-center px-3 pt-3 md:px-5 md:pt-5" role="banner">
      <nav
        className="flex w-full max-w-6xl items-end justify-between gap-4 border-b pb-3 md:gap-8"
        style={{
          borderColor: 'rgba(212,178,140,0.14)',
          background: 'linear-gradient(180deg, rgba(12,9,6,0.92) 0%, rgba(12,9,6,0.75) 70%, transparent 100%)'
        }}
        aria-label="Main navigation"
      >
        <Link to="/" className="select-none shrink-0 py-1" aria-label="PathIQ home">
          <img src="/pathiq-logo-full.png" alt="PathIQ" className="h-9 w-auto object-contain md:h-10" />
        </Link>

        <div className="flex min-w-0 flex-wrap items-end justify-end gap-x-1 gap-y-1 sm:gap-x-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative whitespace-nowrap px-2.5 py-2 font-['Syne',sans-serif] text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition-colors md:px-3 md:text-xs ${
                  isActive ? 'text-[#f4ece0]' : 'text-[#7a6b59] hover:text-[#c4ad92]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all md:left-3 md:right-3"
                    style={{
                      background: isActive
                        ? 'linear-gradient(90deg, transparent, #c2621a, #d9834a, #c2621a, transparent)'
                        : 'transparent',
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? 'scaleX(1)' : 'scaleX(0.3)'
                    }}
                  />
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  )
}
