import { useStore } from '../lib/store'
import { useEffect, useRef } from 'react'

interface ScrollData {
  scroll: number
  limit: number
  velocity: number
  direction: number
  progress: number
}

export function useScroll(callback: (data: ScrollData) => void) {
  const scrollData = useStore((state) => state.scrollData)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (scrollData) {
      callbackRef.current(scrollData)
    }
  }, [scrollData])
}
