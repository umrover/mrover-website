import { useStore } from '../../lib/store'
import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { AboutExperience } from './AboutExperience'
import { ProgressBar } from './ProgressBar'
import { BRANCHES } from './SceneConfig'

const TOTAL_SECTIONS = BRANCHES.reduce((acc, b) => acc + b.sections.length, 0)

export function SceneManager() {
  const setLenis = useStore((state) => state.setLenis)
  const currentSectionRef = useRef(0)
  const targetSectionRef = useRef(0)
  const isAnimatingRef = useRef(false)
  const queuedDirectionRef = useRef<number | null>(null)
  const animationStartTimeRef = useRef(0)

  useEffect(() => {
    const header = document.querySelector('header')
    if (header) {
      document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`)
    }

    window.scrollTo(0, 0)
    currentSectionRef.current = 0
    targetSectionRef.current = 0

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
      const clamped = Math.max(0, Math.min(section, TOTAL_SECTIONS - 1))
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
      return clamped * (scrollableHeight / (TOTAL_SECTIONS - 1))
    }

    const animateToSection = (targetSection: number) => {
      const clampedTarget = Math.max(0, Math.min(targetSection, TOTAL_SECTIONS - 1))

      if (isAnimatingRef.current) {
        if (clampedTarget !== targetSectionRef.current) {
          queuedDirectionRef.current = clampedTarget > targetSectionRef.current ? 1 : -1
        }
        return
      }

      if (clampedTarget === currentSectionRef.current) return

      isAnimatingRef.current = true
      targetSectionRef.current = clampedTarget
      queuedDirectionRef.current = null
      animationStartTimeRef.current = performance.now()

      const startScroll = window.scrollY
      const targetScroll = getScrollForSection(clampedTarget)
      const distance = targetScroll - startScroll
      const duration = 600
      const startTime = performance.now()

      lenis.stop()

      const animate = (now: number) => {
        const elapsed = now - startTime
        const t = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)

        window.scrollTo(0, startScroll + distance * eased)

        if (t < 1) {
          requestAnimationFrame(animate)
        } else {
          window.scrollTo(0, targetScroll)
          currentSectionRef.current = clampedTarget
          isAnimatingRef.current = false
          lenis.start()

          if (queuedDirectionRef.current !== null) {
            const nextSection = currentSectionRef.current + queuedDirectionRef.current
            queuedDirectionRef.current = null
            animateToSection(nextSection)
          }
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
        if (e.cancelable) {
          e.preventDefault()
        }
      }

      const handleTouchEnd = (e: TouchEvent) => {
        const touchEndY = e.changedTouches[0].clientY
        const deltaY = touchStartY - touchEndY
        const deltaTime = Date.now() - touchStartTime
        const velocity = Math.abs(deltaY) / deltaTime

        const isSwipe = Math.abs(deltaY) > swipeThreshold || velocity > velocityThreshold

        if (isSwipe) {
          const direction = deltaY > 0 ? 1 : -1
          const baseSection = isAnimatingRef.current ? targetSectionRef.current : currentSectionRef.current
          animateToSection(baseSection + direction)
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
      e.preventDefault()

      if (isAnimatingRef.current) {
        const timeSinceStart = performance.now() - animationStartTimeRef.current
        if (timeSinceStart > 200) {
          const direction = e.deltaY > 0 ? 1 : -1
          queuedDirectionRef.current = direction
        }
        return
      }

      wheelAccumulator += e.deltaY

      if (wheelTimeout) clearTimeout(wheelTimeout)
      wheelTimeout = setTimeout(() => {
        wheelAccumulator = 0
      }, 150)

      if (Math.abs(wheelAccumulator) >= wheelThreshold) {
        const direction = wheelAccumulator > 0 ? 1 : -1
        wheelAccumulator = 0
        animateToSection(currentSectionRef.current + direction)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const baseSection = isAnimatingRef.current ? targetSectionRef.current : currentSectionRef.current

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        animateToSection(baseSection + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        animateToSection(baseSection - 1)
      }
    }

    const handleScroll = () => {
      if (isAnimatingRef.current) return
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
      const sectionHeight = scrollableHeight / (TOTAL_SECTIONS - 1)
      const section = Math.round(window.scrollY / sectionHeight)
      const clamped = Math.max(0, Math.min(section, TOTAL_SECTIONS - 1))
      if (clamped !== currentSectionRef.current) {
        currentSectionRef.current = clamped
        targetSectionRef.current = clamped
      }
    }

    document.addEventListener('wheel', handleWheel, { passive: false })
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      lenis.destroy()
      setLenis(null)
      document.removeEventListener('wheel', handleWheel)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll)
      if (wheelTimeout) clearTimeout(wheelTimeout)
    }
  }, [setLenis])

  return (
    <>
      <AboutExperience />
      <ProgressBar />
    </>
  )
}
