import type * as THREE from 'three'
import type { SceneSpec, WireframeOpts } from '@/data/subteams'

export type GltfSpec = Extract<SceneSpec, { type: 'gltf' }>

// Fill in wireframe defaults so downstream code works with a fully-resolved shape.
export function resolveWireframe(spec: GltfSpec): Required<WireframeOpts> {
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
export function thresholdForMesh(mesh: THREE.Object3D, wireframe: Required<WireframeOpts>): number {
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
    if (!node.name) continue
    const override = wireframe.overrides.find((o) => node!.name.includes(o.match))
    if (override) return override.threshold
  }
  return wireframe.threshold
}
