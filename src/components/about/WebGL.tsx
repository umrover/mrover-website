import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Stars } from '@react-three/drei'
import { useScroll } from '../../hooks/use-scroll'
import { useStore } from '../../lib/store'
import { useRef, Suspense, useCallback, useEffect, useState } from 'react'
import * as THREE from 'three'
import URDFLoader from 'urdf-loader'
import GUI from 'lil-gui'
import { lerp } from '../../lib/maths'

interface SectionTarget {
  name: string
  camera: { x: number; y: number; z: number }
  lookAt: { x: number; y: number; z: number }
  roverRotation: number
  joints?: Record<string, number>
}

const SECTION_TARGETS: SectionTarget[] = [
  // Mechanical - Robotic Arm
  { name: 'robotic-arm', camera: { x: 150, y: 80, z: 200 }, lookAt: { x: 50, y: 40, z: 0 }, roverRotation: -0.5, joints: { arm_a_to_arm_b: -0.4, arm_b_to_arm_c: 1.2, arm_c_to_arm_d: -0.8 } },
  // Mechanical - Mobility
  { name: 'mobility', camera: { x: -100, y: 30, z: 250 }, lookAt: { x: 0, y: -20, z: 0 }, roverRotation: 0.3 },
  // Mechanical - Chassis
  { name: 'chassis', camera: { x: 0, y: 150, z: 300 }, lookAt: { x: 0, y: 0, z: 0 }, roverRotation: 0 },
  // Science-Mechanical - SPI
  { name: 'spi', camera: { x: 80, y: 60, z: 180 }, lookAt: { x: 20, y: 20, z: 0 }, roverRotation: -0.8 },
  // Science-Mechanical - SPA
  { name: 'spa', camera: { x: 100, y: 40, z: 200 }, lookAt: { x: 30, y: 10, z: 0 }, roverRotation: -0.6 },
  // Science - Astrobiology
  { name: 'astrobiology', camera: { x: 60, y: 80, z: 220 }, lookAt: { x: 0, y: 30, z: 0 }, roverRotation: -0.4 },
  // Software - Autonomy
  { name: 'autonomy', camera: { x: 0, y: 120, z: 350 }, lookAt: { x: 0, y: 0, z: 0 }, roverRotation: 0 },
  // Software - ESW
  { name: 'esw', camera: { x: -80, y: 60, z: 200 }, lookAt: { x: 0, y: 20, z: 0 }, roverRotation: 0.5 },
  // Software - Teleop
  { name: 'teleop', camera: { x: 50, y: 100, z: 280 }, lookAt: { x: 0, y: 20, z: 0 }, roverRotation: -0.2 },
  // Software - Drone
  { name: 'drone', camera: { x: 0, y: 180, z: 400 }, lookAt: { x: 0, y: 50, z: 0 }, roverRotation: 0 },
  // Electrical - Power
  { name: 'power', camera: { x: -60, y: 80, z: 220 }, lookAt: { x: 0, y: 30, z: 0 }, roverRotation: 0.6 },
  // Electrical - EHW
  { name: 'ehw', camera: { x: 100, y: 50, z: 180 }, lookAt: { x: 20, y: 20, z: 0 }, roverRotation: -0.7 },
  // Electrical - Comms
  { name: 'comms', camera: { x: 0, y: 100, z: 300 }, lookAt: { x: 0, y: 40, z: 0 }, roverRotation: 0 },
]

const TOTAL_SECTIONS = SECTION_TARGETS.length

const debugConfig = {
  orbitControls: false,
  currentSection: 0,
  landscape: {
    x: -500,
    y: -100,
    z: 200,
    rotationY: -0.87,
    scale: 125,
  },
  rover: {
    scale: 1.5,
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

    const rotationY = lerp(currentTarget.roverRotation, nextTarget.roverRotation, sectionProgress)
    groupRef.current.rotation.y = rotationY
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

function MarsLandscape() {
  const { scene } = useGLTF('/models/mars_landscape_m.glb')
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = true
        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.roughness = 0.9
          child.material.metalness = 0.1
        }
      }
    })
  }, [scene])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(
        debugConfig.landscape.x,
        debugConfig.landscape.y,
        debugConfig.landscape.z
      )
      groupRef.current.rotation.y = debugConfig.landscape.rotationY
      groupRef.current.scale.setScalar(debugConfig.landscape.scale)
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
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
    scene.background = new THREE.Color(0x050508)
    scene.fog = new THREE.FogExp2(0x050508, 0.0003)
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
      <ambientLight intensity={0.8} />
      <directionalLight position={[150, 200, 100]} intensity={2} color={0xfff5e6} castShadow />
      <directionalLight position={[-100, 100, -50]} intensity={0.8} color={0xaabbff} />
      <pointLight position={[50, 80, 50]} intensity={1.5} color={0xffaa77} distance={500} />
      <hemisphereLight args={[0xffeedd, 0x222233, 0.6]} />
      <CameraController orbitEnabled={orbitEnabled} />
      <DebugControls enabled={orbitEnabled} />
      <Suspense fallback={null}>
        <MarsLandscape />
      </Suspense>
      <Suspense fallback={null}>
        <Rover />
      </Suspense>
    </>
  )
}

export function WebGL() {
  const [orbitEnabled, setOrbitEnabled] = useState(false)

  useEffect(() => {
    const gui = new GUI()
    gui.add(debugConfig, 'orbitControls').name('Orbit Controls').onChange((v: boolean) => {
      setOrbitEnabled(v)
    })
    gui.add(debugConfig, 'currentSection').name('Current Section').listen().disable()
    gui.hide()

    const landscape = gui.addFolder('Landscape')
    landscape.add(debugConfig.landscape, 'x', -1000, 1000)
    landscape.add(debugConfig.landscape, 'y', -500, 500)
    landscape.add(debugConfig.landscape, 'z', -1000, 1000)
    landscape.add(debugConfig.landscape, 'rotationY', -Math.PI, Math.PI).name('rotation Y')
    landscape.add(debugConfig.landscape, 'scale', 1, 300)

    const rover = gui.addFolder('Rover')
    rover.add(debugConfig.rover, 'scale', 0.1, 5)

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
    <div style={{ position: 'fixed', inset: 0, pointerEvents: orbitEnabled ? 'auto' : 'none', zIndex: 0 }}>
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
  )
}
