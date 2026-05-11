import { useEffect, useRef } from 'react'
import { MOTION_ATTR } from '../hooks/useMouseParallax'

/**
 * 3D-tilt wrapper. Becomes the card itself (no inner wrapper required) so
 * existing classes like `card card-glow` compose cleanly:
 *
 *   <TiltCard className="card card-glow"> ... </TiltCard>
 *
 * Behavior:
 * - Tracks the cursor only while it's *inside* the element (cheap mousemove).
 * - Sets four CSS variables on the element via rAF: --tilt-x / --tilt-y
 *   (-1..1 from element center) and --tilt-px / --tilt-py (0..100% local
 *   coords for the radial glow).
 * - Smoothly returns to rest on mouseleave.
 * - No-op when prefers-reduced-motion or coarse-pointer is detected
 *   (MotionProvider sets data-pathiq-motion="off" on <html>).
 *
 * Props
 * - maxTilt:   degrees of rotation at the edge (default 6, keep 4–8)
 * - glow:      whether to render the radial cursor glow (default true)
 * - as:        element type (default 'div'); useful for <article>, <section>
 */
export default function TiltCard({
  children,
  maxTilt = 6,
  glow = true,
  className = '',
  style = {},
  as: Tag = 'div',
  ...rest
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (document.documentElement.getAttribute(MOTION_ATTR) === 'off') return undefined

    let raf = null
    let pendingX = 0
    let pendingY = 0
    let pendingPX = 50
    let pendingPY = 50

    const flush = () => {
      raf = null
      el.style.setProperty('--tilt-x', pendingX.toFixed(3))
      el.style.setProperty('--tilt-y', pendingY.toFixed(3))
      el.style.setProperty('--tilt-px', `${pendingPX.toFixed(2)}%`)
      el.style.setProperty('--tilt-py', `${pendingPY.toFixed(2)}%`)
    }

    const onMove = (event) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      pendingX = (event.clientX - cx) / (rect.width / 2)
      pendingY = (event.clientY - cy) / (rect.height / 2)
      pendingPX = ((event.clientX - rect.left) / rect.width) * 100
      pendingPY = ((event.clientY - rect.top) / rect.height) * 100
      if (raf === null) raf = requestAnimationFrame(flush)
    }

    const onLeave = () => {
      pendingX = 0
      pendingY = 0
      pendingPX = 50
      pendingPY = 50
      if (raf === null) raf = requestAnimationFrame(flush)
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <Tag
      ref={ref}
      className={`tilt-card ${className}`}
      data-tilt-glow={glow ? 'on' : 'off'}
      style={{
        '--tilt-max': `${maxTilt}deg`,
        '--tilt-x': 0,
        '--tilt-y': 0,
        '--tilt-px': '50%',
        '--tilt-py': '50%',
        ...style
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
