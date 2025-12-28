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
import { SECTION_TARGETS, TOTAL_SECTIONS } from './SceneConfig'
import { MarsTerrain } from './MarsTerrain'

const debugConfig = {
  orbitControls: false,
  currentSection: 0,
  rover: {
    scale: 1,
    rotationY: -Math.PI/3,
  },
  joints: {} as Record<string, number>,
}

let robotRef: any = null
let guiJointsFolder: GUI | null = null

function CameraController({ orbitEnabled }: { orbitEnabled: boolean }) {
  const { camera } = useThree()
  const scrollRef = useRef(0)
  const headerHeight = useStore((state) => state.headerHeight)
  const [windowHeight, setWindowHeight] = useState(0)
  const lookAtTarget = useRef(new THREE.Vector3())

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

  useFrame(() => {
    if (orbitEnabled || !windowHeight) return

    const scroll = scrollRef.current
    const totalHeight = windowHeight * TOTAL_SECTIONS
    const progress = Math.max(0, (scroll - headerHeight) / (totalHeight - windowHeight))

    const sectionFloat = progress * (TOTAL_SECTIONS - 1)
    const sectionIndex = Math.floor(sectionFloat)
    const sectionProgress = sectionFloat - sectionIndex

    const currentTarget = SECTION_TARGETS[Math.min(sectionIndex, TOTAL_SECTIONS - 1)]
    const nextTarget = SECTION_TARGETS[Math.min(sectionIndex + 1, TOTAL_SECTIONS - 1)]

    debugConfig.currentSection = sectionIndex

    const camX = lerp(currentTarget.camera.x, nextTarget.camera.x, sectionProgress)
    const camY = lerp(currentTarget.camera.y, nextTarget.camera.y, sectionProgress)
    const camZ = lerp(currentTarget.camera.z, nextTarget.camera.z, sectionProgress)

    camera.position.set(camX, camY, camZ)

    lookAtTarget.current.set(
      lerp(currentTarget.lookAt.x, nextTarget.lookAt.x, sectionProgress),
      lerp(currentTarget.lookAt.y, nextTarget.lookAt.y, sectionProgress),
      lerp(currentTarget.lookAt.z, nextTarget.lookAt.z, sectionProgress)
    )
    camera.lookAt(lookAtTarget.current)
  })

  return null
}

function Rover() {
  const groupRef = useRef<THREE.Group>(null)
  const scrollRef = useRef(0)
  const headerHeight = useStore((state) => state.headerHeight)
  const [windowHeight, setWindowHeight] = useState(0)
  const [robot, setRobot] = useState<THREE.Object3D | null>(null)

  useEffect(() => {
    const updateSize = () => setWindowHeight(window.innerHeight)
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

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

  const scrollCallback = useCallback(({ scroll }: { scroll: number }) => {
    scrollRef.current = scroll
  }, [])

  useScroll(scrollCallback)

  useFrame(() => {
    if (!groupRef.current || !windowHeight || !robotRef) return

    const scroll = scrollRef.current
    const totalHeight = windowHeight * TOTAL_SECTIONS
    const progress = Math.max(0, (scroll - headerHeight) / (totalHeight - windowHeight))

    const sectionFloat = progress * (TOTAL_SECTIONS - 1)
    const sectionIndex = Math.floor(sectionFloat)
    const sectionProgress = sectionFloat - sectionIndex

    const currentTarget = SECTION_TARGETS[Math.min(sectionIndex, TOTAL_SECTIONS - 1)]
    const nextTarget = SECTION_TARGETS[Math.min(sectionIndex + 1, TOTAL_SECTIONS - 1)]

    groupRef.current.rotation.y = debugConfig.rover.rotationY
    groupRef.current.scale.setScalar(debugConfig.rover.scale)

    // Animate joints if defined
    if (robotRef.joints) {
      const currentJoints = currentTarget.joints || {}
      const nextJoints = nextTarget.joints || {}
      const allJointNames = new Set([...Object.keys(currentJoints), ...Object.keys(nextJoints)])

      allJointNames.forEach((jointName) => {
        const joint = robotRef.joints[jointName]
        if (joint) {
          const currentVal = currentJoints[jointName] ?? 0
          const nextVal = nextJoints[jointName] ?? 0
          const val = lerp(currentVal, nextVal, sectionProgress)
          joint.setJointValue(val)
        }
      })
    }
  })

  if (!robot) return null

  return (
    <group ref={groupRef}>
      <primitive object={robot} />
    </group>
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
