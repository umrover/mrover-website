import { useEffect } from 'react'

interface ScrollData {
  scroll: number
  limit: number
  progress: number
}

export function useScroll(callback: (data: ScrollData) => void) {
  useEffect(() => {
    const handleScroll = () => {
      const scroll = window.scrollY
      const limit = document.documentElement.scrollHeight - window.innerHeight
      const progress = limit > 0 ? scroll / limit : 0
      callback({ scroll, limit, progress })
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [callback])
}
