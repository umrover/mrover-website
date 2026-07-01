import { useRef, useMemo, useEffect, Suspense, Component } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { View, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BRANCHES, HERO_ROVER, MISSION_STATEMENT } from '@/data/subteams'
import type { SceneSpec, WireframeOpts } from '@/data/subteams'

const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

class ErrorBoundary extends Component<{ children: ReactNode }, { errored: boolean }> {
  state = { errored: false }
  static getDerivedStateFromError() { return { errored: true } }
  render() { return this.state.errored ? null : this.props.children }
}

type GltfSpec = Extract<SceneSpec, { type: 'gltf' }>

function Stars({ count = 2000 }: { count?: number }) {
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

function WireframedGLTF({ path, scale, wireframe, baseYaw = 0, baseY = 0 }: {
  path: string
  scale: number
  wireframe: Required<WireframeOpts>
  baseYaw?: number
  baseY?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const edgeRef  = useRef<THREE.Group>(null)
  const fillRef  = useRef<THREE.Group>(null)

  const gltf = useLoader(GLTFLoader, path, (loader) => {
    const draco = new DRACOLoader()
    draco.setDecoderPath(DRACO_PATH)
    ;(loader as GLTFLoader).setDRACOLoader(draco)
  })

  useEffect(() => {
    const edgeG = edgeRef.current
    const fillG = fillRef.current
    if (!edgeG || !fillG) return
    while (edgeG.children.length) edgeG.remove(edgeG.children[0])
    while (fillG.children.length) fillG.remove(fillG.children[0])

    // Shared materials: one line + one fill program for the whole model.
    const lineMat = new THREE.LineBasicMaterial({ color: wireframe.color, transparent: true, opacity: wireframe.lineOpacity })
    const fillMat = new THREE.MeshStandardMaterial({
      color: '#000814', transparent: true, opacity: wireframe.meshOpacity,
      depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    })

    const meshes: THREE.Mesh[] = []
    gltf.scene.traverse((child) => { if (child instanceof THREE.Mesh) meshes.push(child) })

    // EdgesGeometry is expensive; building every mesh in one pass froze the page.
    // Spread the work across frames under a per-frame time budget so the main
    // thread stays responsive and the wireframe fills in progressively.
    let index = 0
    let raf = 0
    const buildChunk = () => {
      const deadline = performance.now() + 8
      while (index < meshes.length && performance.now() < deadline) {
        const child = meshes[index++]
        child.updateWorldMatrix(true, false)
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(child.geometry, thresholdForMesh(child, wireframe)), lineMat)
        edge.applyMatrix4(child.matrixWorld)
        edgeG.add(edge)
        const fill = new THREE.Mesh(child.geometry, fillMat)
        fill.applyMatrix4(child.matrixWorld)
        fillG.add(fill)
      }
      if (index < meshes.length) raf = requestAnimationFrame(buildChunk)
    }
    raf = requestAnimationFrame(buildChunk)
    return () => cancelAnimationFrame(raf)
  }, [gltf, wireframe.color, wireframe.threshold, wireframe.lineOpacity, wireframe.meshOpacity, JSON.stringify(wireframe.overrides)])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    // Showcase idle: bob slightly and sway a few degrees, no full rotation.
    const t = clock.getElapsedTime()
    groupRef.current.position.y = baseY + Math.sin(t * 0.8) * 0.04
    groupRef.current.rotation.y = baseYaw + Math.sin(t * 0.3) * 0.2
  })

  return (
    <group ref={groupRef} scale={scale}>
      <group ref={edgeRef} />
      <group ref={fillRef} />
    </group>
  )
}

function resolveWireframe(spec: GltfSpec): Required<WireframeOpts> {
  return {
    color:       spec.wireframe?.color       ?? '#0a7acc',
    threshold:   spec.wireframe?.threshold   ?? 20,
    lineOpacity: spec.wireframe?.lineOpacity ?? 0.7,
    meshOpacity: spec.wireframe?.meshOpacity ?? 0.06,
    overrides:   spec.wireframe?.overrides   ?? [],
  }
}

