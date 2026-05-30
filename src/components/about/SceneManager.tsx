import { useEffect } from 'react'
import { AboutExperience } from './AboutExperience'
import { ProgressBar } from './ProgressBar'
import { useScrollState } from './scrollState'

export function SceneManager() {
  useEffect(() => {
    const staticLoader = document.getElementById('static-loader')
    if (staticLoader) {
      staticLoader.style.display = 'none'
    }
  }, [])

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

    let wheelDelta = 0
    let wheelTimer: ReturnType<typeof setTimeout> | null = null
    let lastScrollTime = 0
    const SCROLL_COOLDOWN = 450

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      wheelDelta += e.deltaY

      if (wheelTimer) clearTimeout(wheelTimer)
      wheelTimer = setTimeout(() => { wheelDelta = 0 }, 100)

      const now = performance.now()
      if (Math.abs(wheelDelta) >= 30 && now - lastScrollTime >= SCROLL_COOLDOWN) {
        const direction = wheelDelta > 0 ? 1 : -1
        wheelDelta = 0
        lastScrollTime = now
        const { targetSection, animateToSection } = useScrollState.getState()
        animateToSection(targetSection + direction)
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
      const { targetSection, animateToSection } = useScrollState.getState()
      animateToSection(targetSection + (deltaY > 0 ? 1 : -1))
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
      if (direction !== 0) {
        const { targetSection, animateToSection } = useScrollState.getState()
        animateToSection(targetSection + direction)
      }
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
