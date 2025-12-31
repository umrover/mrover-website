import { useMemo } from 'react'
import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'

export function MarsTerrain() {

  const { positions, indices } = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
    const noise2D = createNoise2D()
    const width = 1000
    const depth = 1000
    const segments = isMobile ? 40 : 60

    const positions = []
    const indices = []

    const pathWidth = 120
    const transitionWidth = 100

    for (let i = 0; i <= segments; i++) {
      const z = (i / segments) * depth - depth / 2
      for (let j = 0; j <= segments; j++) {
        const x = (j / segments) * width - width / 2

        const distFromCenter = Math.abs(x)
        let heightMultiplier = 0

        if (distFromCenter < pathWidth) {
          heightMultiplier = 0
        } else if (distFromCenter < pathWidth + transitionWidth) {
          const t = (distFromCenter - pathWidth) / transitionWidth
          heightMultiplier = t * t * t
        } else {
          heightMultiplier = 1
        }

        const distFromFront = Math.max(0, -z)
        const depthFactor = Math.min(1, distFromFront / 300)
        heightMultiplier *= (0.3 + 0.7 * depthFactor)

        let y = 0
        if (heightMultiplier > 0.01) {
          const baseNoise = noise2D(x * 0.003, z * 0.003) * 80
          const detailNoise = noise2D(x * 0.015, z * 0.015) * 15
          const cliffNoise = Math.pow(Math.abs(noise2D(x * 0.006, z * 0.006)), 0.7) * 60

          y = (baseNoise + detailNoise + cliffNoise) * heightMultiplier
        }

        const pathTilt = noise2D(z * 0.001, 0) * 2 * (1 - heightMultiplier)
        y += pathTilt
        y -= 30

        positions.push(x, y, z)
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i * (segments + 1) + j
        const b = i * (segments + 1) + j + 1
        const c = (i + 1) * (segments + 1) + j + 1
        const d = (i + 1) * (segments + 1) + j

        indices.push(a, b, d)
        indices.push(b, c, d)
      }
    }

    return {
      positions: new Float32Array(positions),
      indices: new Uint16Array(indices)
    }
  }, [])

  return (
    <mesh position={[0, -40, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="index"
          args={[indices, 1]}
        />
      </bufferGeometry>
      <meshBasicMaterial 
        color="#FF8C00" 
        wireframe={true} 
        transparent 
        opacity={0.15} 
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
