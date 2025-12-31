import { useStore } from '../../lib/store'
import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { WebGL } from './WebGL'
import { BRANCHES } from './SceneConfig'

const ALL_SECTION_COUNT = BRANCHES.reduce((acc, b) => acc + b.sections.length, 0)

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
      const swipeThreshold = 30
      const velocityThreshold = 0.3

      const getSectionScrollPosition = (sectionIndex: number) => {
        const windowHeight = window.innerHeight
        let scrollPos = 0
        let sectionCount = 0

        for (const branch of BRANCHES) {
          for (let i = 0; i < branch.sections.length; i++) {
            if (sectionCount === sectionIndex) {
              return scrollPos + i * windowHeight
            }
            sectionCount++
          }
          scrollPos += branch.sections.length * windowHeight
        }
        return scrollPos
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
          const direction = deltaY > 0 ? 1 : -1
          const nextSection = Math.max(0, Math.min(ALL_SECTION_COUNT - 1, currentSectionRef.current + direction))

          if (nextSection !== currentSectionRef.current) {
            isAnimatingRef.current = true
            currentSectionRef.current = nextSection
            const targetScroll = getSectionScrollPosition(nextSection)

            const startScroll = window.scrollY
            const distance = targetScroll - startScroll
            const duration = 800
            const startTime = performance.now()

            const animateScroll = (currentTime: number) => {
              const elapsed = currentTime - startTime
              const progress = Math.min(elapsed / duration, 1)
              const eased = 1 - Math.pow(1 - progress, 3)

              window.scrollTo(0, startScroll + distance * eased)

              if (progress < 1) {
                requestAnimationFrame(animateScroll)
              } else {
                isAnimatingRef.current = false
              }
            }

            requestAnimationFrame(animateScroll)
          }
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
