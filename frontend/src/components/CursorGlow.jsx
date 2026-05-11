/**
 * Soft amber spotlight that follows the cursor. Reads global CSS variables
 * set by MotionProvider — does not register its own listener, so multiple
 * mounts are safe and have zero React-runtime cost.
 *
 * Hidden automatically when MotionProvider has set data-pathiq-motion="off"
 * (touch devices, prefers-reduced-motion).
 */
export default function CursorGlow() {
  return (
    <div
      aria-hidden="true"
      className="cursor-glow"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        background:
          'radial-gradient(580px circle at var(--cursor-x, -1000px) var(--cursor-y, -1000px),' +
          ' rgba(212, 107, 59, 0.085),' +
          ' rgba(196, 135, 90, 0.04) 38%,' +
          ' transparent 62%)',
        mixBlendMode: 'screen',
        transition: 'opacity 250ms ease'
      }}
    />
  )
}
