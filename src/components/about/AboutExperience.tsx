import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import { useRef, Suspense, useCallback, useState, useMemo, type RefObject } from 'react'
import * as THREE from 'three'
import { getAllModels, getAllGLTFModels, ALL_SECTIONS } from './SceneConfig'
import { useScroll } from '../../hooks/use-scroll'
import { getScrollState } from './utils'
import { URDFModel } from './URDFModel'
import { Terrain } from './Terrain'
import { Satellite } from './Satellite'
import { GLTFModel } from './GLTFModel'
import { Stars, Atmosphere, Stage, BranchPlaceholder } from './Environment'
import { CameraController } from './Camera'
import { LoadingOverlay, ProgressIndicator, useIsMobile } from './UI'
import { TeleopDisplay, useTeleopAnimation, type ArmJointValues } from './TeleopDisplay'
import { ESWDisplay } from './ESWDisplay'
import { ScanEffect } from './ScanEffect'
import { DNAParticles } from './DNAParticles'
import { CommSignal } from './CommSignal'
import { PowerPulse } from './PowerPulse'

interface SceneProps {
  isMobile: boolean
  onAllModelsLoaded: () => void
  armAnimationRef: RefObject<ArmJointValues>
  onSectionChange: (section: string) => void
}

function Scene({ isMobile, onAllModelsLoaded, armAnimationRef, onSectionChange }: SceneProps) {
  const { gl, scene, camera } = useThree()
  const models = useMemo(() => getAllModels(), [])
  const gltfModels = useMemo(() => {
    const all = getAllGLTFModels()
    return all.filter(
      (section, idx, arr) =>
        arr.findIndex(
          (s) =>
            s.gltfModel!.modelPath === section.gltfModel!.modelPath &&
            s.gltfModel!.position[1] === section.gltfModel!.position[1]
        ) === idx
    )
  }, [])
  const satellites = useMemo(() => ALL_SECTIONS.filter((s) => s.satellite), [])
  const [loadedCount, setLoadedCount] = useState(0)
  const framesRendered = useRef(0)
  const compiled = useRef(false)
  const scrollRef = useRef(0)
  const windowHeightRef = useRef(typeof window !== 'undefined' ? window.innerHeight : 800)
  const currentSectionRef = useRef('')
  const bottleWireframeColorRef = useRef<string | null>(null)
  const dnaWireframeColorRef = useRef<string | null>(null)
  const dnaColorProgress = useRef(0)
  const dnaSectionName = useMemo(
    () => gltfModels.find((s) => s.gltfModel?.particles?.type === 'dna')?.name ?? '',
    [gltfModels]
  )

  useScroll(useCallback(({ scroll }: { scroll: number }) => {
    scrollRef.current = scroll
    const { fromSection } = getScrollState(scroll, windowHeightRef.current)
    if (currentSectionRef.current !== fromSection.name) {
      currentSectionRef.current = fromSection.name
      onSectionChange(fromSection.name)
    }
  }, [onSectionChange]))

  const allModelsReady = loadedCount === models.length + gltfModels.length

  const handleModelLoaded = useCallback(() => {
    setLoadedCount((c) => c + 1)
  }, [])

  useFrame((_, delta) => {
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

    const isAstrobiology = currentSectionRef.current === dnaSectionName
    const target = isAstrobiology ? 1 : 0
    dnaColorProgress.current += (target - dnaColorProgress.current) * (1 - Math.exp(-4 * delta))
    const p = dnaColorProgress.current
    const r = Math.round(10 + p * (34 - 10))
    const g = Math.round(122 + p * (197 - 122))
    const b = Math.round(204 + p * (94 - 204))
    dnaWireframeColorRef.current = `rgb(${r},${g},${b})`
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
              currentSectionRef={currentSectionRef}
              propellerSpeed={section.model!.propellerSpeed}
              armAnimationRef={section.model!.armAnimation ? armAnimationRef : undefined}
              onLoaded={handleModelLoaded}
            />
            {section.model!.terrain && (
              <Terrain
                position={section.model!.position}
                radius={section.model!.terrain.radius}
                gridSize={section.model!.terrain.gridSize}
                scrollSpeed={section.model!.terrain.scrollSpeed}
                currentSectionRef={currentSectionRef}
              />
            )}
          </group>
        ))}

        <Stage />
        <BranchPlaceholder />

        {satellites.map((section) => {
          const idx = ALL_SECTIONS.findIndex((s) => s.name === section.name)
          return (
            <group key={`satellite-${section.name}`} position={[0, section.camera.y - 80, 0]}>
              <Satellite
                config={section.satellite!}
                sectionIndex={idx}
                scrollRef={scrollRef}
                windowHeightRef={windowHeightRef}
              />
            </group>
          )
        })}

        {gltfModels.map((section) => {
          const cfg = section.gltfModel!
          const colorRef = cfg.scanEffect ? bottleWireframeColorRef
            : cfg.particles?.type === 'dna' ? dnaWireframeColorRef
            : undefined
          return (
            <group key={`gltf-${section.name}`}>
              <GLTFModel
                modelPath={cfg.modelPath}
                position={cfg.position}
                rotation={cfg.rotation}
                scale={cfg.scale}
                wireframe={cfg.wireframe}
                floating={cfg.floating}
                highlightColorRef={colorRef}
                currentSectionRef={cfg.visibleInSection ? currentSectionRef : undefined}
                visibleInSection={cfg.visibleInSection}
                showAxes={cfg.showAxes}
                onLoaded={handleModelLoaded}
              />
              {cfg.scanEffect && (
                <ScanEffect
                  currentSectionRef={currentSectionRef}
                  position={cfg.position}
                  targetSize={cfg.scanEffect.targetSize}
                  wireframeColorRef={bottleWireframeColorRef}
                />
              )}
              {cfg.mirror && (
                <>
                  <GLTFModel
                    modelPath={cfg.modelPath}
                    position={[-cfg.position[0], cfg.position[1], cfg.position[2]]}
                    rotation={cfg.rotation}
                    scale={cfg.scale}
                    wireframe={cfg.wireframe}
                    floating={cfg.floating}
                    highlightColorRef={colorRef}
                    onLoaded={() => {}}
                  />
                </>
              )}
              {cfg.particles && (
                <>
                  <DNAParticles position={cfg.position} colorRef={dnaWireframeColorRef} count={cfg.particles.count} />
                  {cfg.mirror && (
                    <DNAParticles position={[-cfg.position[0], cfg.position[1], cfg.position[2]]} colorRef={dnaWireframeColorRef} count={cfg.particles.count} />
                  )}
                </>
              )}
              {cfg.powerPulse && (
                <PowerPulse origin={cfg.position} count={cfg.powerPulse.count} radius={cfg.powerPulse.radius} color={cfg.powerPulse.color} />
              )}
              {cfg.commSignal && (() => {
                const targetSection = ALL_SECTIONS.find((s) => s.name === cfg.commSignal!.target.section)
                const targetPos = targetSection?.model?.position
                if (!targetPos) return null
                return (
                  <CommSignal
                    from={[cfg.position[0], cfg.position[1] + (cfg.commSignal!.heightOffset ?? 0), cfg.position[2]]}
                    to={[targetPos[0], targetPos[1] + (cfg.commSignal!.target.yOffset ?? 0), targetPos[2]]}
                    sectionIndex={ALL_SECTIONS.findIndex((s) => s.name === section.name)}
                    scrollRef={scrollRef}
                    windowHeightRef={windowHeightRef}
                  />
                )
              })()}
            </group>
          )
        })}
      </Suspense>

      <EffectComposer enableNormalPass={false} multisampling={4}>
        <Vignette darkness={0.4} offset={0.3} />
      </EffectComposer>
    </>
  )
}

