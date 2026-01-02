import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import { useScroll } from '../../hooks/use-scroll'
import { useRef, Suspense, useCallback, useEffect, useState, useMemo } from 'react'
import * as THREE from 'three'
import URDFLoader from 'urdf-loader'
import { lerp } from '../../lib/maths'
import { BRANCHES, BRANCH_SPACING } from './SceneConfig'

const ALL_SECTIONS = BRANCHES.flatMap(b => b.sections)

function Stars({ count = 8000 }) {
  const ref = useRef<THREE.Points>(null)
  const scrollRef = useRef(0)

  useScroll(useCallback(({ scroll }: { scroll: number }) => {
    scrollRef.current = scroll
  }, []))

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const colorArr = new Float32Array(count * 3)
    const radius = 2000
    const height = ALL_SECTIONS.length * BRANCH_SPACING * 1.5

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const r = radius * (0.3 + Math.random() * 0.7)
      const x = r * Math.cos(theta)
      const z = r * Math.sin(theta)
      const y = (Math.random() - 0.4) * height
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z

      const brightness = 0.7 + Math.random() * 0.5
      const tint = Math.random()
      if (tint < 0.1) {
        colorArr[i * 3] = brightness
        colorArr[i * 3 + 1] = brightness * 0.85
        colorArr[i * 3 + 2] = brightness * 0.7
      } else if (tint < 0.2) {
        colorArr[i * 3] = brightness * 0.85
        colorArr[i * 3 + 1] = brightness * 0.95
        colorArr[i * 3 + 2] = brightness
      } else {
        colorArr[i * 3] = brightness
        colorArr[i * 3 + 1] = brightness
        colorArr[i * 3 + 2] = brightness
      }
    }
    return [pos, colorArr]
  }, [count])

  useFrame(() => {
    if (document.hidden || !ref.current) return
    ref.current.rotation.y = scrollRef.current * 0.00005
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={3.5} vertexColors transparent opacity={1} sizeAttenuation />
    </points>
  )
}

function getScrollState(scroll: number, windowHeight: number) {
  let sectionOffset = 0
  let heightOffset = 0
  const transitionZone = windowHeight * 0.8

  for (const branch of BRANCHES) {
    const branchHeight = branch.sections.length * windowHeight
    const branchEnd = heightOffset + branchHeight

    if (scroll < branchEnd) {
      const scrolled = Math.max(0, scroll - heightOffset)
      const scrollable = branchHeight - windowHeight
      const transitionStart = scrollable + windowHeight - transitionZone

      if (scrolled <= transitionStart) {
        const progress = scrollable > 0 ? Math.min(scrolled / scrollable, 1) : 0
        const sectionFloat = progress * (branch.sections.length - 1)
        const localIdx = Math.floor(sectionFloat)
        const globalIdx = sectionOffset + localIdx

        return {
          sectionIndex: globalIdx,
          sectionProgress: sectionFloat - localIdx,
          fromSection: ALL_SECTIONS[globalIdx],
          toSection: ALL_SECTIONS[Math.min(globalIdx + 1, ALL_SECTIONS.length - 1)],
        }
      } else {
        const globalIdx = sectionOffset + branch.sections.length - 1
        const nextIdx = sectionOffset + branch.sections.length
        const transitionProgress = (scrolled - transitionStart) / transitionZone

        return {
          sectionIndex: globalIdx,
          sectionProgress: transitionProgress,
          fromSection: ALL_SECTIONS[globalIdx],
          toSection: nextIdx < ALL_SECTIONS.length ? ALL_SECTIONS[nextIdx] : ALL_SECTIONS[globalIdx],
        }
      }
    }

    heightOffset = branchEnd
    sectionOffset += branch.sections.length
  }

  const lastIdx = ALL_SECTIONS.length - 1
  return { sectionIndex: lastIdx, sectionProgress: 0, fromSection: ALL_SECTIONS[lastIdx], toSection: ALL_SECTIONS[lastIdx] }
}

