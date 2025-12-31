import { useStore } from '../../lib/store'
import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { WebGL } from './WebGL'
import { BRANCHES } from './SceneConfig'

const TOTAL_SECTIONS = BRANCHES.reduce((acc, b) => acc + b.sections.length, 0)

export function SceneManager() {
  const setLenis = useStore((state) => state.setLenis)
  const currentSectionRef = useRef(0)
  const isAnimatingRef = useRef(false)

  useEffect(() => {
    const header = document.querySelector('header')
    if (header) {
      document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`)
    }

    window.scrollTo(0, 0)
    const isMobile = window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window

    const lenis = new Lenis({
      duration: isMobile ? 0.8 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: false,
      syncTouch: true,
      touchMultiplier: isMobile ? 1 : 2,
    })

    setLenis(lenis)

    const update = (time: number) => lenis.raf(time * 1000)
    requestAnimationFrame(function raf(time) {
      update(time)
      requestAnimationFrame(raf)
    })

    const getScrollForSection = (section: number) => {
      return Math.max(0, Math.min(section, TOTAL_SECTIONS - 1)) * window.innerHeight
    }

    const getSectionFromScroll = () => {
      const section = Math.round(window.scrollY / window.innerHeight)
      return Math.max(0, Math.min(section, TOTAL_SECTIONS - 1))
    }

    const animateToSection = (targetSection: number) => {
      if (isAnimatingRef.current) return
      const current = getSectionFromScroll()
      if (targetSection === current) return

      isAnimatingRef.current = true
      currentSectionRef.current = targetSection

      const startScroll = window.scrollY
      const targetScroll = getScrollForSection(targetSection)
      const distance = targetScroll - startScroll
      const duration = 600
      const startTime = performance.now()

      const animate = (now: number) => {
        const elapsed = now - startTime
        const t = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)

        window.scrollTo(0, startScroll + distance * eased)

        if (t < 1) {
          requestAnimationFrame(animate)
        } else {
          isAnimatingRef.current = false
        }
      }

      requestAnimationFrame(animate)
    }

    if (isMobile) {
      let touchStartY = 0
      let touchStartTime = 0
      const swipeThreshold = 50
      const velocityThreshold = 0.5

      const handleTouchStart = (e: TouchEvent) => {
        touchStartY = e.touches[0].clientY
        touchStartTime = Date.now()
      }

      const handleTouchMove = (e: TouchEvent) => {
        if (isAnimatingRef.current && e.cancelable) {
          e.preventDefault()
        }
      }

      const handleTouchEnd = (e: TouchEvent) => {
        if (isAnimatingRef.current) return

        const touchEndY = e.changedTouches[0].clientY
        const deltaY = touchStartY - touchEndY
        const deltaTime = Date.now() - touchStartTime
        const velocity = Math.abs(deltaY) / deltaTime

        const isSwipe = Math.abs(deltaY) > swipeThreshold || velocity > velocityThreshold

        if (isSwipe) {
          const current = getSectionFromScroll()
          const direction = deltaY > 0 ? 1 : -1
          const next = Math.max(0, Math.min(TOTAL_SECTIONS - 1, current + direction))
          animateToSection(next)
        }
      }

      document.addEventListener('touchstart', handleTouchStart, { passive: true })
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd, { passive: true })

      return () => {
        lenis.destroy()
        setLenis(null)
        document.removeEventListener('touchstart', handleTouchStart)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }

    let wheelAccumulator = 0
    let wheelTimeout: ReturnType<typeof setTimeout> | null = null
    const wheelThreshold = 50

    const handleWheel = (e: WheelEvent) => {
      if (isAnimatingRef.current) {
        e.preventDefault()
        return
      }

      wheelAccumulator += e.deltaY

      if (wheelTimeout) clearTimeout(wheelTimeout)
      wheelTimeout = setTimeout(() => {
        wheelAccumulator = 0
      }, 150)

      if (Math.abs(wheelAccumulator) >= wheelThreshold) {
        e.preventDefault()
        const current = getSectionFromScroll()
        const direction = wheelAccumulator > 0 ? 1 : -1
        const next = Math.max(0, Math.min(TOTAL_SECTIONS - 1, current + direction))
        wheelAccumulator = 0
        animateToSection(next)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimatingRef.current) return

      const current = getSectionFromScroll()
      let next = current

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        next = Math.min(TOTAL_SECTIONS - 1, current + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        next = Math.max(0, current - 1)
      }

      if (next !== current) {
        animateToSection(next)
      }
    }

    document.addEventListener('wheel', handleWheel, { passive: false })
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      lenis.destroy()
      setLenis(null)
      document.removeEventListener('wheel', handleWheel)
      document.removeEventListener('keydown', handleKeyDown)
      if (wheelTimeout) clearTimeout(wheelTimeout)
    }
  }, [setLenis])

  return <WebGL />
}
