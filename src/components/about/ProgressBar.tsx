import { useRef, useCallback, useState, useEffect } from 'react'
import { useScroll } from '../../hooks/use-scroll'
import { BRANCHES } from './SceneConfig'
import { useScrollState } from './scrollState'

const TOTAL_SECTIONS = BRANCHES.reduce((acc, b) => acc + b.sections.length, 0)

export function ProgressBar() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [windowHeight, setWindowHeight] = useState(0)
  const { animateToSection } = useScrollState()

  useEffect(() => {
    const update = () => setWindowHeight(window.innerHeight)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useScroll(useCallback(({ scroll }: { scroll: number }) => {
    if (!windowHeight) return
    const idx = Math.max(0, Math.min(Math.round(scroll / windowHeight), TOTAL_SECTIONS - 1))
    setActiveIndex(idx)
  }, [windowHeight]))

  let globalIdx = 0
  const dots: { branchAccent: string; sectionIdx: number }[] = []
  for (const branch of BRANCHES) {
    for (let i = 0; i < branch.sections.length; i++) {
      dots.push({ branchAccent: branch.accent, sectionIdx: globalIdx })
      globalIdx++
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: '1.25rem',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center',
      }}
    >
      {dots.map(({ branchAccent, sectionIdx }) => {
        const isActive = sectionIdx === activeIndex
        return (
          <button
            key={sectionIdx}
            onClick={() => animateToSection(sectionIdx)}
            title={`Section ${sectionIdx + 1}`}
            style={{
              width: isActive ? '8px' : '6px',
              height: isActive ? '8px' : '6px',
              borderRadius: '50%',
              background: isActive ? branchAccent : 'rgba(255,255,255,0.25)',
              border: isActive ? `1px solid ${branchAccent}` : '1px solid rgba(255,255,255,0.1)',
              padding: 0,
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: isActive ? `0 0 8px ${branchAccent}80` : 'none',
            }}
          />
        )
      })}
    </div>
  )
}
