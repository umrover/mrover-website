import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import { useRef, useMemo, Suspense, useState, useEffect } from 'react'
import * as THREE from 'three'

function Stars({ count = 1500 }) {
  const ref = useRef<THREE.Points>(null)

  const [positions, sizes, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const sizeArr = new Float32Array(count)
    const colorArr = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100
      pos[i * 3 + 1] = (Math.random() - 0.5) * 100
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 10

      sizeArr[i] = Math.random() * 0.08 + 0.02

      const brightness = 0.6 + Math.random() * 0.4
      const tint = Math.random()
      if (tint < 0.1) {
        colorArr[i * 3] = brightness
        colorArr[i * 3 + 1] = brightness * 0.8
        colorArr[i * 3 + 2] = brightness * 0.6
      } else if (tint < 0.2) {
        colorArr[i * 3] = brightness * 0.8
        colorArr[i * 3 + 1] = brightness * 0.9
        colorArr[i * 3 + 2] = brightness
      } else {
        colorArr[i * 3] = brightness
        colorArr[i * 3 + 1] = brightness
        colorArr[i * 3 + 2] = brightness
      }
    }
    return [pos, sizeArr, colorArr]
  }, [count])

  useFrame((_, delta) => {
    if (document.hidden || !ref.current) return
    ref.current.rotation.y += delta * 0.02
    ref.current.rotation.x += delta * 0.01
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  )
}

function Atmosphere() {
  return (
    <>
      <color attach="background" args={['#0a0808']} />
      <fog attach="fog" args={['#0a0808', 20, 80]} />
    </>
  )
}

export function StarsBackground() {
  const [isMobile, setIsMobile] = useState(false)
  const [dpr, setDpr] = useState(1)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    setDpr(Math.min(window.devicePixelRatio, 1.5))
  }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: -1,
      background: '#0a0808'
    }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        dpr={dpr}
      >
        <Suspense fallback={null}>
          <Atmosphere />
          <Stars count={isMobile ? 2000 : 5000} />
          <EffectComposer multisampling={0}>
            <Vignette darkness={0.5} offset={0.3} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}
