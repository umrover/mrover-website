#!/usr/bin/env node
// Parses a URDF file and assembles component GLB meshes at their joint positions,
// outputting a single merged GLB with world transforms baked in.
// Shared mesh files (e.g. identical wheels) are deduplicated — mesh data is stored once,
// with multiple nodes referencing the same mesh index.
//
// Usage: bun scripts/merge-urdf.mjs <urdf-file> <output.glb>

import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { weld, simplify, center } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import draco3d from 'draco3dgltf'
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

// Flags may appear anywhere; positionals are the remaining args in order.
const flags = process.argv.slice(2).filter(a => a.startsWith('--'))
const [urdfPath, outputPath, ratioArg, errorArg] = process.argv.slice(2).filter(a => !a.startsWith('--'))
// Center the assembly on its bounding-box origin (so display models sway in
// place). Pass --no-center to keep the model's original world position.
const noCenter = flags.includes('--no-center')
// Target fraction of triangles to keep. These meshes render as small spinning
// wireframes, so heavy decimation is invisible but slashes download + the
// browser-side EdgesGeometry cost that was freezing page load.
const simplifyRatio = Number(ratioArg ?? 0.25)
// Max positional error (fraction of mesh size) the simplifier may introduce.
// Higher = fewer triangles but more shape drift; fine for small wireframes.
const simplifyError = Number(errorArg ?? 0.02)
if (!urdfPath || !outputPath) {
  console.error('Usage: bun scripts/merge-urdf.mjs <urdf-file> <output.glb>')
  process.exit(1)
}

// Default pose applied to actuated joints (radians for revolute, meters/units
// for prismatic). Joints not listed stay at zero. Poses the arm nicely instead
// of leaving it fully extended.
const DEFAULT_JOINT_VALUES = {
  chassis_to_arm_a:     24.14,
  arm_a_to_arm_b:       -0.785,
  arm_b_to_arm_c:        1.91,
  arm_c_to_arm_d:       -1,
  arm_d_to_arm_e:       -1.57,
  arm_e_to_arm_gripper:  0,
}

// --- URDF parsing ---

function parseVec(str, fallback) {
  if (!str) return fallback
  return str.trim().split(/\s+/).map(Number)
}

function parseURDF(xml) {
  const links = new Map()
  const joints = []

  // Normalize self-closing <link .../> tags before matching so the regex works correctly
  const normalized = xml.replace(/<link\b([^>]*)\/>/g, '<link$1></link>')

  for (const m of normalized.matchAll(/<link\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/link>/g)) {
    const meshMatch = m[2].match(/<mesh\s+filename="([^"]+)"/)
    links.set(m[1], meshMatch ? meshMatch[1] : null)
  }

  for (const m of xml.matchAll(/<joint\b([^>]*)>([\s\S]*?)<\/joint>/g)) {
    const head = m[1]
    const body = m[2]
    const parentMatch = body.match(/<parent\s+link="([^"]+)"/)
    const childMatch  = body.match(/<child\s+link="([^"]+)"/)
    const originMatch = body.match(/<origin([^/]*)\/>/)
    const axisMatch   = body.match(/<axis\s+xyz="([^"]+)"/)
    const attrs = originMatch ? originMatch[1] : ''
    const xyzM = attrs.match(/xyz="([^"]+)"/)
    const rpyM = attrs.match(/rpy="([^"]+)"/)
    joints.push({
      name:   head.match(/name="([^"]+)"/)?.[1],
      type:   head.match(/type="([^"]+)"/)?.[1],
      parent: parentMatch?.[1],
      child:  childMatch?.[1],
      xyz:    parseVec(xyzM?.[1], [0, 0, 0]),
      rpy:    parseVec(rpyM?.[1], [0, 0, 0]),
      axis:   parseVec(axisMatch?.[1], [1, 0, 0]), // URDF default joint axis
    })
  }

  return { links, joints }
}

// --- Transform math (URDF RPY = intrinsic XYZ Euler) ---

// quaternion format: [x, y, z, w]
function rpyToQuat(roll, pitch, yaw) {
  const cr = Math.cos(roll / 2),  sr = Math.sin(roll / 2)
  const cp = Math.cos(pitch / 2), sp = Math.sin(pitch / 2)
  const cy = Math.cos(yaw / 2),   sy = Math.sin(yaw / 2)
  return [
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy,
    cr * cp * cy + sr * sp * sy,
  ]
}

