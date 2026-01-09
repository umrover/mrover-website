import { useRef, useMemo, useEffect, type RefObject } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import type { SatelliteConfig } from './SceneConfig'
import { getScrollState } from './utils'

const WIREFRAME_COLOR = '#0a7acc'
const WIREFRAME_THRESHOLD = 20

interface SatelliteProps {
  config: SatelliteConfig
  sectionIndex: number
  scrollRef: RefObject<number>
  windowHeightRef: RefObject<number>
}

export function Satellite({ config, sectionIndex, scrollRef, windowHeightRef }: SatelliteProps) {
  const wavesRef = useRef<THREE.LineSegments>(null)
  const timeRef = useRef(0)
  const wireframeGroupRef = useRef<THREE.Group>(null)
  const mountTimeRef = useRef(0)

  const gltf = useLoader(GLTFLoader, config.modelPath, (loader) => {
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
    loader.setDRACOLoader(dracoLoader)
  })

  useEffect(() => {
    if (!wireframeGroupRef.current) return

    const group = wireframeGroupRef.current
    while (group.children.length > 0) {
      group.remove(group.children[0])
    }

    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const edgesGeo = new THREE.EdgesGeometry(child.geometry, WIREFRAME_THRESHOLD)
        const edgesMat = new THREE.LineBasicMaterial({
          color: WIREFRAME_COLOR,
          transparent: true,
          opacity: 0.7,
        })
        const edges = new THREE.LineSegments(edgesGeo, edgesMat)

        child.updateWorldMatrix(true, false)
        edges.applyMatrix4(child.matrixWorld)

        group.add(edges)
      }
    })
  }, [gltf])

  const raysPerDirection = 7
  const lineLength = 50
  const travelTime = 1.5
  const scatterRadius = 10

  const upRays = useRef<{ spawnTime: number; offset: THREE.Vector3 }[]>(
    Array.from({ length: raysPerDirection }, () => ({
      spawnTime: -Math.random() * travelTime,
      offset: new THREE.Vector3(
        (Math.random() - 0.5) * scatterRadius * 2,
        0,
        (Math.random() - 0.5) * scatterRadius * 2
      ),
    }))
  )

  const downRays = useRef<{ spawnTime: number; offset: THREE.Vector3 }[]>(
    Array.from({ length: raysPerDirection }, () => ({
      spawnTime: -Math.random() * travelTime,
      offset: new THREE.Vector3(
        (Math.random() - 0.5) * scatterRadius * 2,
        0,
        (Math.random() - 0.5) * scatterRadius * 2
      ),
    }))
  )

  const { wavesGeometry, wavesMaterial } = useMemo(() => {
    const points: number[] = []
    for (let i = 0; i < raysPerDirection * 2; i++) {
      points.push(0, 0, 0, 0, 0, 0)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))

    const mat = new THREE.LineBasicMaterial({
      color: '#00cfff',
      transparent: true,
      opacity: 0.9,
    })

    return { wavesGeometry: geo, wavesMaterial: mat }
  }, [raysPerDirection])

  useFrame((_, delta) => {
    if (!wavesRef.current || !wavesGeometry) return

    const posAttr = wavesGeometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array

    mountTimeRef.current += delta

    const scroll = scrollRef.current ?? 0
    const windowHeight = windowHeightRef.current ?? 800
    const { sectionIndex: currentSection } = getScrollState(scroll, windowHeight)
    const isActive = mountTimeRef.current < 1 || currentSection === sectionIndex

    if (!isActive) {
      for (let i = 0; i < raysPerDirection * 2; i++) {
        posArray[i * 6] = 0
        posArray[i * 6 + 1] = -10000
        posArray[i * 6 + 2] = 0
        posArray[i * 6 + 3] = 0
        posArray[i * 6 + 4] = -10000
        posArray[i * 6 + 5] = 0
      }
      posAttr.needsUpdate = true
      return
    }

    timeRef.current += delta
    const now = timeRef.current

    const satPos = new THREE.Vector3(...config.position)
    const roverPos = new THREE.Vector3(18, 200, 0)

    const totalDist = new THREE.Vector3().subVectors(satPos, roverPos).length()
    const voidRadius = 60
    const voidStart = totalDist - voidRadius

    const upDir = new THREE.Vector3().subVectors(satPos, roverPos).normalize()
    const downDir = new THREE.Vector3().subVectors(roverPos, satPos).normalize()

    for (let i = 0; i < raysPerDirection; i++) {
      const state = upRays.current[i]
      const elapsed = now - state.spawnTime
      const progress = elapsed / travelTime
      const dist = progress * voidStart

      if (progress > 1) {
        state.spawnTime = now + Math.random() * 0.3
        state.offset.set(
          (Math.random() - 0.5) * scatterRadius * 2,
          0,
          (Math.random() - 0.5) * scatterRadius * 2
        )
      }

      if (progress < 0 || progress > 1) {
        posArray[i * 6] = 0
        posArray[i * 6 + 1] = -10000
        posArray[i * 6 + 2] = 0
        posArray[i * 6 + 3] = 0
        posArray[i * 6 + 4] = -10000
        posArray[i * 6 + 5] = 0
      } else {
        const p1 = new THREE.Vector3().copy(roverPos).addScaledVector(upDir, dist).add(state.offset)
        const p2 = new THREE.Vector3().copy(roverPos).addScaledVector(upDir, dist + lineLength).add(state.offset)
        posArray[i * 6] = p1.x
        posArray[i * 6 + 1] = p1.y
        posArray[i * 6 + 2] = p1.z
        posArray[i * 6 + 3] = p2.x
        posArray[i * 6 + 4] = p2.y
        posArray[i * 6 + 5] = p2.z
      }
    }

    for (let i = 0; i < raysPerDirection; i++) {
      const state = downRays.current[i]
      const elapsed = now - state.spawnTime
      const progress = elapsed / travelTime
      const dist = progress * voidStart
      const idx = (raysPerDirection + i) * 6

      if (progress > 1) {
        state.spawnTime = now + Math.random() * 0.3
        state.offset.set(
          (Math.random() - 0.5) * scatterRadius * 2,
          0,
          (Math.random() - 0.5) * scatterRadius * 2
        )
      }

      if (progress < 0 || progress > 1) {
        posArray[idx] = 0
        posArray[idx + 1] = -10000
        posArray[idx + 2] = 0
        posArray[idx + 3] = 0
        posArray[idx + 4] = -10000
        posArray[idx + 5] = 0
      } else {
        const p1 = new THREE.Vector3().copy(satPos).addScaledVector(downDir, dist).add(state.offset)
        const p2 = new THREE.Vector3().copy(satPos).addScaledVector(downDir, dist + lineLength).add(state.offset)
        posArray[idx] = p1.x
        posArray[idx + 1] = p1.y
        posArray[idx + 2] = p1.z
        posArray[idx + 3] = p2.x
        posArray[idx + 4] = p2.y
        posArray[idx + 5] = p2.z
      }
    }

    posAttr.needsUpdate = true
  })

  return (
    <group>
      <group position={config.position} rotation={config.rotation} scale={config.scale}>
        <group ref={wireframeGroupRef} />
      </group>

      {wavesGeometry && wavesMaterial && (
        <lineSegments ref={wavesRef} geometry={wavesGeometry} material={wavesMaterial} />
      )}
    </group>
  )
}
