import { useStore } from '../../lib/store'
import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { WebGL } from './WebGL'
import { BRANCHES } from './SceneConfig'

const TOTAL_SCROLL_SECTIONS = BRANCHES.reduce((acc, b) => acc + b.sections.length, 0)

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
    const isMobile = window.innerWidth < 768 || 'ontouchstart' in window
    const lenis = new Lenis({
      duration: isMobile ? 0.8 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !isMobile,
      syncTouch: false,
      touchMultiplier: 1.5,
    })

    setLenis(lenis)

    lenis.on('scroll', ScrollTrigger.update)

    const update = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    const main = document.querySelector('main')
    const vh = window.innerHeight

    if (isMobile) {
      let currentSection = 0
      let isScrolling = false
      let touchStartY = 0
      let touchStartTime = 0
      const SWIPE_THRESHOLD = 50
      const VELOCITY_THRESHOLD = 0.3

      const scrollToSection = (index: number) => {
        const targetSection = Math.max(0, Math.min(index, TOTAL_SCROLL_SECTIONS - 1))
        if (targetSection === currentSection && isScrolling) return

        currentSection = targetSection
        isScrolling = true
        lenis.scrollTo(targetSection * vh, {
          duration: 0.8,
          onComplete: () => { isScrolling = false }
        })
      }

      const handleTouchStart = (e: TouchEvent) => {
        if (isScrolling) return
        touchStartY = e.touches[0].clientY
        touchStartTime = Date.now()
      }

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault()
      }

      const handleTouchEnd = (e: TouchEvent) => {
        if (isScrolling) return
        const touchEndY = e.changedTouches[0].clientY
        const deltaY = touchStartY - touchEndY
        const deltaTime = Date.now() - touchStartTime
        const velocity = Math.abs(deltaY) / deltaTime

        if (Math.abs(deltaY) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
          if (deltaY > 0) {
            scrollToSection(currentSection + 1)
          } else {
            scrollToSection(currentSection - 1)
          }
        }
      }

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault()
        if (isScrolling) return

        if (e.deltaY > 30) {
          scrollToSection(currentSection + 1)
        } else if (e.deltaY < -30) {
          scrollToSection(currentSection - 1)
        }
      }

      document.addEventListener('touchstart', handleTouchStart, { passive: true })
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd, { passive: true })
      document.addEventListener('wheel', handleWheel, { passive: false })

      const cleanup = () => {
        document.removeEventListener('touchstart', handleTouchStart)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
        document.removeEventListener('wheel', handleWheel)
      }

      ;(lenis as any)._mobileCleanup = cleanup
    } else {
      ScrollTrigger.create({
        trigger: main,
        start: 'top top',
        end: 'bottom bottom',
        snap: {
          snapTo: 1 / (TOTAL_SCROLL_SECTIONS - 1),
          duration: { min: 0.2, max: 0.8 },
          delay: 0.1,
          ease: 'power2.inOut'
        }
      })
    }

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
      if ((lenis as any)._mobileCleanup) {
        (lenis as any)._mobileCleanup()
      }
      lenis.destroy()
      setLenis(null)
      gsap.ticker.remove(update)
      window.removeEventListener('keydown', handleKeyDown)
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [setLenis, setHeaderHeight])

  return <WebGL />
}
