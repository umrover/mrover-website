import { useEffect, useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import URDFLoader from 'urdf-loader'
import { DEBUG_AXES, type WireframeConfig } from './SceneConfig'

function processInChunks<T>(
  items: T[],
  processItem: (item: T, index: number) => void,
  chunkSize: number,
  onComplete: () => void
) {
  let index = 0
  function processChunk() {
    const end = Math.min(index + chunkSize, items.length)
    for (; index < end; index++) {
      processItem(items[index], index)
    }
    if (index < items.length) {
      requestAnimationFrame(processChunk)
    } else {
      onComplete()
    }
  }
  if (items.length > 0) {
    requestAnimationFrame(processChunk)
  } else {
    onComplete()
  }
}

const DEFAULT_JOINT_VALUES: Record<string, number> = {
  chassis_to_arm_a: 24.14,
  arm_a_to_arm_b: -0.785,
  arm_b_to_arm_c: 1.91,
  arm_c_to_arm_d: -1,
  arm_d_to_arm_e: -1.57,
  gripper_link: 0,
}

const DEFAULT_WIREFRAME: WireframeConfig = {
  threshold: 20,
  color: '#00f2ff',
  lineOpacity: 0.6,
  meshOpacity: 0.1,
}

interface URDFModelProps {
  urdfPath: string
  position: [number, number, number]
  rotation: [number, number, number]
  wireframe?: WireframeConfig
  floating?: boolean
  wheelSpeed?: number
  onLoaded?: () => void
}

type URDFJoint = {
  setJointValue: (value: number) => void
}

type RobotWithJoints = THREE.Object3D & {
  joints?: Record<string, URDFJoint>
}

const WHEEL_JOINTS = [
  'left_bogie_to_front_left_wheel',
  'left_bogie_to_center_left_wheel',
  'left_rocker_to_back_left_wheel',
  'right_bogie_to_front_right_wheel',
  'right_bogie_to_center_right_wheel',
  'right_rocker_to_back_right_wheel',
]

export function URDFModel({
  urdfPath,
  position,
  rotation,
  wireframe,
  floating = false,
  wheelSpeed = 0,
  onLoaded,
}: URDFModelProps) {
  const [robot, setRobot] = useState<THREE.Object3D | null>(null)
  const robotRef = useRef<RobotWithJoints | null>(null)
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    const manager = new THREE.LoadingManager()
    const loader = new URDFLoader(manager)
    let loadedRobot: THREE.Object3D | null = null
    const timeoutIds: number[] = []
    const edgesResources: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = []
    let isMounted = true

    const config = wireframe || DEFAULT_WIREFRAME

    loader.packages = { mrover: '/urdf' }

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
    const gltfLoader = new GLTFLoader(manager)
    gltfLoader.setDRACOLoader(dracoLoader)
    ;(loader as any).loadMeshCb = (
      path: string,
      _manager: THREE.LoadingManager,
      onComplete: (obj: THREE.Object3D) => void
    ) => {
      gltfLoader.load(
        path,
        (gltf) => {
          onComplete(gltf.scene)
        },
        undefined,
        (err) => {
          console.error('Failed to load mesh:', path, err)
        }
      )
    }

    console.log(`[URDFModel] Loading: ${urdfPath}`)
    loader.load(urdfPath, (result) => {
      loadedRobot = result
      console.log(`[URDFModel] Loaded: ${urdfPath}`)
    })

    manager.onLoad = () => {
      if (!loadedRobot) return

      let lastMeshCount = 0
      let stableCount = 0

      const checkMeshes = () => {
        let currentMeshCount = 0
        loadedRobot!.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) currentMeshCount++
        })

        if (currentMeshCount > 0 && currentMeshCount === lastMeshCount) {
          stableCount++
        } else {
          stableCount = 0
          lastMeshCount = currentMeshCount
        }

        if (stableCount >= 3) {
          loadedRobot!.rotation.x = -Math.PI / 2
          const texturePromises: Promise<void>[] = []

          const meshes: THREE.Mesh[] = []
          loadedRobot!.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) meshes.push(child)
          })

          const processMesh = (child: THREE.Mesh) => {
            if (!isMounted) return

            let resolvedName = child.name
            let p: THREE.Object3D | null = child.parent
            while (p && p !== loadedRobot && (!resolvedName || resolvedName === '')) {
              if (p.name) resolvedName = p.name
              p = p.parent
            }

            if (wireframe) {
              child.castShadow = false
              child.receiveShadow = false

              child.material = new THREE.MeshStandardMaterial({
                color: '#000814',
                transparent: true,
                opacity: config.meshOpacity,
                metalness: 0.8,
                roughness: 0.2,
                depthWrite: false,
                side: THREE.DoubleSide,
              })

              const threshold = config.overrides?.[resolvedName] ?? config.threshold
              console.log(`[URDFModel] Part: "${resolvedName}" threshold: ${threshold} (${urdfPath})`)

              if (threshold < 360) {
                const edgesGeo = new THREE.EdgesGeometry(child.geometry, threshold)
                const edgesMat = new THREE.LineBasicMaterial({
                  color: config.color,
                  transparent: true,
                  opacity: config.lineOpacity,
                })
                edgesResources.push({ geometry: edgesGeo, material: edgesMat })
                const edges = new THREE.LineSegments(edgesGeo, edgesMat)
                child.add(edges)
              }
            } else {
              console.log(`[URDFModel] Part: "${resolvedName}" (${urdfPath})`)
              child.castShadow = true
              child.receiveShadow = true
              const mat = child.material as THREE.MeshStandardMaterial
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.roughness = Math.min(mat.roughness, 0.7)
                if (mat.map && !mat.map.image) {
                  texturePromises.push(
                    new Promise<void>((resolve) => {
                      const checkLoaded = () => {
                        if (!isMounted) return resolve()
                        if (mat.map?.image) resolve()
                        else timeoutIds.push(window.setTimeout(checkLoaded, 50))
                      }
                      checkLoaded()
                    })
                  )
                }
              }
            }
          }

          const finishProcessing = () => {
            if (!isMounted) return

            const robotWithJoints = loadedRobot as THREE.Object3D & {
              setJointValue?: (name: string, value: number) => void
            }
            if (robotWithJoints.setJointValue) {
              for (const [joint, value] of Object.entries(DEFAULT_JOINT_VALUES)) {
                robotWithJoints.setJointValue(joint, value)
              }
            }

            if (wireframe) {
              console.log(`[URDFModel] Ready: ${urdfPath}`)
              robotRef.current = loadedRobot as RobotWithJoints
              setRobot(loadedRobot)
              onLoaded?.()
            } else {
              Promise.all(texturePromises).then(() => {
                if (isMounted) {
                  console.log(`[URDFModel] Ready: ${urdfPath}`)
                  robotRef.current = loadedRobot as RobotWithJoints
                  setRobot(loadedRobot)
                  onLoaded?.()
                }
              })
            }
          }

          processInChunks(meshes, processMesh, 3, finishProcessing)
        } else {
          timeoutIds.push(window.setTimeout(checkMeshes, 100))
        }
      }

      checkMeshes()
    }

    return () => {
      isMounted = false
      timeoutIds.forEach((id) => clearTimeout(id))
      edgesResources.forEach(({ geometry, material }) => {
        geometry.dispose()
        material.dispose()
      })
    }
  }, [urdfPath, wireframe])

  useFrame(({ clock }, delta) => {
    if (floating && groupRef.current) {
      const t = clock.getElapsedTime()
      groupRef.current.rotation.y = rotation[1] + Math.sin(t * 0.3) * 0.15
    }

    if (wheelSpeed !== 0 && robotRef.current?.joints) {
      const wheelRotation = clock.getElapsedTime() * wheelSpeed
      for (const jointName of WHEEL_JOINTS) {
        robotRef.current.joints[jointName]?.setJointValue(wheelRotation)
      }
    }
  })

  if (!robot) return null

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={robot} />
      {DEBUG_AXES && <axesHelper args={[100]} />}
    </group>
  )
}