export function AboutExperience() {
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [currentSection, setCurrentSection] = useState('')
  const isMobile = useIsMobile()
  const { progress, item } = useProgress()
  const { jointValuesRef, handleJointValuesChange } = useTeleopAnimation()

  const handleAllModelsLoaded = useCallback(() => {
    setModelsLoaded(true)
  }, [])

  const handleSectionChange = useCallback((section: string) => {
    setCurrentSection(section)
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

  const { teleopSections, eswSections } = useMemo(() => ({
    teleopSections: ALL_SECTIONS.filter((s) => s.overlay === 'teleop' || s.overlay === 'esw').map((s) => s.name),
    eswSections: ALL_SECTIONS.filter((s) => s.overlay === 'esw').map((s) => s.name),
  }), [])

  const teleopSectionActive = modelsLoaded && teleopSections.includes(currentSection)
  const teleopVisible = !isMobile && teleopSectionActive
  const eswVisible = !isMobile && modelsLoaded && eswSections.includes(currentSection)

  return (
    <>
      <LoadingOverlay progress={progress} visible={!modelsLoaded} message={loadingMessage} />
      <ProgressIndicator visible={modelsLoaded} isMobile={isMobile} />
      <TeleopDisplay
        visible={teleopVisible}
        animationActive={teleopSectionActive}
        position={eswVisible ? 'left' : 'center'}
        onJointValuesChange={handleJointValuesChange}
      />
      <ESWDisplay visible={eswVisible} jointValuesRef={jointValuesRef} />
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
          camera={{ fov: isMobile ? 65 : 50, near: 0.1, far: 10000, position: [0, 100, 400] }}
          shadows={isMobile ? false : THREE.PCFShadowMap}
          dpr={Math.min(window.devicePixelRatio, isMobile ? 2 : 1.5)}
        >
          <Suspense fallback={null}>
            <Scene
              isMobile={isMobile}
              onAllModelsLoaded={handleAllModelsLoaded}
              armAnimationRef={jointValuesRef}
              onSectionChange={handleSectionChange}
            />
          </Suspense>
        </Canvas>
      </div>
    </>
  )
}
