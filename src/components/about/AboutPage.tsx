import { useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { View, PerspectiveCamera } from '@react-three/drei'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BRANCHES, HERO_ROVER, MISSION_STATEMENT } from '@/data/subteams'
import { ErrorBoundary } from './ErrorBoundary'
import { ViewportFrame } from './ViewportFrame'
import { Stars } from './scene/Stars'
import { WireframedGLTF } from './scene/WireframedGLTF'
import { SubteamScene } from './scene/SubteamScene'
import { resolveWireframe, type GltfSpec } from './scene/wireframe'

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
