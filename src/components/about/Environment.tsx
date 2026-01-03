import { useRef, useMemo, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useScroll } from '../../hooks/use-scroll'
import { lerp } from '../../lib/maths'
import { ALL_SECTIONS, BRANCH_SPACING } from './SceneConfig'
import { getScrollState } from './utils'

export function Stars({ count = 8000 }) {
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
      pos[i * 3] = r * Math.cos(theta)
      pos[i * 3 + 1] = (Math.random() - 0.4) * height
      pos[i * 3 + 2] = r * Math.sin(theta)

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

export function BranchPlaceholder({ branchIndex }: { branchIndex: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const yOffset = -BRANCH_SPACING * branchIndex

  useFrame(() => {
    if (document.hidden || !meshRef.current) return
    meshRef.current.rotation.y += 0.003
    meshRef.current.rotation.x += 0.002
  })

  // We skip branch 1 (Mechanical) because we are rendering a Wireframe Rover there now
  if (branchIndex === 1) return null

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

export function Atmosphere() {
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

export function Stage() {
  const platformRef = useRef<THREE.Mesh>(null)
  const light1Ref = useRef<THREE.SpotLight>(null)
  const light2Ref = useRef<THREE.SpotLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)
  const scrollRef = useRef(0)
  const windowHeightRef = useRef(0)

  useEffect(() => {
    windowHeightRef.current = window.innerHeight
    const handleResize = () => { windowHeightRef.current = window.innerHeight }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useScroll(useCallback(({ scroll }: { scroll: number }) => {
    scrollRef.current = scroll
  }, []))

  useFrame(() => {
    if (document.hidden || !windowHeightRef.current) return

    const { sectionIndex, sectionProgress } = getScrollState(scrollRef.current, windowHeightRef.current)

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
