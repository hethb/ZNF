/**
 * A single drifting orb. Drives motion entirely through CSS variables
 * (--orb-sx, --orb-sy) consumed by the .parallax-orb class — so adding more
 * orbs costs nothing in JS at runtime.
 *
 * Props
 * - size:    diameter in px (default 320)
 * - color:   any CSS color (default warm orange)
 * - blur:    blur radius in px (default 80)
 * - speed:   max travel in px from -1..1 cursor range (default 18, keep ≤ 35)
 * - invertX/invertY: flip drift direction so orbs counter-balance each other
 * - position: { top, left, right, bottom } — pass-through positioning
 */
export default function ParallaxOrb({
  size = 320,
  color = 'rgba(212, 107, 59, 0.35)',
  blur = 80,
  speed = 18,
  invertX = false,
  invertY = false,
  position = {},
  className = '',
  style = {}
}) {
  const sx = invertX ? -speed : speed
  const sy = invertY ? -speed : speed
  return (
    <div
      aria-hidden="true"
      className={`parallax-orb ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        filter: `blur(${blur}px)`,
        '--orb-sx': `${sx}px`,
        '--orb-sy': `${sy}px`,
        ...position,
        ...style
      }}
    />
  )
}