function useScrollState() {
  const scrollRef = useRef(0)
  const [windowHeight, setWindowHeight] = useState(0)

  useEffect(() => {
    const updateSize = () => setWindowHeight(window.innerHeight)
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useScroll(useCallback(({ scroll }: { scroll: number }) => {
    scrollRef.current = scroll
  }, []))

  return { scrollRef, windowHeight }
}

function CameraController() {
  const { camera, size } = useThree()
  const { scrollRef, windowHeight } = useScrollState()
  const lookAtTarget = useRef(new THREE.Vector3())

  useFrame(() => {
    if (document.hidden || !windowHeight) return

    const { sectionProgress, fromSection, toSection } =
      getScrollState(scrollRef.current, windowHeight)

    const aspect = size.width / size.height
    const isMobileAspect = aspect < 0.8
    const xScale = isMobileAspect ? 0.3 : 1
    const zScale = isMobileAspect ? 1.4 : 1

    const camX = lerp(fromSection.camera.x, toSection.camera.x, sectionProgress) * xScale
    const camY = lerp(fromSection.camera.y, toSection.camera.y, sectionProgress)
    const camZ = lerp(fromSection.camera.z, toSection.camera.z, sectionProgress) * zScale

    camera.position.set(camX, camY, camZ)

    const lookX = lerp(fromSection.lookAt.x, toSection.lookAt.x, sectionProgress) * xScale
    const lookY = lerp(fromSection.lookAt.y, toSection.lookAt.y, sectionProgress)
    const lookZ = lerp(fromSection.lookAt.z, toSection.lookAt.z, sectionProgress)

    lookAtTarget.current.set(lookX, lookY, lookZ)
    camera.lookAt(lookAtTarget.current)
  })

  return null
}

const defaultJointValues: Record<string, number> = {
  chassis_to_arm_a: 24.14,
  arm_a_to_arm_b: -0.785,
  arm_b_to_arm_c: 1.91,
  arm_c_to_arm_d: -1,
  arm_d_to_arm_e: -1.57,
  gripper_link: 0,
}

function Rover({ onLoad }: { onLoad?: () => void }) {
  const [robot, setRobot] = useState<THREE.Object3D | null>(null)
  const hasCalledOnLoad = useRef(false)
  const frameCount = useRef(0)

  useEffect(() => {
    const loader = new URDFLoader()
    loader.packages = { mrover: '/urdf' }
    loader.load('/urdf/rover/rover.urdf', (loadedRobot) => {
      loadedRobot.rotation.x = -Math.PI / 2

      const texturePromises: Promise<void>[] = []

      loadedRobot.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
          const mat = child.material as THREE.MeshStandardMaterial
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.roughness = Math.min(mat.roughness, 0.7)
            if (mat.map && !mat.map.image) {
              texturePromises.push(new Promise<void>((resolve) => {
                const checkLoaded = () => {
                  if (mat.map?.image) resolve()
                  else setTimeout(checkLoaded, 50)
                }
                checkLoaded()
              }))
            }
          }
        }
      })

      const robotWithJoints = loadedRobot as THREE.Object3D & { setJointValue?: (name: string, value: number) => void }
      if (robotWithJoints.setJointValue) {
        for (const [joint, value] of Object.entries(defaultJointValues)) {
          robotWithJoints.setJointValue(joint, value)
        }
      }

      Promise.all(texturePromises).then(() => {
        setRobot(loadedRobot)
      })
    })
  }, [])

  useFrame(() => {
    if (document.hidden) return
    if (robot && !hasCalledOnLoad.current) {
      frameCount.current++
      if (frameCount.current >= 3) {
        hasCalledOnLoad.current = true
        onLoad?.()
      }
    }
  })

  if (!robot) return null

  return (
    <group position={[0, -25, 0]} rotation-y={-Math.PI / 3}>
      <primitive object={robot} />
    </group>
  )
}

