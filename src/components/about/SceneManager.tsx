import { useStore } from '../../lib/store'
import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { WebGL } from './WebGL'
import { TOTAL_SECTIONS } from './SceneConfig'

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
      syncTouch: true,
    })

    setLenis(lenis)

    // Sync ScrollTrigger with Lenis
    lenis.on('scroll', ScrollTrigger.update)
    
    const update = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    // Snap to sections
    const main = document.querySelector('main')
    ScrollTrigger.create({
      trigger: main,
      start: 'top top',
      end: 'bottom bottom',
      snap: {
        snapTo: 1 / (TOTAL_SECTIONS - 1),
        duration: { min: 0.2, max: 0.8 },
        delay: 0.1,
        ease: 'power2.inOut'
      }
    })

    // Keyboard Navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      const vh = window.innerHeight
      const currentScroll = window.scrollY
      // Round to nearest section to avoid drift
      const currentSection = Math.round(currentScroll / vh)
      
      switch (e.key) {
        case 'ArrowDown':
        case ' ':
          e.preventDefault()
          lenis.scrollTo((currentSection + 1) * vh)
          break
        case 'ArrowUp':
          e.preventDefault()
          lenis.scrollTo((currentSection - 1) * vh)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      lenis.destroy()
      setLenis(null)
      gsap.ticker.remove(update)
      window.removeEventListener('keydown', handleKeyDown)
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [setLenis, setHeaderHeight])

  return <WebGL />
}
