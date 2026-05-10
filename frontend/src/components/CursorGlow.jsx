import { useEffect } from 'react'

const X = '--pathiq-cursor-x'
const Y = '--pathiq-cursor-y'

/**
 * Global cursor glow — earthy amber radial gradient that follows the mouse.
 * Uses CSS variables so mousemove does not trigger React re-renders (previous
 * useState-per-move made every navigation and interaction feel sluggish).
 */
export default function CursorGlow() {
  useEffect(() => {
    const root = document.documentElement
    const onMove = (e) => {
      root.style.setProperty(X, `${e.clientX}px`)
      root.style.setProperty(Y, `${e.clientY}px`)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        background: `radial-gradient(640px circle at var(${X}, -1000px) var(${Y}, -1000px),
          rgba(194, 98, 26, 0.045),
          rgba(138, 153, 98, 0.03) 42%,
          transparent 58%)`
      }}
    />
  )
}