function BranchPlaceholder({ branchIndex }: { branchIndex: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const yOffset = -BRANCH_SPACING * branchIndex

  useFrame(() => {
    if (document.hidden || !meshRef.current) return
    meshRef.current.rotation.y += 0.003
    meshRef.current.rotation.x += 0.002
  })

  return (
    <group position={[0, yOffset, 0]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[60, 60, 60]} />
        <meshBasicMaterial wireframe color="#ffffff" />
      </mesh>
      <sprite position={[0, 0, 35]} scale={[30, 30, 1]}>
        <spriteMaterial color="#ffffff" opacity={0.8} transparent>
          <canvasTexture
            attach="map"
            image={(() => {
              const canvas = document.createElement('canvas')
              canvas.width = 64
              canvas.height = 64
              const ctx = canvas.getContext('2d')!
              ctx.fillStyle = '#ffffff'
              ctx.font = 'bold 48px Arial'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(String(branchIndex), 32, 32)
              return canvas
            })()}
          />
        </spriteMaterial>
      </sprite>
    </group>
  )
}

function Atmosphere() {
  const { scene } = useThree()

  useEffect(() => {
    scene.background = new THREE.Color(0x0a0808)
    scene.fog = new THREE.FogExp2(0x1a1410, 0.00025)
    return () => {
      scene.background = null
      scene.fog = null
    }
  }, [scene])

  return null
}

function Stage() {
  const platformRef = useRef<THREE.Mesh>(null)
  const light1Ref = useRef<THREE.SpotLight>(null)
  const light2Ref = useRef<THREE.SpotLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)
  const { scrollRef, windowHeight } = useScrollState()

  useFrame(() => {
    if (document.hidden || !windowHeight) return

    const { sectionIndex, sectionProgress } = getScrollState(scrollRef.current, windowHeight)

    let progress = 0
    if (sectionIndex === 0) {
      progress = sectionProgress
    } else if (sectionIndex >= 1) {
      progress = 1
    }

    const eased = 1 - Math.pow(1 - progress, 3)

    if (platformRef.current) {
      platformRef.current.position.y = lerp(-80, -35, eased)
      const mat = platformRef.current.material as THREE.MeshStandardMaterial
      mat.opacity = lerp(0, 1, eased)
    }

    const lightIntensity = lerp(0, 100, eased)
    if (light1Ref.current) {
      light1Ref.current.intensity = lightIntensity
      if (targetRef.current) light1Ref.current.target = targetRef.current
    }
    if (light2Ref.current) {
      light2Ref.current.intensity = lightIntensity
      if (targetRef.current) light2Ref.current.target = targetRef.current
    }
  })

  return (
    <>
      <object3D ref={targetRef} position={[0, 20, 0]} />

      <mesh ref={platformRef} rotation-x={-Math.PI / 2} position={[0, -80, 0]} receiveShadow>
        <circleGeometry args={[100, 64]} />
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.3}
          roughness={0.8}
          transparent
          opacity={0}
        />
      </mesh>

      <spotLight
        ref={light1Ref}
        position={[120, 280, 120]}
        angle={0.5}
        penumbra={0.5}
        intensity={0}
        color="#ffffff"
        distance={500}
        decay={0.5}
        castShadow
      />
      <spotLight
        ref={light2Ref}
        position={[-120, 280, 120]}
        angle={0.5}
        penumbra={0.5}
        intensity={0}
        color="#FFE4C4"
        distance={500}
        decay={0.5}
        castShadow
      />
    </>
  )
}


function Scene({ isMobile, onRoverLoad }: { isMobile: boolean; onRoverLoad: () => void }) {
  return (
    <>
      <Atmosphere />
      <Stars count={isMobile ? 2000 : 3000} />
      <Environment preset="sunset" environmentIntensity={0.7} />

      <directionalLight
        position={[200, 300, 150]}
        intensity={2.0}
        color={0xffeedd}
        castShadow={!isMobile}
        shadow-bias={-0.0005}
        shadow-mapSize-width={isMobile ? 512 : 1024}
        shadow-mapSize-height={isMobile ? 512 : 1024}
        shadow-camera-far={800}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />
      <directionalLight position={[-150, 50, -100]} intensity={0.5} color={0x445566} />

      <CameraController />

      <Suspense fallback={null}>
        <Rover onLoad={onRoverLoad} />
        <Stage />
        {BRANCHES.slice(1).map((_, i) => (
          <BranchPlaceholder key={i + 1} branchIndex={i + 1} />
        ))}
      </Suspense>

      <EffectComposer enableNormalPass={false} multisampling={0}>
        <Vignette darkness={0.4} offset={0.3} />
      </EffectComposer>
    </>
  )
}

