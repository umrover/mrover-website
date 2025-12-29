import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Environment } from '@react-three/drei'
import { EffectComposer, Vignette, Bloom } from '@react-three/postprocessing'
import { useScroll } from '../../hooks/use-scroll'
import { useStore } from '../../lib/store'
import { useRef, Suspense, useCallback, useEffect, useState } from 'react'
import * as THREE from 'three'
import URDFLoader from 'urdf-loader'
import GUI from 'lil-gui'
import { lerp } from '../../lib/maths'
import { BRANCHES } from './SceneConfig'
import { MarsTerrain } from './MarsTerrain'

const debugConfig = {
  orbitControls: false,
  currentSection: 0,
  currentBranch: 0,
  rover: {
    scale: 1,
    rotationY: -Math.PI/3,
  },
  joints: {} as Record<string, number>,
}

let robotRef: any = null
let guiJointsFolder: GUI | null = null

interface ScrollState {
  branchIndex: number
  sectionIndex: number
  sectionProgress: number
  branchProgress: number
}

function getGlobalSectionProgress(scroll: number, headerHeight: number, windowHeight: number) {
  const totalSections = BRANCHES.reduce((sum, b) => sum + b.sections.length, 0)
  const totalHeight = totalSections * windowHeight
  const scrollFromStart = Math.max(0, scroll - headerHeight)
  const globalProgress = Math.min(1, scrollFromStart / (totalHeight - windowHeight))
  return globalProgress * (totalSections - 1)
}

function getBranchAndProgress(scroll: number, headerHeight: number, windowHeight: number): ScrollState & {
  branch: typeof BRANCHES[0]
  currentSection: typeof BRANCHES[0]['sections'][0]
  nextSection: typeof BRANCHES[0]['sections'][0]
  globalSectionFloat: number
} {
  let accumulatedHeight = headerHeight
  const globalSectionFloat = getGlobalSectionProgress(scroll, headerHeight, windowHeight)

  for (let i = 0; i < BRANCHES.length; i++) {
    const branch = BRANCHES[i]
    const branchHeight = branch.sections.length * windowHeight
    const branchStart = accumulatedHeight
    const branchEnd = accumulatedHeight + branchHeight

    if (scroll < branchEnd || i === BRANCHES.length - 1) {
      const scrollInBranch = Math.max(0, scroll - branchStart)
      const branchProgress = Math.min(1, scrollInBranch / (branchHeight - windowHeight))

      const sectionFloat = branchProgress * (branch.sections.length - 1)
      const sectionIndex = Math.floor(sectionFloat)
      const sectionProgress = sectionFloat - sectionIndex

      return {
        branchIndex: i,
        branch,
        sectionIndex,
        sectionProgress,
        branchProgress,
        globalSectionFloat,
        currentSection: branch.sections[Math.min(sectionIndex, branch.sections.length - 1)],
        nextSection: branch.sections[Math.min(sectionIndex + 1, branch.sections.length - 1)],
      }
    }

    accumulatedHeight = branchEnd
  }

  const lastBranch = BRANCHES[BRANCHES.length - 1]
  const totalSections = BRANCHES.reduce((sum, b) => sum + b.sections.length, 0)
  return {
    branchIndex: BRANCHES.length - 1,
    branch: lastBranch,
    sectionIndex: lastBranch.sections.length - 1,
    sectionProgress: 0,
    branchProgress: 1,
    globalSectionFloat: totalSections - 1,
    currentSection: lastBranch.sections[lastBranch.sections.length - 1],
    nextSection: lastBranch.sections[lastBranch.sections.length - 1],
  }
}

const BRANCH_SPACING = 800
const BRANCH_POSITIONS = [
  { x: 0, y: 0 },                        // Mission
  { x: 0, y: -BRANCH_SPACING },          // Mechanical
  { x: 0, y: -BRANCH_SPACING * 2 },      // Science
  { x: 0, y: -BRANCH_SPACING * 3 },      // Software
  { x: 0, y: -BRANCH_SPACING * 4 },      // Electrical
]

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

