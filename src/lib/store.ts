import { create } from 'zustand'
import type Lenis from 'lenis'

interface StoreState {
  lenis: Lenis | null
  setLenis: (lenis: Lenis | null) => void
}

export const useStore = create<StoreState>((set) => ({
  lenis: null,
  setLenis: (lenis) => set({ lenis }),
}))
