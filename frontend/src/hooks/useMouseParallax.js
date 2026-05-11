import { useEffect } from 'react'

/**
 * Global cursor tracker. Writes four CSS variables on <html> via
 * `requestAnimationFrame` so styles can read them without triggering a single
 * React re-render:
 *
 *   --cursor-x   :  pixels   — last clientX
 *   --cursor-y   :  pixels   — last clientY
 *   --cursor-nx  :  -1..1    — normalized horizontal position
 *   --cursor-ny  :  -1..1    — normalized vertical position
 *
 * Honors `prefers-reduced-motion` and touch / coarse-pointer devices: when
 * either is true, the listener is removed, normalized vars are zeroed, and
 * `<html data-pathiq-motion="off">` is set so CSS can disable transforms.
 */
export const MOTION_ATTR = 'data-pathiq-motion'

export function useMouseParallax() {
  useEffect(() => {
    const root = document.documentElement
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)')

    let rafId = null
    let pendingX = 0
    let pendingY = 0
    let pendingNX = 0
    let pendingNY = 0

    const flush = () => {
      rafId = null
      root.style.setProperty('--cursor-x', `${pendingX}px`)
      root.style.setProperty('--cursor-y', `${pendingY}px`)
      root.style.setProperty('--cursor-nx', pendingNX.toFixed(3))
      root.style.setProperty('--cursor-ny', pendingNY.toFixed(3))
    }

    const onMove = (event) => {
      pendingX = event.clientX
      pendingY = event.clientY
      const w = window.innerWidth || 1
      const h = window.innerHeight || 1
      pendingNX = (event.clientX / w) * 2 - 1
      pendingNY = (event.clientY / h) * 2 - 1
      if (rafId === null) rafId = requestAnimationFrame(flush)
    }

    let listening = false
    const attach = () => {
      if (listening) return
      window.addEventListener('mousemove', onMove, { passive: true })
      listening = true
    }
    const detach = () => {
      if (!listening) return
      window.removeEventListener('mousemove', onMove)
      listening = false
    }

    const updateMode = () => {
      const motionOff = reducedMotion.matches || coarsePointer.matches
      if (motionOff) {
        root.setAttribute(MOTION_ATTR, 'off')
        root.style.setProperty('--cursor-nx', '0')
        root.style.setProperty('--cursor-ny', '0')
        detach()
      } else {
        root.setAttribute(MOTION_ATTR, 'on')
        attach()
      }
    }

    updateMode()

    // Modern + Safari fallbacks for media-query change events.
    const reducedHandler = () => updateMode()
    const coarseHandler = () => updateMode()
    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener('change', reducedHandler)
      coarsePointer.addEventListener('change', coarseHandler)
    } else {
      reducedMotion.addListener(reducedHandler)
      coarsePointer.addListener(coarseHandler)
    }

    return () => {
      detach()
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (reducedMotion.removeEventListener) {
        reducedMotion.removeEventListener('change', reducedHandler)
        coarsePointer.removeEventListener('change', coarseHandler)
      } else {
        reducedMotion.removeListener(reducedHandler)
        coarsePointer.removeListener(coarseHandler)
      }
    }
  }, [])
}