function CameraController({ orbitEnabled }: { orbitEnabled: boolean }) {
  const { camera } = useThree()
  const { scrollRef, headerHeight, windowHeight } = useScrollState()
  const lookAtTarget = useRef(new THREE.Vector3())

  useFrame(() => {
    if (orbitEnabled || !windowHeight) return

    const scroll = scrollRef.current
    const { currentSection, nextSection, sectionProgress, sectionIndex, branchIndex, globalSectionFloat } =
      getBranchAndProgress(scroll, headerHeight, windowHeight)

    debugConfig.currentSection = sectionIndex
    debugConfig.currentBranch = branchIndex

    // Calculate branchY based on global section position
    // Sections: Mission(0,1), Mechanical(2,3,4), Science(5,6,7), Software(8,9,10,11), Electrical(12,13,14)
    let accumulatedSections = 0
    let branchY = BRANCH_POSITIONS[0].y

    for (let i = 0; i < BRANCHES.length; i++) {
      const branchSections = BRANCHES[i].sections.length
      const branchStart = accumulatedSections
      const branchEnd = accumulatedSections + branchSections

      if (globalSectionFloat < branchEnd || i === BRANCHES.length - 1) {
        const currentPos = BRANCH_POSITIONS[i]
        const nextPos = BRANCH_POSITIONS[Math.min(i + 1, BRANCH_POSITIONS.length - 1)]

        // Transition happens in the last section of this branch
        const lastSectionIndex = branchEnd - 1
        if (globalSectionFloat >= lastSectionIndex && i < BRANCHES.length - 1) {
          const transitionProgress = globalSectionFloat - lastSectionIndex
          branchY = lerp(currentPos.y, nextPos.y, transitionProgress)
        } else {
          branchY = currentPos.y
        }
        break
      }

      accumulatedSections += branchSections
    }

    // Interpolate camera within section
    const camX = lerp(currentSection.camera.x, nextSection.camera.x, sectionProgress)
    const camY = lerp(currentSection.camera.y, nextSection.camera.y, sectionProgress)
    const camZ = lerp(currentSection.camera.z, nextSection.camera.z, sectionProgress)

    camera.position.set(camX, camY + branchY, camZ)

    const lookX = lerp(currentSection.lookAt.x, nextSection.lookAt.x, sectionProgress)
    const lookY = lerp(currentSection.lookAt.y, nextSection.lookAt.y, sectionProgress)
    const lookZ = lerp(currentSection.lookAt.z, nextSection.lookAt.z, sectionProgress)

    lookAtTarget.current.set(lookX, lookY + branchY, lookZ)
    camera.lookAt(lookAtTarget.current)
  })

  return null
}

function Rover() {
  const groupRef = useRef<THREE.Group>(null)
  const [robot, setRobot] = useState<THREE.Object3D | null>(null)

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

      setRobot(loadedRobot)
    })
  }, [])

  useFrame(() => {
    if (!groupRef.current || !robotRef) return

    groupRef.current.rotation.y = debugConfig.rover.rotationY
    groupRef.current.scale.setScalar(debugConfig.rover.scale)
  })

  if (!robot) return null

  return (
    <group ref={groupRef} position={[BRANCH_POSITIONS[0].x, BRANCH_POSITIONS[0].y, 0]}>
      <primitive object={robot} />
    </group>
  )
}

function BranchCube({ branchIndex }: { branchIndex: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const pos = BRANCH_POSITIONS[branchIndex]

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += 0.003
    meshRef.current.rotation.x += 0.002
  })

  return (
    <mesh ref={meshRef} position={[pos.x, pos.y + 40, 0]}>
      <boxGeometry args={[60, 60, 60]} />
      <meshBasicMaterial wireframe color="#ffffff" />
    </mesh>
  )
}

function DebugControls({ enabled }: { enabled: boolean }) {
  if (!enabled) return null
  return <OrbitControls makeDefault />
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

function Scene({ orbitEnabled }: { orbitEnabled: boolean }) {
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

      <CameraController orbitEnabled={orbitEnabled} />
      <DebugControls enabled={orbitEnabled} />

      <MarsTerrain />
      <Suspense fallback={null}>
        <Rover />
        <BranchCube branchIndex={1} />
        <BranchCube branchIndex={2} />
        <BranchCube branchIndex={3} />
        <BranchCube branchIndex={4} />
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
  const [orbitEnabled, setOrbitEnabled] = useState(false)
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
    gui.add(debugConfig, 'orbitControls').name('Orbit Controls').onChange((v: boolean) => {
      setOrbitEnabled(v)
    })
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
        pointerEvents: orbitEnabled ? 'auto' : 'none',
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
            <Scene orbitEnabled={orbitEnabled} />
          </Suspense>
        </Canvas>
      </div>
    </>
  )
}
