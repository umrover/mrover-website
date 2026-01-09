import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import { useRef, Suspense, useCallback, useState, useMemo } from 'react'
import * as THREE from 'three'
import { getAllModels } from './SceneConfig'
import { URDFModel } from './URDFModel'
import { Terrain } from './Terrain'
import { Stars, Atmosphere, Stage, BranchPlaceholder } from './Environment'
import { CameraController } from './Camera'
import { LoadingOverlay, ProgressIndicator, useIsMobile } from './UI'

function Scene({ isMobile, onAllModelsLoaded }: { isMobile: boolean; onAllModelsLoaded: () => void }) {
  const { gl, scene, camera } = useThree()
  const models = useMemo(() => getAllModels(), [])
  const [loadedCount, setLoadedCount] = useState(0)
  const framesRendered = useRef(0)
  const compiled = useRef(false)

  const allModelsReady = loadedCount === models.length

  const handleModelLoaded = useCallback(() => {
    setLoadedCount((c) => c + 1)
  }, [])

  useFrame(() => {
    if (allModelsReady) {
      if (!compiled.current) {
        gl.compile(scene, camera)
        compiled.current = true
      }

      framesRendered.current++
      if (framesRendered.current > 15) {
        onAllModelsLoaded()
      }
    }
  })

  return (
    <>
      <Atmosphere />
      <Stars count={isMobile ? 2000 : 3000} />
      <ambientLight intensity={0.4} color={0xfff8f0} />

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
        {models.map(({ section }) => (
          <group key={section.name}>
            <URDFModel
              urdfPath={section.model!.urdfPath}
              position={section.model!.position}
              rotation={section.model!.rotation}
              wireframe={section.model!.wireframe}
              floating={section.model!.floating}
              wheelSpeed={section.model!.wheelSpeed}
              onLoaded={handleModelLoaded}
            />
            {section.model!.terrain && (
              <Terrain
                position={section.model!.position}
                radius={section.model!.terrain.radius}
                gridSize={section.model!.terrain.gridSize}
                scrollSpeed={section.model!.terrain.scrollSpeed}
                roughness={section.model!.terrain.roughness}
              />
            )}
          </group>
        ))}

        <Stage />
        <BranchPlaceholder />
      </Suspense>

      <EffectComposer enableNormalPass={false} multisampling={4}>
        <Vignette darkness={0.4} offset={0.3} />
      </EffectComposer>
    </>
  )
}

export function AboutExperience() {
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const isMobile = useIsMobile()
  const { progress, item } = useProgress()

  const handleAllModelsLoaded = useCallback(() => {
    setModelsLoaded(true)
  }, [])

  let loadingMessage = item
  if (item) {
    if (item.includes('http') || item.includes('github') || item.includes('polyhaven')) {
      loadingMessage = 'Loading Environment...'
    } else {
      const parts = item.split('/')
      loadingMessage = `Loading ${parts[parts.length - 1]}...`
    }
  }

  return (
    <>
      <LoadingOverlay progress={progress} visible={!modelsLoaded} message={loadingMessage} />
      <ProgressIndicator visible={modelsLoaded} isMobile={isMobile} />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: modelsLoaded ? 1 : 0,
          transition: 'opacity 1s ease',
        }}
      >
        <Canvas
          gl={{
            antialias: !isMobile,
            alpha: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.5,
            powerPreference: 'high-performance',
          }}
          camera={{ fov: 50, near: 0.1, far: 10000, position: [0, 100, 400] }}
          shadows={!isMobile}
          dpr={Math.min(window.devicePixelRatio, isMobile ? 2 : 1.5)}
        >
          <Suspense fallback={null}>
            <Scene isMobile={isMobile} onAllModelsLoaded={handleAllModelsLoaded} />
          </Suspense>
        </Canvas>
      </div>
    </>
  )
}
