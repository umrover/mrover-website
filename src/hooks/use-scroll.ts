import { useStore } from '../lib/store'
import { useEffect } from 'react'

interface ScrollData {
  scroll: number
  limit: number
  velocity: number
  direction: number
  progress: number
}

export function useScroll(callback: (data: ScrollData) => void) {
  const lenis = useStore((state) => state.lenis)

  useEffect(() => {
    if (!lenis) return
    lenis.on('scroll', callback)

    return () => {
      lenis.off('scroll', callback)
    }
  }, [lenis, callback])
}
