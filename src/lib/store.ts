import { create } from 'zustand'

interface ScrollData {
  scroll: number
  limit: number
  velocity: number
  direction: number
  progress: number
}

interface StoreState {
  scrollData: ScrollData | null
  setScrollData: (data: ScrollData) => void
}

export const useStore = create<StoreState>((set) => ({
  scrollData: null,
  setScrollData: (scrollData) => set({ scrollData }),
}))
