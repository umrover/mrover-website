import { useStore } from '../../lib/store'
import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { WebGL } from './WebGL'
import { BRANCHES } from './SceneConfig'

const TOTAL_SECTIONS = BRANCHES.reduce((acc, b) => acc + b.sections.length, 0)

export function SceneManager() {
  const setLenis = useStore((state) => state.setLenis)
  const setHeaderHeight = useStore((state) => state.setHeaderHeight)
  const currentSectionRef = useRef(0)
  const isAnimatingRef = useRef(false)

  useEffect(() => {
    const header = document.querySelector('header')
    if (header) {
      const height = header.offsetHeight
      setHeaderHeight(height)
      document.documentElement.style.setProperty('--header-height', `${height}px`)
    }

    window.scrollTo(0, 0)
    const isMobile = window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window

    const lenis = new Lenis({
      duration: isMobile ? 0.8 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: true,
      touchMultiplier: isMobile ? 1 : 2,
    })

    setLenis(lenis)

    const update = (time: number) => lenis.raf(time * 1000)
    requestAnimationFrame(function raf(time) {
      update(time)
      requestAnimationFrame(raf)
    })

    if (isMobile) {
      let touchStartY = 0
      let touchStartTime = 0
      const swipeThreshold = 50
      const velocityThreshold = 0.5

      const getScrollForSection = (section: number) => {
        return Math.max(0, Math.min(section, TOTAL_SECTIONS - 1)) * window.innerHeight
      }

      const getSectionFromScroll = () => {
        const section = Math.round(window.scrollY / window.innerHeight)
        return Math.max(0, Math.min(section, TOTAL_SECTIONS - 1))
      }

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

          if (next === current) return

          isAnimatingRef.current = true
          currentSectionRef.current = next

          const startScroll = window.scrollY
          const targetScroll = getScrollForSection(next)
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

    return () => {
      lenis.destroy()
      setLenis(null)
    }
  }, [setLenis, setHeaderHeight])

  return <WebGL />
}
