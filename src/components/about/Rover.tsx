import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import URDFLoader from 'urdf-loader'

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

const defaultJointValues: Record<string, number> = {
  chassis_to_arm_a: 24.14,
  arm_a_to_arm_b: -0.785,
  arm_b_to_arm_c: 1.91,
  arm_c_to_arm_d: -1,
  arm_d_to_arm_e: -1.57,
  gripper_link: 0,
}

const BLUEPRINT_COLOR = '#0a5f7a'
const BLUEPRINT_LINE_OPACITY = 0.7
const BLUEPRINT_MESH_OPACITY = 0.06
const DEFAULT_THRESHOLD = 20
const WHEEL_THRESHOLD = 60

const WIREFRAME_CONFIGS: Record<string, {
  threshold: number
  color: string
  lineOpacity: number
  meshOpacity: number
  overrides?: Record<string, number>
}> = {
  mechanical: {
    threshold: DEFAULT_THRESHOLD,
    color: BLUEPRINT_COLOR,
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
    overrides: {
      'chassis_1': 16,
      'chassis_3': 16,
      'front_left_wheel_link': WHEEL_THRESHOLD,
      'center_left_wheel_link': WHEEL_THRESHOLD,
      'back_left_wheel_link': WHEEL_THRESHOLD,
      'front_right_wheel_link': WHEEL_THRESHOLD,
      'center_right_wheel_link': WHEEL_THRESHOLD,
      'back_right_wheel_link': WHEEL_THRESHOLD
    }
  },
  mobility: {
    threshold: DEFAULT_THRESHOLD,
    color: BLUEPRINT_COLOR,
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
    overrides: {
      'front_left_wheel_link': WHEEL_THRESHOLD,
      'center_left_wheel_link': WHEEL_THRESHOLD,
      'back_left_wheel_link': WHEEL_THRESHOLD
    }
  },
  chassis: {
    threshold: DEFAULT_THRESHOLD,
    color: BLUEPRINT_COLOR,
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
    overrides: {
      'chassis_1': 16,
      'chassis_3': 16
    }
  },
  arm: {
    threshold: DEFAULT_THRESHOLD,
    color: BLUEPRINT_COLOR,
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY
  }
}

export function Rover({
  onLoaded,
  isWireframe = false,
  configId,
  urdfPath = '/urdf/rover/rover.urdf',
  rotation = [0, -Math.PI / 3, 0],
  showAxes = false
}: {
  onLoaded?: () => void
  isWireframe?: boolean
  configId?: string
  urdfPath?: string
  rotation?: [number, number, number]
  showAxes?: boolean
}) {
  const [robot, setRobot] = useState<THREE.Object3D | null>(null)

  useEffect(() => {
    const manager = new THREE.LoadingManager()
    const loader = new URDFLoader(manager)
    let loadedRobot: THREE.Object3D | null = null
    const timeoutIds: number[] = []
    const edgesResources: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = []
    let isMounted = true

    // Get config or use defaults
    const config = (configId && WIREFRAME_CONFIGS[configId]) || {
      threshold: 20,
      color: '#00f2ff',
      lineOpacity: 0.6,
      meshOpacity: 0.1
    }

    loader.packages = { mrover: '/urdf' }

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
    const gltfLoader = new GLTFLoader(manager)
    gltfLoader.setDRACOLoader(dracoLoader)
    ;(loader as any).loadMeshCb = (path: string, _manager: THREE.LoadingManager, onComplete: (obj: THREE.Object3D) => void) => {
      gltfLoader.load(path, (gltf) => {
        onComplete(gltf.scene)
      }, undefined, (err) => {
        console.error('Failed to load mesh:', path, err)
      })
    }

    loader.load(urdfPath, (result) => {
      loadedRobot = result
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

        // Wait for the mesh count to stabilize for 3 consecutive checks (approx 300ms)
        if (stableCount >= 3) {
          loadedRobot!.rotation.x = -Math.PI / 2
          const texturePromises: Promise<void>[] = []

          // Collect all meshes first
          const meshes: THREE.Mesh[] = []
          loadedRobot!.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) meshes.push(child)
          })

          const processMesh = (child: THREE.Mesh) => {
            if (!isMounted) return

            // Resolve the most meaningful name (either mesh name or URDF link name)
            let resolvedName = child.name
            let p: THREE.Object3D | null = child.parent
            while (p && p !== loadedRobot && (!resolvedName || resolvedName === '')) {
              if (p.name) resolvedName = p.name
              p = p.parent
            }

            if (isWireframe) {
              child.castShadow = false
              child.receiveShadow = false

              // 1. Base Material
              child.material = new THREE.MeshStandardMaterial({
                color: '#000814',
                transparent: true,
                opacity: config.meshOpacity,
                metalness: 0.8,
                roughness: 0.2,
                depthWrite: false,
                side: THREE.DoubleSide
              })

              // 2. Edges
              const threshold = config.overrides?.[resolvedName] ?? config.threshold
              const edgesGeo = new THREE.EdgesGeometry(child.geometry, threshold)
              const edgesMat = new THREE.LineBasicMaterial({
                color: config.color,
                transparent: true,
                opacity: config.lineOpacity
              })
              edgesResources.push({ geometry: edgesGeo, material: edgesMat })
              const edges = new THREE.LineSegments(edgesGeo, edgesMat)
              child.add(edges)
            } else {
              // Standard PBR Look
              child.castShadow = true
              child.receiveShadow = true
              const mat = child.material as THREE.MeshStandardMaterial
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.roughness = Math.min(mat.roughness, 0.7)
                if (mat.map && !mat.map.image) {
                  texturePromises.push(new Promise<void>((resolve) => {
                    const checkLoaded = () => {
                      if (!isMounted) return resolve()
                      if (mat.map?.image) resolve()
                      else timeoutIds.push(window.setTimeout(checkLoaded, 50))
                    }
                    checkLoaded()
                  }))
                }
              }
            }
          }

          const finishProcessing = () => {
            if (!isMounted) return

            const robotWithJoints = loadedRobot as THREE.Object3D & { setJointValue?: (name: string, value: number) => void }
            if (robotWithJoints.setJointValue) {
              for (const [joint, value] of Object.entries(defaultJointValues)) {
                robotWithJoints.setJointValue(joint, value)
              }
            }

            if (isWireframe) {
              setRobot(loadedRobot)
              onLoaded?.()
            } else {
              Promise.all(texturePromises).then(() => {
                if (isMounted) {
                  setRobot(loadedRobot)
                  onLoaded?.()
                }
              })
            }
          }

          // Process meshes in chunks to avoid blocking main thread
          processInChunks(meshes, processMesh, 3, finishProcessing)
        } else {
          // Keep checking if meshes are still being added
          timeoutIds.push(window.setTimeout(checkMeshes, 100))
        }
      }

      checkMeshes()
    }

    return () => {
      isMounted = false
      timeoutIds.forEach(id => clearTimeout(id))
      edgesResources.forEach(({ geometry, material }) => {
        geometry.dispose()
        material.dispose()
      })
    }
  }, [isWireframe, configId, urdfPath])

  if (!robot) return null

  return (
    <group rotation={rotation}>
      <primitive object={robot} />
      {showAxes && <axesHelper args={[100]} />}
    </group>
  )
}
