import { useRef, useCallback } from 'react'
import { useScroll } from '../../hooks/use-scroll'
import { BRANCHES } from './SceneConfig'

const TOTAL_SECTIONS = BRANCHES.reduce((acc, b) => acc + b.sections.length, 0)

export function ProgressBar() {
  const barRef = useRef<HTMLDivElement>(null)

  useScroll(useCallback(({ scroll, limit }: { scroll: number; limit: number }) => {
    if (!barRef.current) return
    const progress = limit > 0 ? scroll / limit : 0
    barRef.current.style.transform = `scaleY(${progress})`
  }, []))

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const progress = clickY / rect.height
    const targetSection = Math.round(progress * (TOTAL_SECTIONS - 1))
    window.scrollTo({ top: targetSection * window.innerHeight, behavior: 'smooth' })
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '4px',
        height: '100%',
        background: 'rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        cursor: 'pointer',
      }}
    >
      <div
        ref={barRef}
        style={{
          width: '100%',
          height: '100%',
          background: '#FF8C00',
          transformOrigin: '50% 0',
          transform: 'scaleY(0)',
        }}
      />
    </div>
  )
}
