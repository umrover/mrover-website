import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Environment, useProgress } from '@react-three/drei'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import { useRef, Suspense, useCallback, useState } from 'react'
import * as THREE from 'three'
import { BRANCHES, BRANCH_SPACING } from './SceneConfig'
import { Rover } from './Rover'
import { Stars, Atmosphere, Stage, BranchPlaceholder } from './Environment'
import { CameraController } from './Camera'
import { LoadingOverlay, ProgressIndicator, useIsMobile } from './UI'

function Scene({ isMobile, onRoverLoad }: { isMobile: boolean; onRoverLoad: () => void }) {
  const { gl, scene, camera } = useThree()
  const [standardReady, setStandardReady] = useState(false)
  const [wireframeReady, setWireframeReady] = useState(false)
  const framesRendered = useRef(0)
  const compiled = useRef(false)

  const roverReady = standardReady && wireframeReady

  useFrame(() => {
    if (roverReady) {
      if (!compiled.current) {
        gl.compile(scene, camera)
        compiled.current = true
      }
      
      framesRendered.current++
      if (framesRendered.current > 15) {
        onRoverLoad()
      }
    }
  })

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
        <group position={[0, -35, 0]}>
          <Rover onLoaded={() => setStandardReady(true)} />
        </group>

        <group position={[0, -35 - BRANCH_SPACING, 0]}>
          <Rover isWireframe configId="mechanical" onLoaded={() => setWireframeReady(true)} />
        </group>

        <Stage />
        {BRANCHES.slice(1).map((_, i) => (
          <BranchPlaceholder key={i + 1} branchIndex={i + 1} />
        ))}
      </Suspense>

      <EffectComposer enableNormalPass={false} multisampling={4}>
        <Vignette darkness={0.4} offset={0.3} />
      </EffectComposer>
    </>
  )
}

export function AboutExperience() {
  const [roverLoaded, setRoverLoaded] = useState(false)
  const isMobile = useIsMobile()
  const { progress, item } = useProgress()

  const handleRoverLoad = useCallback(() => {
    setRoverLoaded(true)
  }, [])

  let loadingMessage = item
  if (item) {
    if (item.includes('http') || item.includes('github') || item.includes('polyhaven')) {
      loadingMessage = 'Loading Environment...'
    } else {
      // Extract just the filename from the path
      const parts = item.split('/')
      loadingMessage = `Loading ${parts[parts.length - 1]}...`
    }
  }

  return (
    <>
      <LoadingOverlay progress={progress} visible={!roverLoaded} message={loadingMessage} />
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