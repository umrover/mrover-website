import { create } from 'zustand'
import { BRANCHES } from './SceneConfig'

const TOTAL_SECTIONS = BRANCHES.reduce((acc, b) => acc + b.sections.length, 0)

interface ScrollState {
  isAnimating: boolean
  getCurrentSection: () => number
  animateToSection: (target: number) => void
}

export const useScrollState = create<ScrollState>((set, get) => ({
  isAnimating: false,

  getCurrentSection: () => {
    return Math.round(window.scrollY / window.innerHeight)
  },

  animateToSection: (targetSection: number) => {
    const { isAnimating, getCurrentSection } = get()
    if (isAnimating) return

    const currentSection = getCurrentSection()
    const clamped = Math.max(0, Math.min(targetSection, TOTAL_SECTIONS - 1))
    if (clamped === currentSection) return

    set({ isAnimating: true })

    const targetY = clamped * window.innerHeight
    const startY = window.scrollY
    const distance = targetY - startY
    const duration = 400
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      window.scrollTo(0, startY + distance * eased)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        set({ isAnimating: false })
      }
    }

    requestAnimationFrame(animate)
  }
}))
