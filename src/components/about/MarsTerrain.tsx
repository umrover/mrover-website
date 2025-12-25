import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { createNoise2D } from 'simplex-noise'

export function MarsTerrain() {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Generate terrain geometry data
  const { positions, indices } = useMemo(() => {
    const noise2D = createNoise2D()
    const width = 1000
    const depth = 1000
    const segments = 60 // Low poly look
    
    const positions = []
    const indices = []
    
    for (let i = 0; i <= segments; i++) {
      const z = (i / segments) * depth - depth / 2
      for (let j = 0; j <= segments; j++) {
        const x = (j / segments) * width - width / 2
        
        // Combine noise layers for terrain detail
        let y = noise2D(x * 0.002, z * 0.002) * 50
        y += noise2D(x * 0.01, z * 0.01) * 10
        y -= 30 // Lower the terrain slightly
        
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

  useFrame((state) => {
    if (!meshRef.current) return
    // meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.01
  })

  return (
    <mesh ref={meshRef} position={[0, -40, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="index"
          array={indices}
          count={indices.length}
          itemSize={1}
        />
      </bufferGeometry>
      {/* Wireframe Material */}
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