function axisAngleToQuat([x, y, z], angle) {
  const len = Math.hypot(x, y, z) || 1
  const s = Math.sin(angle / 2) / len
  return [x * s, y * s, z * s, Math.cos(angle / 2)]
}

function quatMul([ax, ay, az, aw], [bx, by, bz, bw]) {
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ]
}

function rotateVec([qx, qy, qz, qw], [vx, vy, vz]) {
  const tx = 2 * (qy * vz - qz * vy)
  const ty = 2 * (qz * vx - qx * vz)
  const tz = 2 * (qx * vy - qy * vx)
  return [
    vx + qw * tx + qy * tz - qz * ty,
    vy + qw * ty + qz * tx - qx * tz,
    vz + qw * tz + qx * ty - qy * tx,
  ]
}

function computeWorldTransforms(links, joints) {
  const childNames = new Set(joints.map(j => j.child))
  const roots = [...links.keys()].filter(n => !childNames.has(n))
  const worldTransforms = new Map()
  const queue = roots.map(n => ({ name: n, t: [0, 0, 0], q: [0, 0, 0, 1] }))

  while (queue.length > 0) {
    const { name, t, q } = queue.shift()
    worldTransforms.set(name, { t, q })
    for (const j of joints) {
      if (j.parent !== name) continue
      // child frame = parent * origin(xyz, rpy) * joint-motion(axis, value)
      let newQ = quatMul(q, rpyToQuat(...j.rpy))
      const rot = rotateVec(q, j.xyz)
      let newT = [t[0]+rot[0], t[1]+rot[1], t[2]+rot[2]]

      const value = DEFAULT_JOINT_VALUES[j.name]
      if (value) {
        if (j.type === 'revolute' || j.type === 'continuous') {
          newQ = quatMul(newQ, axisAngleToQuat(j.axis, value))
        } else if (j.type === 'prismatic') {
          const d = rotateVec(newQ, [j.axis[0]*value, j.axis[1]*value, j.axis[2]*value])
          newT = [newT[0]+d[0], newT[1]+d[1], newT[2]+d[2]]
        }
      }

      queue.push({ name: j.child, t: newT, q: newQ })
    }
  }

  return worldTransforms
}

// --- GLB chunk reader ---

function readGLB(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  if (view.getUint32(0, true) !== 0x46546C67) throw new Error('Not a valid GLB file')

  let offset = 12
  let json = null
  let binBuf = new Uint8Array(0)

  while (offset < buf.byteLength) {
    const chunkLen  = view.getUint32(offset, true); offset += 4
    const chunkType = view.getUint32(offset, true); offset += 4
    const chunkData = buf.slice(offset, offset + chunkLen); offset += chunkLen

    if (chunkType === 0x4E4F534A) json   = JSON.parse(new TextDecoder().decode(chunkData))
    else if (chunkType === 0x004E4942) binBuf = chunkData
  }

  return { json, binBuf }
}

// --- GLB assembler with mesh deduplication ---
// meshComponents: array of unique mesh files, each with their instances (nodes with transforms)
// { json, binBuf, meshFile, instances: [{linkName, translation, rotation}] }

