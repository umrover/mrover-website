import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Stars, Environment } from '@react-three/drei'
import { EffectComposer, Vignette, Bloom } from '@react-three/postprocessing'
import { useScroll } from '../../hooks/use-scroll'
import { useStore } from '../../lib/store'
import { useRef, Suspense, useCallback, useEffect, useState } from 'react'
import * as THREE from 'three'
import URDFLoader from 'urdf-loader'
import GUI from 'lil-gui'
import { lerp } from '../../lib/maths'
import { BRANCHES, BRANCH_SPACING } from './SceneConfig'
import { MarsTerrain } from './MarsTerrain'

const debugConfig = {
  currentSection: 0,
  rover: {
    scale: 1,
    rotationY: -Math.PI/3,
  },
  joints: {} as Record<string, number>,
}

let robotRef: any = null
let guiJointsFolder: GUI | null = null

const ALL_SECTIONS = BRANCHES.flatMap(b => b.sections)

function getScrollState(scroll: number, windowHeight: number) {
  let globalSectionOffset = 0
  let accumulatedHeight = 0

  for (let branchIdx = 0; branchIdx < BRANCHES.length; branchIdx++) {
    const branch = BRANCHES[branchIdx]
    const branchHeight = branch.sections.length * windowHeight
    const branchEnd = accumulatedHeight + branchHeight

    if (scroll < branchEnd) {
      const scrolledIntoBranch = Math.max(0, scroll - accumulatedHeight)
      const scrollableDistance = branchHeight - windowHeight

      let fromSection, toSection, sectionProgress, globalIndex

      if (scrolledIntoBranch <= scrollableDistance) {
        // Normal scrolling within branch sections
        const branchProgress = scrollableDistance > 0
          ? scrolledIntoBranch / scrollableDistance
          : 0

        const sectionFloat = branchProgress * (branch.sections.length - 1)
        const localIndex = Math.floor(sectionFloat)
        sectionProgress = sectionFloat - localIndex

        globalIndex = globalSectionOffset + localIndex
        fromSection = ALL_SECTIONS[globalIndex]
        toSection = ALL_SECTIONS[Math.min(globalIndex + 1, ALL_SECTIONS.length - 1)]
      } else {
        // Transition zone: last windowHeight of branch, animate to next branch
        const transitionProgress = (scrolledIntoBranch - scrollableDistance) / windowHeight

        globalIndex = globalSectionOffset + branch.sections.length - 1
        const nextBranchFirstIndex = globalSectionOffset + branch.sections.length

        fromSection = ALL_SECTIONS[globalIndex]
        toSection = nextBranchFirstIndex < ALL_SECTIONS.length
          ? ALL_SECTIONS[nextBranchFirstIndex]
          : fromSection
        sectionProgress = transitionProgress
      }

      return { sectionIndex: globalIndex, sectionProgress, fromSection, toSection }
    }

    accumulatedHeight = branchEnd
    globalSectionOffset += branch.sections.length
  }

  const lastIndex = ALL_SECTIONS.length - 1
  return {
    sectionIndex: lastIndex,
    sectionProgress: 0,
    fromSection: ALL_SECTIONS[lastIndex],
    toSection: ALL_SECTIONS[lastIndex],
  }
}


function useScrollState() {
  const scrollRef = useRef(0)
  const headerHeight = useStore((state) => state.headerHeight)
  const [windowHeight, setWindowHeight] = useState(0)

  useEffect(() => {
    const updateSize = () => setWindowHeight(window.innerHeight)
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const scrollCallback = useCallback(({ scroll }: { scroll: number }) => {
    scrollRef.current = scroll
  }, [])

  useScroll(scrollCallback)

  return { scrollRef, headerHeight, windowHeight }
}

function CameraController() {
  const { camera } = useThree()
  const { scrollRef, windowHeight } = useScrollState()
  const lookAtTarget = useRef(new THREE.Vector3())

  useFrame(() => {
    if (!windowHeight) return

    const { sectionIndex, sectionProgress, fromSection, toSection } =
      getScrollState(scrollRef.current, windowHeight)

    debugConfig.currentSection = sectionIndex

    const camX = lerp(fromSection.camera.x, toSection.camera.x, sectionProgress)
    const camY = lerp(fromSection.camera.y, toSection.camera.y, sectionProgress)
    const camZ = lerp(fromSection.camera.z, toSection.camera.z, sectionProgress)

    camera.position.set(camX, camY, camZ)

    const lookX = lerp(fromSection.lookAt.x, toSection.lookAt.x, sectionProgress)
    const lookY = lerp(fromSection.lookAt.y, toSection.lookAt.y, sectionProgress)
    const lookZ = lerp(fromSection.lookAt.z, toSection.lookAt.z, sectionProgress)

    lookAtTarget.current.set(lookX, lookY, lookZ)
    camera.lookAt(lookAtTarget.current)
  })

  return null
}

function Rover({ yOffset = 0 }: { yOffset?: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const [robot, setRobot] = useState<THREE.Object3D | null>(null)
  const robotInstanceRef = useRef<any>(null)

  useEffect(() => {
    const loader = new URDFLoader()
    loader.packages = { mrover: '/urdf' }
    loader.load('/urdf/rover/rover.urdf', (loadedRobot) => {
      loadedRobot.rotation.x = -Math.PI / 2
      loadedRobot.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.roughness = Math.min(child.material.roughness, 0.7)
          }
        }
      })
      robotInstanceRef.current = loadedRobot

      if (yOffset === 0) {
        robotRef = loadedRobot
        const robot = loadedRobot as any
        if (guiJointsFolder && robot.joints) {
          Object.entries(robot.joints).forEach(([name, joint]: [string, any]) => {
            if (joint.jointType === 'revolute' || joint.jointType === 'continuous' || joint.jointType === 'prismatic') {
              const min = joint.limit?.lower ?? -Math.PI
              const max = joint.limit?.upper ?? Math.PI
              const initial = Array.isArray(joint.jointValue) ? joint.jointValue[0] : (joint.jointValue ?? 0)
              debugConfig.joints[name] = initial
              guiJointsFolder!.add(debugConfig.joints, name, min, max).onChange((v: number) => {
                joint.setJointValue(v)
              })
            }
          })
        }
      }

      setRobot(loadedRobot)
    })
  }, [yOffset])

  useFrame(() => {
    if (!groupRef.current || !robotInstanceRef.current) return
    groupRef.current.rotation.y = debugConfig.rover.rotationY
    groupRef.current.scale.setScalar(debugConfig.rover.scale)
  })

  if (!robot) return null

  return (
    <group ref={groupRef} position={[0, yOffset, 0]}>
      <primitive object={robot} />
    </group>
  )
}


