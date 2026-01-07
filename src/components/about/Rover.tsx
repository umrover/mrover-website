import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import URDFLoader from 'urdf-loader'

const defaultJointValues: Record<string, number> = {
  chassis_to_arm_a: 24.14,
  arm_a_to_arm_b: -0.785,
  arm_b_to_arm_c: 1.91,
  arm_c_to_arm_d: -1,
  arm_d_to_arm_e: -1.57,
  gripper_link: 0,
}

const WIREFRAME_CONFIGS: Record<string, {
  threshold: number
  color: string
  lineOpacity: number
  meshOpacity: number
  overrides?: Record<string, number>
}> = {
  mechanical: {
    threshold: 30,        // Default threshold for this rover
    color: '#00f2ff',     // Cyan neon
    lineOpacity: 0.6,
    meshOpacity: 0.1,     // Ghostly body
    overrides: {
      // tune specific meshes by name here
      // 'wheel_left_mesh': 45, 
      'chassis_1': 16,
      'chassis_3': 16
    }
  }
}

export function Rover({ onLoaded, isWireframe = false, configId }: { onLoaded?: () => void; isWireframe?: boolean; configId?: string }) {
  const [robot, setRobot] = useState<THREE.Object3D | null>(null)

  useEffect(() => {
    const manager = new THREE.LoadingManager()
    const loader = new URDFLoader(manager)
    let loadedRobot: THREE.Object3D | null = null

    // Get config or use defaults
    const config = (configId && WIREFRAME_CONFIGS[configId]) || {
      threshold: 20,
      color: '#00f2ff',
      lineOpacity: 0.6,
      meshOpacity: 0.1
    }

    loader.packages = { mrover: '/urdf' }

    const gltfLoader = new GLTFLoader(manager)
    loader.loadMeshCb = (path, _manager, onComplete) => {
      gltfLoader.load(path, (gltf) => {
        onComplete(gltf.scene)
      }, undefined, (err) => {
        console.error('Failed to load mesh:', path, err)
      })
    }

    loader.load('/urdf/rover/rover.urdf', (result) => {
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

          loadedRobot!.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
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
                console.log(`[Rover] Mesh: "${child.name}" resolved to: "${resolvedName}". Using threshold: ${threshold}`)
                const edgesGeo = new THREE.EdgesGeometry(child.geometry, threshold)
                const edgesMat = new THREE.LineBasicMaterial({ 
                  color: config.color,
                  transparent: true,
                  opacity: config.lineOpacity
                })
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
                        if (mat.map?.image) resolve()
                        else setTimeout(checkLoaded, 50)
                      }
                      checkLoaded()
                    }))
                  }
                }
              }
            }
          })

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
              setRobot(loadedRobot)
              onLoaded?.()
            })
          }
        } else {
          // Keep checking if meshes are still being added
          setTimeout(checkMeshes, 100)
        }
      }

      checkMeshes()
    }
  }, [isWireframe, configId])

  if (!robot) return null

  return (
    <group rotation-y={-Math.PI / 3}>
      <primitive object={robot} />
    </group>
  )
}