function buildGLB(meshComponents) {
  let meshOffset     = 0
  let accessorOffset = 0
  let bvOffset       = 0
  let materialOffset = 0
  let textureOffset  = 0
  let imageOffset    = 0
  let samplerOffset  = 0
  let binByteOffset  = 0

  const mergedNodes     = []
  const mergedMeshes    = []
  const mergedAccessors = []
  const mergedBVs       = []
  const mergedMaterials = []
  const mergedTextures  = []
  const mergedImages    = []
  const mergedSamplers  = []
  const mergedSceneNodes = []
  const binChunks       = []
  const usedExtensions     = new Set()
  const requiredExtensions = new Set()

  for (const { json, binBuf, instances } of meshComponents) {
    for (const e of json.extensionsUsed     ?? []) usedExtensions.add(e)
    for (const e of json.extensionsRequired ?? []) requiredExtensions.add(e)
    const nodes     = json.nodes     ?? []
    const meshes    = json.meshes    ?? []
    const accessors = json.accessors ?? []
    const bvs       = json.bufferViews ?? []
    const materials = json.materials ?? []
    const textures  = json.textures  ?? []
    const images    = json.images    ?? []
    const samplers  = json.samplers  ?? []
    const scene     = json.scenes?.[json.scene ?? 0] ?? { nodes: [] }

    // --- Merge buffer-level data (only once per unique mesh file) ---

    for (const bv of bvs) {
      mergedBVs.push({ ...bv, buffer: 0, byteOffset: (bv.byteOffset ?? 0) + binByteOffset })
    }

    for (const acc of accessors) {
      const r = { ...acc }
      if (acc.bufferView !== undefined) r.bufferView = acc.bufferView + bvOffset
      mergedAccessors.push(r)
    }

    for (const mesh of meshes) {
      const prims = mesh.primitives.map(prim => {
        const p = { ...prim, attributes: {} }
        for (const [sem, idx] of Object.entries(prim.attributes)) p.attributes[sem] = idx + accessorOffset
        if (prim.indices  !== undefined) p.indices  = prim.indices  + accessorOffset
        if (prim.material !== undefined) p.material = prim.material + materialOffset
        // Draco stores geometry in its own bufferView, which must be remapped like any other.
        const draco = prim.extensions?.KHR_draco_mesh_compression
        if (draco) {
          p.extensions = { ...prim.extensions, KHR_draco_mesh_compression: { ...draco, bufferView: draco.bufferView + bvOffset } }
        }
        return p
      })
      mergedMeshes.push({ ...mesh, primitives: prims })
    }

    for (const mat of materials) {
      const m = structuredClone(mat)
      const rt = (obj, key) => { if (obj?.[key]?.index !== undefined) obj[key].index += textureOffset }
      rt(m.pbrMetallicRoughness, 'baseColorTexture')
      rt(m.pbrMetallicRoughness, 'metallicRoughnessTexture')
      rt(m, 'normalTexture'); rt(m, 'occlusionTexture'); rt(m, 'emissiveTexture')
      mergedMaterials.push(m)
    }

    for (const tex of textures) {
      const t = { ...tex }
      if (tex.source  !== undefined) t.source  = tex.source  + imageOffset
      if (tex.sampler !== undefined) t.sampler = tex.sampler + samplerOffset
      mergedTextures.push(t)
    }

    for (const img of images) {
      const i = { ...img }
      if (img.bufferView !== undefined) i.bufferView = img.bufferView + bvOffset
      mergedImages.push(i)
    }

    mergedSamplers.push(...samplers)

    // --- Create one instance per usage of this mesh file ---
    // Mesh/accessor/bufferView data is shared (deduplicated), but each instance
    // gets its own copy of the node subtree: a glTF node may have only one parent,
    // so pointing multiple instances at the same child nodes silently drops all but one.
    for (const { linkName, translation, rotation } of instances) {
      const nodeBase = mergedNodes.length
      for (const node of nodes) {
        const n = { ...node }
        if (node.mesh     !== undefined) n.mesh     = node.mesh + meshOffset
        if (node.children)               n.children = node.children.map(c => c + nodeBase)
        mergedNodes.push(n)
      }
      const sceneRoots = scene.nodes.map(ni => ni + nodeBase)

      const instanceNodeIdx = mergedNodes.length
      mergedNodes.push({
        name: linkName,
        translation: translation.map(v => +v.toFixed(6)),
        rotation:    rotation.map(v => +v.toFixed(6)),
        children:    sceneRoots,
      })
      mergedSceneNodes.push(instanceNodeIdx)
    }

    // Pad binary to 4-byte alignment
    const aligned = (binBuf.byteLength + 3) & ~3
    const padded  = new Uint8Array(aligned)
    padded.set(binBuf)
    binChunks.push(padded)
    binByteOffset  += aligned

    meshOffset     += meshes.length
    accessorOffset += accessors.length
    bvOffset       += bvs.length
    materialOffset += materials.length
    textureOffset  += textures.length
    imageOffset    += images.length
    samplerOffset  += samplers.length
  }

  // URDF/ROS is Z-up; glTF is Y-up. Wrap the whole assembly in a root that
  // rotates -90deg about X (Z-up -> Y-up), quaternion [-sin45, 0, 0, cos45].
  const zUpToYUp = mergedNodes.length
  mergedNodes.push({
    name: 'z_up_to_y_up',
    rotation: [-0.70710678, 0, 0, 0.70710678],
    children: mergedSceneNodes,
  })

  const json = {
    asset: { version: '2.0', generator: 'merge-urdf.mjs' },
    scene: 0,
    scenes: [{ nodes: [zUpToYUp] }],
    nodes:     mergedNodes,
    meshes:    mergedMeshes,
    accessors: mergedAccessors,
    bufferViews: mergedBVs,
    buffers: [{ byteLength: binByteOffset }],
  }
  if (mergedMaterials.length) json.materials = mergedMaterials
  if (mergedTextures.length)  json.textures  = mergedTextures
  if (mergedImages.length)    json.images    = mergedImages
  if (mergedSamplers.length)  json.samplers  = mergedSamplers
  if (usedExtensions.size)     json.extensionsUsed     = [...usedExtensions]
  if (requiredExtensions.size) json.extensionsRequired = [...requiredExtensions]

  const totalBin = new Uint8Array(binByteOffset)
  let off = 0
  for (const c of binChunks) { totalBin.set(c, off); off += c.byteLength }

  return { json, binBuf: totalBin }
}