function BranchPlaceholder({ branchIndex }: { branchIndex: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const yOffset = -BRANCH_SPACING * branchIndex

  useFrame(() => {
    if (!meshRef.current) return
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

function Scene() {
  return (
    <>
      <Atmosphere />
      <Stars radius={800} depth={150} count={5000} factor={6} fade speed={0.3} />

      {/* Environment provides realistic fill light and reflections */}
      <Environment preset="sunset" environmentIntensity={0.7} />

      {/* Main Sun Light */}
      <directionalLight
        position={[200, 300, 150]}
        intensity={2.0}
        color={0xffeedd}
        castShadow
        shadow-bias={-0.0005}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={800}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />

      {/* Subtle rim light for definition */}
      <directionalLight position={[-150, 50, -100]} intensity={0.5} color={0x445566} />

      <CameraController />

      <MarsTerrain />
      <Suspense fallback={null}>
        <Rover yOffset={0} />
        {BRANCHES.slice(1).map((_, i) => (
          <BranchPlaceholder key={i + 1} branchIndex={i + 1} />
        ))}
      </Suspense>

      {/* Post-processing */}
      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={0.5} radius={0.6} />
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
      <div className="loader-spinner" style={{
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

export function WebGL() {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    THREE.DefaultLoadingManager.onStart = () => {
      setLoading(true)
      setProgress(0)
    }
    
    THREE.DefaultLoadingManager.onProgress = (_, itemsLoaded, itemsTotal) => {
      setProgress((itemsLoaded / itemsTotal) * 100)
    }

    THREE.DefaultLoadingManager.onLoad = () => {
      setProgress(100)
      setTimeout(() => setLoading(false), 500) // Prevent dark flash
    }
  }, [])

  useEffect(() => {
    const gui = new GUI()
    gui.add(debugConfig, 'currentSection').name('Current Section').listen().disable()
    // gui.hide()

    const rover = gui.addFolder('Rover')
    rover.add(debugConfig.rover, 'scale', 0.1, 5)
    rover.add(debugConfig.rover, 'rotationY', -Math.PI, Math.PI).name('rotation Y')

    guiJointsFolder = gui.addFolder('Joints')
    guiJointsFolder.close()

    if (robotRef?.joints) {
      Object.entries(robotRef.joints).forEach(([name, joint]: [string, any]) => {
        if (joint.jointType === 'revolute' || joint.jointType === 'continuous' || joint.jointType === 'prismatic') {
          const min = joint.limit?.lower ?? -Math.PI
          const max = joint.limit?.upper ?? Math.PI
          const initial = Array.isArray(joint.jointValue) ? joint.jointValue[0] : (joint.jointValue ?? 0)
          debugConfig.joints[name] = initial
          guiJointsFolder!.add(debugConfig.joints, name, min, max).onChange((v: number) => {
            joint.setJointValue(v)
          })
        }
      })
    }

    return () => {
      gui.destroy()
      guiJointsFolder = null
    }
  }, [])

  return (
    <>
      <LoadingOverlay progress={progress} visible={loading} />
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: loading ? 0 : 1,
        transition: 'opacity 1s ease',
      }}>
        <Canvas
          gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.5 }}
          camera={{ fov: 50, near: 0.1, far: 10000, position: [0, 100, 400] }}
          shadows
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>
    </>
  )
}
