#!/usr/bin/env node
// Composes the drone display model: body + 4 propellers at the rotor positions,
// mirroring public/urdf/drone/drone.urdf (mesh scale + per-visual origin, which
// the generic merge-urdf pipeline doesn't handle). Output is centered + fit to
// unit size like the other prop models. Propellers are static (no spin).
import { NodeIO, getBounds } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { center, mergeDocuments, unpartition } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
})

const Q90X = [Math.SQRT1_2, 0, 0, Math.SQRT1_2] // rpy 1.5708 0 0
const CORNERS = [[17.8, 17.8, 6], [-17.8, 17.8, 6], [17.8, -17.8, 6], [-17.8, -17.8, 6]]

const drone = await io.read('public/models/drone_body.glb')
const prop  = await io.read('public/models/drone_propeller.glb')
mergeDocuments(drone, prop)

const root = drone.getRoot()
const scenes = root.listScenes()
const bodyScene = scenes[0]
const propScene = scenes[scenes.length - 1]

// Grab the propeller mesh out of the merged-in scene.
let propMesh = null
const findMesh = (n) => { if (n.getMesh()) propMesh = n.getMesh(); n.listChildren().forEach(findMesh) }
propScene.listChildren().forEach(findMesh)
if (!propMesh) throw new Error('propeller mesh not found')

// Body: visual rpy(90deg X) + mesh scale 0.1 (from the URDF <mesh scale> attr).
const bodyX = drone.createNode('bodyX').setRotation(Q90X).setScale([0.1, 0.1, 0.1])
for (const c of [...bodyScene.listChildren()]) { bodyScene.removeChild(c); bodyX.addChild(c) }
bodyScene.addChild(bodyX)

// One propeller instance per rotor, placed in the (unscaled) body-link frame.
for (const [x, y, z] of CORNERS) {
  bodyScene.addChild(drone.createNode('prop').setTranslation([x, y, z]).setRotation(Q90X).setMesh(propMesh))
}

// Drop the leftover propeller scene, then center + fit to 2 units.
for (const s of root.listScenes()) if (s !== bodyScene) s.dispose()
root.setDefaultScene(bodyScene)
await drone.transform(center({ pivot: 'center' }))
const b = getBounds(bodyScene)
const s = 2 / Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2])
const fit = drone.createNode('fit').setScale([s, s, s])
for (const c of [...bodyScene.listChildren()]) { bodyScene.removeChild(c); fit.addChild(c) }
bodyScene.addChild(fit)

await drone.transform(unpartition()) // GLB needs a single buffer
await io.write('public/models/drone.glb', drone)
console.log('Wrote public/models/drone.glb (body + 4 propellers, fit + centered)')