function LoadingOverlay({ progress, visible }: { progress: number; visible: boolean }) {
  if (!visible) return null
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
      transition: 'opacity 0.5s ease',
      pointerEvents: 'none',
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

function getScrollPositionForSection(globalSectionIndex: number, windowHeight: number): number {
  let sectionOffset = 0
  let heightOffset = 0

  for (const branch of BRANCHES) {
    const branchSectionCount = branch.sections.length
    const branchEnd = sectionOffset + branchSectionCount

    if (globalSectionIndex < branchEnd) {
      const localIndex = globalSectionIndex - sectionOffset
      const branchHeight = branchSectionCount * windowHeight
      const scrollable = branchHeight - windowHeight
      const progress = branchSectionCount > 1 ? localIndex / (branchSectionCount - 1) : 0
      return heightOffset + progress * scrollable
    }

    heightOffset += branchSectionCount * windowHeight
    sectionOffset = branchEnd
  }

  return heightOffset
}

function ProgressIndicator({ visible, isMobile }: { visible: boolean; isMobile: boolean }) {
  const [currentBranchIndex, setCurrentBranchIndex] = useState(0)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [expandedBranch, setExpandedBranch] = useState<number | null>(null)
  const [windowHeight, setWindowHeight] = useState(0)

  useEffect(() => {
    const updateSize = () => setWindowHeight(window.innerHeight)
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useScroll(useCallback(({ scroll }: { scroll: number }) => {
    if (!windowHeight) return

    const totalSections = ALL_SECTIONS.length
    const sectionIndex = Math.max(0, Math.min(Math.round(scroll / windowHeight), totalSections - 1))

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
    const scrollPos = getScrollPositionForSection(globalIndex, windowHeight)
    window.scrollTo({ top: scrollPos, behavior: 'smooth' })
  }

  if (!visible) return null

  let globalIdx = 0
  const branchOffsets: number[] = []
  for (const branch of BRANCHES) {
    branchOffsets.push(globalIdx)
    globalIdx += branch.sections.length
  }

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      left: '1.5rem',
      zIndex: 100,
      pointerEvents: 'auto',
      fontFamily: "'Rajdhani', system-ui, sans-serif",
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}>
        {BRANCHES.map((branch, idx) => {
          const isActive = idx === currentBranchIndex
          const isExpanded = expandedBranch === idx
          const branchOffset = branchOffsets[idx]

          return (
            <div
              key={branch.name}
              style={{ position: 'relative' }}
              onMouseEnter={() => !isMobile && setExpandedBranch(idx)}
              onMouseLeave={() => !isMobile && setExpandedBranch(null)}
            >
              <button
                onClick={() => {
                  if (isMobile) {
                    setExpandedBranch(isExpanded ? null : idx)
                  } else {
                    jumpToSection(branchOffset)
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
                  transform: isActive ? 'translateX(8px)' : 'translateX(0)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <span style={{
                  width: '12px',
                  height: '2px',
                  background: branch.accent,
                  opacity: isActive ? 1 : 0.4,
                  transition: 'opacity 0.3s ease',
                }} />
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
              </button>

              <div style={{
                position: 'absolute',
                left: '100%',
                top: '-8px',
                paddingLeft: '12px',
                opacity: isExpanded ? 1 : 0,
                transform: isExpanded ? 'translateX(0)' : 'translateX(-10px)',
                pointerEvents: isExpanded ? 'auto' : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                <div style={{
                  background: 'rgba(10, 8, 8, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${branch.accent}40`,
                  padding: '8px',
                  borderRadius: '8px',
                  minWidth: '200px',
                }}>
                {branch.sections.map((section, sectionIdx) => {
                  const globalSectionIdx = branchOffset + sectionIdx
                  const isSectionActive = globalSectionIdx === currentSectionIndex
                  let label = section.subteam?.name || section.label || section.name
                  if (section.name === 'mission-intro') label = 'Title'
                  else if (section.name === 'mission') label = 'Mission Statement'

                  return (
                    <button
                      key={section.name}
                      onClick={() => jumpToSection(globalSectionIdx)}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AboutExperience() {
  const [roverLoaded, setRoverLoaded] = useState(false)
  const isMobile = useIsMobile()

  const handleRoverLoad = useCallback(() => {
    setRoverLoaded(true)
  }, [])

  return (
    <>
      <LoadingOverlay progress={roverLoaded ? 100 : 50} visible={!roverLoaded} />
      <ProgressIndicator visible={roverLoaded} isMobile={isMobile} />
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: roverLoaded ? 1 : 0,
        transition: 'opacity 1s ease',
      }}>
        <Canvas
          gl={{ antialias: !isMobile, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.5, powerPreference: 'high-performance' }}
          camera={{ fov: 50, near: 0.1, far: 10000, position: [0, 100, 400] }}
          shadows={!isMobile}
          dpr={isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5)}
        >
          <Suspense fallback={null}>
            <Scene isMobile={isMobile} onRoverLoad={handleRoverLoad} />
          </Suspense>
        </Canvas>
      </div>
    </>
  )
}
