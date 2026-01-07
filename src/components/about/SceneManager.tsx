import { useEffect } from 'react'
import { AboutExperience } from './AboutExperience'
import { ProgressBar } from './ProgressBar'
import { BRANCHES } from './SceneConfig'

const TOTAL_SECTIONS = BRANCHES.reduce((acc, b) => acc + b.sections.length, 0)

export function SceneManager() {
  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null
    const header = document.querySelector('header')
    if (header) {
      const updateHeaderHeight = () => {
        document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`)
      }
      updateHeaderHeight()
      resizeObserver = new ResizeObserver(updateHeaderHeight)
      resizeObserver.observe(header)
    }

    window.scrollTo(0, 0)

    let currentSection = 0
    let isAnimating = false

    const animateToSection = (targetSection: number) => {
      const clamped = Math.max(0, Math.min(targetSection, TOTAL_SECTIONS - 1))
      if (clamped === currentSection || isAnimating) return

      isAnimating = true
      currentSection = clamped

      const targetY = clamped * window.innerHeight
      const startY = window.scrollY
      const distance = targetY - startY
      const duration = 600
      const startTime = performance.now()

      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)

        window.scrollTo(0, startY + distance * eased)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          isAnimating = false
        }
      }

      requestAnimationFrame(animate)
    }

    let wheelDelta = 0
    let wheelTimer: ReturnType<typeof setTimeout> | null = null

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      wheelDelta += e.deltaY

      if (wheelTimer) clearTimeout(wheelTimer)
      wheelTimer = setTimeout(() => { wheelDelta = 0 }, 100)

      if (Math.abs(wheelDelta) >= 30) {
        const direction = wheelDelta > 0 ? 1 : -1
        wheelDelta = 0
        animateToSection(currentSection + direction)
      }
    }

    let touchStartY = 0
    let isTouching = false

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
      isTouching = true
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isTouching) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTouching) return
      isTouching = false

      const deltaY = touchStartY - e.changedTouches[0].clientY
      if (Math.abs(deltaY) < 30) return
      animateToSection(currentSection + (deltaY > 0 ? 1 : -1))
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      let direction = 0
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        direction = 1
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        direction = -1
      }
      if (direction !== 0) animateToSection(currentSection + direction)
    }

    document.addEventListener('wheel', handleWheel, { passive: false })
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('wheel', handleWheel)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('keydown', handleKeyDown)
      if (wheelTimer) clearTimeout(wheelTimer)
      if (resizeObserver) resizeObserver.disconnect()
    }
  }, [])

  return (
    <>
      <AboutExperience />
      <ProgressBar />
    </>
  )
}
