import { useState, useEffect } from 'react'

/**
 * Returns the current window inner width, updating on every resize event.
 * Used to switch layouts between wide (side panel) and narrow (full-screen overlay) modes.
 */
export function useWindowWidth(): number {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return width
}
