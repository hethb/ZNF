import { useMouseParallax } from '../hooks/useMouseParallax'

/**
 * Mount once near the root. Renders nothing — its only job is to install the
 * global cursor tracker so any element in the tree can read --cursor-x/y/nx/ny.
 */
export default function MotionProvider() {
  useMouseParallax()
  return null
}
