import { create } from 'zustand'
import { TOTAL_SECTIONS } from './SceneConfig'

interface ScrollState {
  targetSection: number
  animateToSection: (target: number) => void
}

export const useScrollState = create<ScrollState>((set, get) => {
  let cancelCurrentAnimation: (() => void) | null = null

  return {
    targetSection: 0,

    animateToSection: (target: number) => {
      const clamped = Math.max(0, Math.min(target, TOTAL_SECTIONS - 1))
      if (clamped === get().targetSection) return

      if (cancelCurrentAnimation) {
        cancelCurrentAnimation()
        cancelCurrentAnimation = null
      }

      set({ targetSection: clamped })

      const targetY = clamped * window.innerHeight
      const startY = window.scrollY
      const distance = targetY - startY
      if (Math.abs(distance) < 1) return

      const duration = 400
      const startTime = performance.now()
      let rafId: number
      let cancelled = false

      const animate = (now: number) => {
        if (cancelled) return
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        window.scrollTo(0, startY + distance * eased)
        if (progress < 1) {
          rafId = requestAnimationFrame(animate)
        } else {
          cancelCurrentAnimation = null
        }
      }

      rafId = requestAnimationFrame(animate)
      cancelCurrentAnimation = () => {
        cancelled = true
        cancelAnimationFrame(rafId)
      }
    },
  }
})
