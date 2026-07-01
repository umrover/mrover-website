import { Suspense } from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { ErrorBoundary } from '../ErrorBoundary'
import { WireframedGLTF } from './WireframedGLTF'
import { resolveWireframe, type GltfSpec } from './wireframe'

// Scene content for one subteam's gltf View (camera + lights + model).
export function SubteamScene({ spec }: { spec: GltfSpec }) {
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
