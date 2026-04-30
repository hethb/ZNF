import { useEffect, useState } from 'react'

/**
 * Global cursor glow — earthy amber radial gradient that follows the mouse,
 * casting a warm light across the dark soil background.
 */
export default function CursorGlow() {
  const [pos, setPos] = useState({ x: -1000, y: -1000 })

  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY })
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
        background: `radial-gradient(640px circle at ${pos.x}px ${pos.y}px,
          rgba(194, 98, 26, 0.045),
          rgba(138, 153, 98, 0.03) 42%,
          transparent 58%)`
      }}
    />
  )
}
