import { useEffect, useRef } from 'react'
import OpenSeadragon from 'openseadragon'

/**
 * Deep zoom using a single image (legacy pyramid mode).
 * For production WSI, replace tileSources with DZI / IIIF.
 */
export default function SlideDeepZoom({ imageUrl, height = 560 }) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !imageUrl) return undefined

    el.innerHTML = ''
    const viewer = OpenSeadragon({
      element: el,
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1.0/build/openseadragon/images/',
      tileSources: {
        type: 'image',
        url: imageUrl
      },
      showNavigator: true,
      navigatorPosition: 'BOTTOM_RIGHT',
      minZoomLevel: 0.2,
      maxZoomLevel: 10,
      defaultZoomLevel: 0.9,
      animationTime: 0.2,
      constrainDuringPan: true
    })
    viewerRef.current = viewer
    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [imageUrl])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height,
        background: '#0f0e0d',
        borderRadius: 10,
        overflow: 'hidden'
      }}
    />
  )
}
