import { useState, useEffect, useCallback } from 'react'
import { useScroll } from '../../hooks/use-scroll'
import { BRANCHES, TOTAL_SECTIONS, type Branch, type SectionTarget } from './SceneConfig'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

export function LoadingOverlay({ progress, visible, message }: { progress: number; visible: boolean; message?: string }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: '#0a0808',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.8s ease',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255, 140, 0, 0.3)',
        borderTopColor: '#FF8C00',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <div style={{
        marginTop: '20px',
        width: '200px',
        height: '2px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '1px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: '#FF8C00',
          transition: 'width 0.2s ease-out'
        }} />
      </div>
      {message && (
        <div style={{
          marginTop: '12px',
          color: 'rgba(255, 255, 255, 0.5)',
          fontFamily: "'Rajdhani', monospace",
          fontSize: '0.9rem',
          letterSpacing: '0.05em'
        }}>
          {message}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function AnimatedBranchLabel({ label, color }: { label: string; color: string }) {
  const [state, setState] = useState({
    displayLabel: label,
    displayColor: color,
    prevLabel: null as string | null,
    prevColor: null as string | null
  })

  // setState during render is the React-recommended pattern for syncing derived state
  // from props without a render cycle delay. useEffect would cause a visible flicker.
  if (label !== state.displayLabel) {
    setState({
      displayLabel: label,
      displayColor: color,
      prevLabel: state.displayLabel,
      prevColor: state.displayColor
    })
  }

  useEffect(() => {
    if (state.prevLabel) {
      const timer = setTimeout(() => {
        setState(s => ({ ...s, prevLabel: null, prevColor: null }))
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [state.prevLabel])

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minWidth: '100px' }}>
      {state.prevLabel && (
        <span style={{
          position: 'absolute',
          top: 0,
          left: 0,
          color: state.prevColor!,
          animation: 'slideOutUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          whiteSpace: 'nowrap',
          fontSize: '1.1rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          {state.prevLabel}
        </span>
      )}
      <span style={{
        display: 'block',
        color: state.displayColor,
        animation: state.prevLabel ? 'slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
        whiteSpace: 'nowrap',
        fontSize: '1.1rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {state.displayLabel}
      </span>
      <style>{`
        @keyframes slideOutUp {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-100%); opacity: 0; }
        }
        @keyframes slideInUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function sectionNavLabel(section: SectionTarget): string {
  return section.navLabel ?? section.subteam?.name ?? section.label ?? section.name
}

function SectionDropdown({
  branch,
  branchOffset,
  currentSectionIndex,
  isMobile,
  isExpanded,
  onJump,
}: {
  branch: Branch
  branchOffset: number
  currentSectionIndex: number
  isMobile: boolean
  isExpanded: boolean
  onJump: (globalIndex: number) => void
}) {
  return (
    <div style={{
      position: isMobile ? 'relative' : 'absolute',
      left: isMobile ? '0' : '100%',
      top: isMobile ? '0' : '-8px',
      paddingLeft: '12px',
      height: isExpanded ? 'auto' : '0',
      opacity: isExpanded ? 1 : 0,
      transform: (!isMobile && !isExpanded) ? 'translateX(-10px)' : 'translateX(0)',
      pointerEvents: isExpanded ? 'auto' : 'none',
      overflow: 'hidden',
      transition: isMobile ? 'all 0.3s ease' : 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      <div style={{
        background: isMobile ? 'transparent' : 'rgba(10, 8, 8, 0.95)',
        backdropFilter: isMobile ? 'none' : 'blur(12px)',
        border: isMobile ? 'none' : `1px solid ${branch.accent}40`,
        padding: '8px',
        borderRadius: '8px',
        minWidth: isMobile ? '0' : '200px',
      }}>
        {branch.sections.map((section, sectionIdx) => {
          const globalSectionIdx = branchOffset + sectionIdx
          const isSectionActive = globalSectionIdx === currentSectionIndex
          const label = sectionNavLabel(section)

          return (
            <button
              key={section.name}
              onClick={() => onJump(globalSectionIdx)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isSectionActive ? branch.accent : 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.95rem',
                fontWeight: isSectionActive ? 600 : 400,
                textAlign: 'left',
                letterSpacing: '0.05em',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = branch.accent
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isSectionActive ? branch.accent : 'rgba(255, 255, 255, 0.6)'
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BranchRow({
  branch,
  branchOffset,
  isActive,
  currentSectionIndex,
  isMobile,
  onJump,
}: {
  branch: Branch
  branchOffset: number
  isActive: boolean
  currentSectionIndex: number
  isMobile: boolean
  onJump: (globalIndex: number) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => !isMobile && setIsExpanded(true)}
      onMouseLeave={() => !isMobile && setIsExpanded(false)}
    >
      <button
        onClick={() => {
          if (isMobile) {
            setIsExpanded((prev) => !prev)
          } else {
            onJump(branchOffset)
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '6px 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transform: (!isMobile && isActive) ? 'translateX(8px)' : 'translateX(0)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: '100%',
        }}
      >
        {!isMobile && (
          <span style={{
            width: '12px',
            height: '2px',
            background: branch.accent,
            opacity: isActive ? 1 : 0.4,
            transition: 'opacity 0.3s ease',
          }} />
        )}
        <span style={{
          fontSize: '1.1rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
          transition: 'color 0.3s ease',
        }}>
          {branch.name}
        </span>
        {isMobile && (
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.4)',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}>
            ▶
          </span>
        )}
      </button>

      <SectionDropdown
        branch={branch}
        branchOffset={branchOffset}
        currentSectionIndex={currentSectionIndex}
        isMobile={isMobile}
        isExpanded={isExpanded}
        onJump={(idx) => {
          onJump(idx)
          if (isMobile) setIsExpanded(false)
        }}
      />
    </div>
  )
}

export function ProgressIndicator({ visible, isMobile }: { visible: boolean; isMobile: boolean }) {
  const [currentBranchIndex, setCurrentBranchIndex] = useState(0)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [windowHeight, setWindowHeight] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const updateSize = () => setWindowHeight(window.innerHeight)
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useScroll(useCallback(({ scroll }: { scroll: number }) => {
    if (!windowHeight) return

    const sectionIndex = Math.max(0, Math.min(Math.round(scroll / windowHeight), TOTAL_SECTIONS - 1))

    let branchIdx = 0
    let sectionCount = 0
    for (let i = 0; i < BRANCHES.length; i++) {
      if (sectionIndex < sectionCount + BRANCHES[i].sections.length) {
        branchIdx = i
        break
      }
      sectionCount += BRANCHES[i].sections.length
    }

    setCurrentBranchIndex(branchIdx)
    setCurrentSectionIndex(sectionIndex)
  }, [windowHeight]))

  const jumpToSection = (globalIndex: number) => {
    if (!windowHeight) return
    window.scrollTo({ top: globalIndex * windowHeight, behavior: 'smooth' })
    if (isMobile) setMobileMenuOpen(false)
  }

  if (!visible) return null

  let globalIdx = 0
  const branchOffsets: number[] = []
  for (const branch of BRANCHES) {
    branchOffsets.push(globalIdx)
    globalIdx += branch.sections.length
  }

  const currentBranch = BRANCHES[currentBranchIndex]

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      left: '1.5rem',
      zIndex: 100,
      pointerEvents: 'auto',
      fontFamily: "var(--font-sans)",
    }}>
      {isMobile && (
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '8px 12px',
            background: 'rgba(10, 8, 8, 0.8)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${currentBranch.accent}40`,
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '0.5rem',
            color: 'white',
          }}
        >
          <AnimatedBranchLabel label={currentBranch.name} color={currentBranch.accent} />
          <span style={{
            fontSize: '0.8rem',
            transform: mobileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            color: 'rgba(255, 255, 255, 0.6)',
          }}>
            ▼
          </span>
        </button>
      )}

      <div style={{
        display: isMobile && !mobileMenuOpen ? 'none' : 'flex',
        flexDirection: 'column',
        gap: '0',
        background: isMobile ? 'rgba(10, 8, 8, 0.95)' : 'transparent',
        padding: isMobile ? '12px' : '0',
        borderRadius: isMobile ? '8px' : '0',
        border: isMobile ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        backdropFilter: isMobile ? 'blur(12px)' : 'none',
        maxHeight: isMobile ? '60vh' : 'none',
        overflowY: isMobile ? 'auto' : 'visible',
      }}>
        {BRANCHES.map((branch, idx) => (
          <BranchRow
            key={branch.name}
            branch={branch}
            branchOffset={branchOffsets[idx]}
            isActive={idx === currentBranchIndex}
            currentSectionIndex={currentSectionIndex}
            isMobile={isMobile}
            onJump={jumpToSection}
          />
        ))}
      </div>
    </div>
  )
}
