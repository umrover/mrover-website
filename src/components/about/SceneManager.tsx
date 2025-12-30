import { useStore } from '../../lib/store'
import { useEffect } from 'react'
import Lenis from 'lenis'
import { WebGL } from './WebGL'

export function SceneManager() {
  const setLenis = useStore((state) => state.setLenis)
  const setHeaderHeight = useStore((state) => state.setHeaderHeight)

  useEffect(() => {
    const header = document.querySelector('header')
    if (header) {
      const height = header.offsetHeight
      setHeaderHeight(height)
      document.documentElement.style.setProperty('--header-height', `${height}px`)
    }

    window.scrollTo(0, 0)
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const lenis = new Lenis({
      duration: isMobile ? 0.8 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: true,
      touchMultiplier: 2,
    })

    setLenis(lenis)

    const update = (time: number) => lenis.raf(time * 1000)
    requestAnimationFrame(function raf(time) {
      update(time)
      requestAnimationFrame(raf)
    })

    return () => {
      lenis.destroy()
      setLenis(null)
    }
  }, [setLenis, setHeaderHeight])

  return <WebGL />
}