function writeGLB(json, binBuf, outPath) {
  const jsonStr   = JSON.stringify(json)
  const padLen    = (4 - (jsonStr.length % 4)) % 4
  const jsonBytes = new TextEncoder().encode(jsonStr + ' '.repeat(padLen))

  const hasBin   = binBuf.byteLength > 0
  const totalLen = 12 + 8 + jsonBytes.byteLength + (hasBin ? 8 + binBuf.byteLength : 0)
  const out  = new Uint8Array(totalLen)
  const view = new DataView(out.buffer)

  view.setUint32(0, 0x46546C67, true); view.setUint32(4, 2, true); view.setUint32(8, totalLen, true)
  view.setUint32(12, jsonBytes.byteLength, true); view.setUint32(16, 0x4E4F534A, true)
  out.set(jsonBytes, 20)

  if (hasBin) {
    const b = 20 + jsonBytes.byteLength
    view.setUint32(b, binBuf.byteLength, true); view.setUint32(b + 4, 0x004E4942, true)
    out.set(binBuf, b + 8)
  }

  writeFileSync(resolve(outPath), Buffer.from(out.buffer))
}

// --- Main ---

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  })

const urdfDir = dirname(resolve(urdfPath))
const xml     = readFileSync(resolve(urdfPath), 'utf8')
const { links, joints } = parseURDF(xml)
const worldTransforms   = computeWorldTransforms(links, joints)

// Group instances by mesh file for deduplication
const meshFileMap = new Map() // meshFile → [{ linkName, translation, rotation }]

for (const [linkName, meshFile] of links) {
  if (!meshFile) continue
  const wt = worldTransforms.get(linkName)
  if (!wt) { console.warn(`  Warning: no world transform for "${linkName}", skipping`); continue }
  const absPath = resolve(urdfDir, meshFile)
  if (!meshFileMap.has(absPath)) meshFileMap.set(absPath, [])
  meshFileMap.get(absPath).push({ linkName, translation: wt.t, rotation: wt.q })
}

// Load each unique mesh file and decode Draco if needed
const meshComponents = []
for (const [absPath, instances] of meshFileMap) {
  let glb
  try {
    const doc     = await io.read(absPath)
    const binData = await io.writeBinary(doc)
    glb = readGLB(Buffer.from(binData))
  } catch (err) {
    console.warn(`  Warning: could not load ${absPath}: ${err.message}`)
    continue
  }

  const names = instances.map(i => i.linkName).join(', ')
  console.log(`  + ${absPath.split('/').pop()} → [${names}]`)
  meshComponents.push({ ...glb, instances })
}

if (meshComponents.length === 0) {
  console.error('No mesh components found.')
  process.exit(1)
}

const { json, binBuf } = buildGLB(meshComponents)
writeGLB(json, binBuf, outputPath)

// Decimate the merged result. Read back, weld coincident verts so the simplifier
// can collapse shared edges, then reduce triangles. io.write re-applies Draco.
function triCount(doc) {
  let tris = 0
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      const idx = p.getIndices(), pos = p.getAttribute('POSITION')
      tris += (idx ? idx.getCount() : (pos?.getCount() ?? 0)) / 3
    }
  return Math.round(tris)
}

await MeshoptSimplifier.ready
const optDoc = await io.read(outputPath)
const before = triCount(optDoc)
await optDoc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: simplifyRatio, error: simplifyError }),
  ...(noCenter ? [] : [center({ pivot: 'center' })]),
)
const after = triCount(optDoc)
await io.write(outputPath, optDoc)

const { size } = statSync(resolve(outputPath))
const uniqueMeshes = meshComponents.length
const totalInstances = meshComponents.reduce((s, c) => s + c.instances.length, 0)
console.log(`\nWrote ${outputPath} (${(size / 1024).toFixed(0)} KB, ${uniqueMeshes} unique meshes, ${totalInstances} instances)`)
console.log(`  simplified ${before.toLocaleString()} -> ${after.toLocaleString()} tris (ratio ${simplifyRatio})`)
