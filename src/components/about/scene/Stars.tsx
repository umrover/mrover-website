import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Slowly-drifting starfield distributed on a spherical shell.
export function Stars({ count = 2000 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const [positions, sizes, colors] = useMemo<[Float32Array, Float32Array, Float32Array]>(() => {
    const pos = new Float32Array(count * 3)
    const siz = new Float32Array(count)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 5 + Math.pow(Math.random(), 0.5) * 55
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      siz[i] = Math.random() * 0.08 + 0.02
      const b = 0.6 + Math.random() * 0.4
      col[i * 3] = b; col[i * 3 + 1] = b; col[i * 3 + 2] = b
    }
    return [pos, siz, col]
  }, [count])

  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * 0.02
    ref.current.rotation.x += delta * 0.01
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size"     args={[sizes, 1]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} vertexColors transparent opacity={0.9} sizeAttenuation />
    </points>
  )
}
