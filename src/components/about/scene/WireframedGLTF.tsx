import { useRef, useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import type { WireframeOpts } from '@/data/subteams'
import { thresholdForMesh } from './wireframe'

const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

// Loads a GLB and renders it as a wireframe (edge lines over a faint fill),
// with a gentle showcase idle animation. `rotation` sets the resting orientation;
// on top of it the model bobs vertically and sways about the world vertical axis
// (a turntable wobble that reads the same regardless of the resting tilt).
export function WireframedGLTF({ path, scale, wireframe, rotation = [0, 0, 0], baseY = 0 }: {
  path: string
  scale: number
  wireframe: Required<WireframeOpts>
  rotation?: [number, number, number]
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
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.2 // turntable sway about world vertical
  })

  return (
    <group ref={groupRef} scale={scale}>
      {/* Inner group holds the static resting orientation; the outer group sways. */}
      <group rotation={rotation}>
        <group ref={edgeRef} />
        <group ref={fillRef} />
      </group>
    </group>
  )
}
