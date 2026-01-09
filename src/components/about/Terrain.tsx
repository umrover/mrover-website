import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface TerrainProps {
  position: [number, number, number]
  radius?: number
  gridSize?: number
  scrollSpeed?: number
  roughness?: number
  color?: string
}

export function Terrain({
  position,
  radius = 150,
  gridSize = 20,
  scrollSpeed = 60,
  roughness = 4,
  color = '#0a7acc',
}: TerrainProps) {
  const linesRef = useRef<THREE.LineSegments>(null)
  const scrollOffset = useRef(0)

  const { geometry, material, centerZ } = useMemo(() => {
    const points: number[] = []
    const alphas: number[] = []
    const step = gridSize
    const extent = radius * 1.2

    for (let x = -extent; x <= extent; x += step) {
      for (let z = -extent; z <= extent; z += step) {
        const y = simplex2D(x * 0.03, z * 0.03) * roughness
        const dist = Math.sqrt(x * x + z * z)
        const alpha = Math.max(0, 1 - dist / radius)

        const nextZ = z + step
        const nextY = simplex2D(x * 0.03, nextZ * 0.03) * roughness
        const nextDist = Math.sqrt(x * x + nextZ * nextZ)
        const nextAlpha = Math.max(0, 1 - nextDist / radius)
        points.push(x, y, z, x, nextY, nextZ)
        alphas.push(alpha, nextAlpha)

        const nextX = x + step
        const nextYx = simplex2D(nextX * 0.03, z * 0.03) * roughness
        const nextDistX = Math.sqrt(nextX * nextX + z * z)
        const nextAlphaX = Math.max(0, 1 - nextDistX / radius)
        points.push(x, y, z, nextX, nextYx, z)
        alphas.push(alpha, nextAlphaX)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    geo.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1))

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uScrollZ: { value: 0 },
        uRadius: { value: radius },
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        varying vec3 vWorldPos;
        uniform float uScrollZ;
        void main() {
          vec3 pos = position;
          pos.z = mod(pos.z + uScrollZ + ${extent.toFixed(1)}, ${(extent * 2).toFixed(1)}) - ${extent.toFixed(1)};
          vWorldPos = pos;
          float dist = length(pos.xz);
          vAlpha = max(0.0, 1.0 - dist / ${radius.toFixed(1)});
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          if (vAlpha <= 0.0) discard;
          gl_FragColor = vec4(uColor, vAlpha * 0.6);
        }
      `,
    })

    return { geometry: geo, material: mat, centerZ: 0 }
  }, [radius, gridSize, roughness, color])

  useFrame((_, delta) => {
    if (linesRef.current) {
      scrollOffset.current += delta * scrollSpeed
      ;(material as THREE.ShaderMaterial).uniforms.uScrollZ.value = scrollOffset.current
    }
  })

  return (
    <group position={[position[0], position[1], position[2]]}>
      <lineSegments ref={linesRef} geometry={geometry} material={material} />
    </group>
  )
}

function simplex2D(x: number, y: number): number {
  const F2 = 0.5 * (Math.sqrt(3) - 1)
  const G2 = (3 - Math.sqrt(3)) / 6

  const s = (x + y) * F2
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)

  const t = (i + j) * G2
  const X0 = i - t
  const Y0 = j - t
  const x0 = x - X0
  const y0 = y - Y0

  const i1 = x0 > y0 ? 1 : 0
  const j1 = x0 > y0 ? 0 : 1

  const x1 = x0 - i1 + G2
  const y1 = y0 - j1 + G2
  const x2 = x0 - 1 + 2 * G2
  const y2 = y0 - 1 + 2 * G2

  const ii = i & 255
  const jj = j & 255

  const gi0 = perm[ii + perm[jj]] % 12
  const gi1 = perm[ii + i1 + perm[jj + j1]] % 12
  const gi2 = perm[ii + 1 + perm[jj + 1]] % 12

  let t0 = 0.5 - x0 * x0 - y0 * y0
  let n0 = t0 < 0 ? 0 : Math.pow(t0, 4) * dot(grad3[gi0], x0, y0)

  let t1 = 0.5 - x1 * x1 - y1 * y1
  let n1 = t1 < 0 ? 0 : Math.pow(t1, 4) * dot(grad3[gi1], x1, y1)

  let t2 = 0.5 - x2 * x2 - y2 * y2
  let n2 = t2 < 0 ? 0 : Math.pow(t2, 4) * dot(grad3[gi2], x2, y2)

  return 70 * (n0 + n1 + n2)
}

function dot(g: number[], x: number, y: number): number {
  return g[0] * x + g[1] * y
}

const grad3 = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0, 1],
  [0, -1],
]

const perm = new Array(512)
const p = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142,
  8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203,
  117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165,
  71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92,
  41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208,
  89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217,
  226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58,
  17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155,
  167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218,
  246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249,
  14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4,
  150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156,
  180,
]
for (let i = 0; i < 256; i++) {
  perm[i] = p[i]
  perm[256 + i] = p[i]
}