// Walk up the node tree; the nearest ancestor link name matching an override
// sets the edge-angle threshold for this mesh, else the default.
function thresholdForMesh(mesh: THREE.Object3D, wireframe: Required<WireframeOpts>): number {
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
    if (!node.name) continue
    const override = wireframe.overrides.find((o) => node!.name.includes(o.match))
    if (override) return override.threshold
  }
  return wireframe.threshold
}

// HUD frame overlaid on each isolated View — accent-tinted border, corner
// brackets, and a monospace readout to sell the "self-contained viewport" feel.
function ViewportFrame({ accent }: { accent: string }) {
  const corners = [
    'top-0 left-0 border-t-2 border-l-2',
    'top-0 right-0 border-t-2 border-r-2',
    'bottom-0 left-0 border-b-2 border-l-2',
    'bottom-0 right-0 border-b-2 border-r-2',
  ]
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute inset-0 border" style={{ borderColor: `${accent}22` }} />
      {corners.map((c) => (
        <div key={c} className={`absolute w-5 h-5 ${c}`} style={{ borderColor: accent }} />
      ))}
    </div>
  )
}

// Scene content for a gltf view (camera + lights + model)
function SubteamScene({ spec }: { spec: GltfSpec }) {
  return (
    <>
      <color attach="background" args={['#0a0808']} />
      <PerspectiveCamera makeDefault fov={45} position={[0, 0, 5]} near={0.01} far={1000} />
      <ambientLight intensity={0.5} color={0xfff8f0} />
      <directionalLight position={[3, 5, 3]} intensity={1.5} color={0xffeedd} />
      <directionalLight position={[-2, 1, -2]} intensity={0.4} color={0x445566} />
      <ErrorBoundary>
        <Suspense fallback={null}>
          <WireframedGLTF
            path={spec.path}
            scale={spec.scale}
            wireframe={resolveWireframe(spec)}
            baseYaw={spec.baseYaw}
            baseY={spec.baseY}
          />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

export function AboutPage() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const anims = Array.from(document.querySelectorAll('[data-fade-in]')).map((el) =>
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
        y: 24, opacity: 0, duration: 0.6, ease: 'power2.out',
      })
    )
    return () => anims.forEach((a) => a.kill())
  }, [])

  const heroSpec = HERO_ROVER as GltfSpec

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pb-16">
        {/*
          View outside Canvas → drei renders this as a plain <div> that
          participates in layout, then paints 3D into it via the shared Canvas below.
        */}
        <View className="w-full max-w-5xl mx-auto h-[45vh] md:h-[55vh]" index={1}>
          <PerspectiveCamera makeDefault fov={50} position={[0, 2, 6]} near={0.01} far={1000} />
          {/* <color attach="background" args={['#0a0808']} /> */}
          {/* <fog attach="fog" args={['#0a0808', 20, 80]} /> */}
          {/* <ambientLight intensity={0.4} /> */}
          {/* <directionalLight position={[3, 5, 3]} intensity={1.5} /> */}
          <Stars count={3000} />
          <ErrorBoundary>
            <Suspense fallback={null}>
              <WireframedGLTF
                path={heroSpec.path}
                scale={heroSpec.scale}
                wireframe={resolveWireframe(heroSpec)}
                baseYaw={heroSpec.baseYaw}
                baseY={heroSpec.baseY}
              />
            </Suspense>
          </ErrorBoundary>
        </View>

        <div className="relative z-10 text-center px-6 mt-4 max-w-3xl mx-auto">
          <h1
            className="font-display text-white uppercase leading-none tracking-[0.02em] select-none m-0 about-hero-title"
            style={{ fontSize: 'clamp(3rem, 10vw, 7rem)' }}
          >
            The Team
          </h1>
          <p className="text-white/65 text-base md:text-lg leading-relaxed mt-6 about-hero-sub">
            {MISSION_STATEMENT}
          </p>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 about-hero-sub" style={{ animationDelay: '0.8s' }}>
          <div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent mx-auto" />
        </div>
      </section>

      {/* ── BRANCHES ─────────────────────────────────────────── */}
      <main id="main-content">
        {BRANCHES.map((branch) => (
          <section key={branch.id} className="relative py-20 md:py-28">
            <div
              className="absolute top-0 inset-x-0 h-px"
              style={{ background: `linear-gradient(to right, transparent, ${branch.accent}50, transparent)` }}
            />

            <div className="max-w-6xl mx-auto px-6 md:px-12 mb-14 md:mb-20" data-fade-in>
              <h2
                className="font-orbitron uppercase leading-none m-0"
                style={{ fontSize: 'clamp(2.5rem, 8vw, 5.5rem)', color: branch.accent }}
              >
                {branch.name}
              </h2>
            </div>

            {branch.subteams.map((subteam, subIdx) => {
              const flip   = subIdx % 2 === 1
              const isGltf = subteam.scene.type === 'gltf'
              return (
                <div key={subteam.id} className={`relative z-20 max-w-6xl mx-auto px-6 md:px-12${isGltf ? '' : ' py-8 md:py-10'}`} data-fade-in>
                  <div className={`grid items-center gap-10 md:gap-16 ${isGltf ? 'md:grid-cols-2' : 'max-w-2xl'}`}>
                    <div className={flip && isGltf ? 'md:order-2' : ''}>
                      <h3
                        className="font-display text-2xl md:text-4xl uppercase leading-tight m-0 mb-4"
                        style={{ color: branch.accent }}
                      >
                        {subteam.name}
                      </h3>
                      <p className="text-white/70 text-base md:text-lg leading-relaxed m-0 mb-6">
                        {subteam.desc}
                      </p>
                      {subteam.docsUrl && (
                        <a
                          href={subteam.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold uppercase tracking-widest border transition-colors duration-200"
                          style={{ borderColor: `${branch.accent}60`, color: branch.accent }}
                        >
                          View Docs &rarr;
                        </a>
                      )}
                    </div>

                    {isGltf && (
                      /*
                        HtmlView pattern: View creates the div and tracks itself.
                        The Canvas (below) scissors content into the tracked position.
                        The View fills this framed wrapper; the frame is a DOM overlay.
                      */
                      <div
                        className={`relative w-full z-10${flip ? ' md:order-1' : ''}`}
                        style={{ aspectRatio: '1 / 1' }}
                      >
                        <View className="absolute inset-0" index={subIdx + 2}>
                          <ErrorBoundary><SubteamScene spec={subteam.scene as GltfSpec} /></ErrorBoundary>
                        </View>
                        <ViewportFrame accent={branch.accent} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </section>
        ))}

        <section className="py-24 md:py-32 border-t border-white/10 text-center">
          <div className="max-w-2xl mx-auto px-6" data-fade-in>
            <h2 className="font-display text-4xl md:text-6xl text-white uppercase leading-tight mb-8 m-0">
              Build the Future
            </h2>
            <div className="flex flex-wrap gap-4 justify-center">
              <a href="/join" className="px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-black bg-mrover-accent transition-colors duration-200">
                Join MRover
              </a>
              <a href="/sponsor" className="px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-white border border-white/20 transition-colors duration-200">
                Sponsor Us
              </a>
            </div>
          </div>
        </section>
      </main>

      {/*
        Single shared WebGL context for all Views.
        Views are placed outside this Canvas (HtmlView pattern) — drei uses a
        tunnel to scissor-render each View's scene into the fixed Canvas here.
        One context, zero context-loss errors.
      */}
      <Canvas
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, width: '100vw', height: '100vh' }}
        gl={{ antialias: true, alpha: true }}
        eventSource={typeof document !== 'undefined' ? document.body : undefined}
        eventPrefix="client"
      >
        <View.Port />
      </Canvas>
    </>
  )
}
