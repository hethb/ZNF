import { useEffect, useState } from 'react'

export default function MouseGlow() {
  const [pos, setPos] = useState({ x: -200, y: -200 })

  useEffect(() => {
    const onMove = (event) => {
      setPos({ x: event.clientX, y: event.clientY })
    }

    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ contain: 'paint' }}
    >
      <div
        className="absolute h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/30 blur-3xl transition-transform duration-200"
        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      />
      <div
        className="absolute h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/20 blur-3xl transition-transform duration-300"
        style={{ left: `${pos.x + 60}px`, top: `${pos.y + 40}px` }}
      />
    </div>
  )
}
