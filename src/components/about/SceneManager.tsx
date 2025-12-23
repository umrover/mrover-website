import { useStore } from '../../lib/store'
import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { WebGL } from './WebGL'

export function SceneManager() {
  const setLenis = useStore((state) => state.setLenis)
  const setHeaderHeight = useStore((state) => state.setHeaderHeight)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    ScrollTrigger.defaults({ markers: false })

    const header = document.querySelector('header')
    if (header) {
      const height = header.offsetHeight
      setHeaderHeight(height)
      document.documentElement.style.setProperty('--header-height', `${height}px`)
    }

    window.scrollTo(0, 0)
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    setLenis(lenis)

    lenis.on('scroll', ScrollTrigger.update)

    const update = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.destroy()
      setLenis(null)
      gsap.ticker.remove(update)
    }
  }, [setLenis, setHeaderHeight])

  return <WebGL />
}
