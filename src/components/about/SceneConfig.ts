export interface WireframeConfig {
  threshold: number
  color: string
  lineOpacity: number
  meshOpacity: number
  overrides?: Record<string, number>
}

export interface TerrainConfig {
  radius: number
  gridSize: number
  scrollSpeed: number
}

export interface SatelliteConfig {
  modelPath: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
}

export interface GLTFModelConfig {
  modelPath: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  wireframe?: WireframeConfig
  floating?: boolean
  visibleInSection?: string
  showAxes?: boolean
  scanEffect?: { targetSize: [number, number, number] }
  mirror?: { axis: 'x' }
  particles?: { type: 'dna'; count?: number }
  powerPulse?: { count?: number; radius?: number; color?: string }
  commSignal?: { heightOffset?: number; target: { section: string; yOffset?: number } }
}

export interface ModelConfig {
  urdfPath: string
  position: [number, number, number]
  rotation: [number, number, number]
  wireframe?: WireframeConfig
  floating?: boolean
  terrain?: TerrainConfig
  wheelSpeed?: number
  propellerSpeed?: number
  armAnimation?: boolean
}

export interface SectionTarget {
  name: string
  label?: string
  navLabel?: string
  layout?: 'intro' | 'mission'
  description?: string
  subteam?: {
    name: string
    desc: string
    docsUrl?: string
  }
  camera: { x: number; y: number; z: number }
  lookAt: { x: number; y: number; z: number }
  model?: ModelConfig
  satellite?: SatelliteConfig
  gltfModel?: GLTFModelConfig
  overlay?: 'teleop' | 'esw'
}

export interface Branch {
  name: string
  color: string
  accent: string
  sections: SectionTarget[]
}

export const BRANCH_SPACING = 800
export const DEBUG_AXES = false

const BLUEPRINT_COLOR = '#0a7acc'
const BLUEPRINT_LINE_OPACITY = 0.7
const BLUEPRINT_MESH_OPACITY = 0.06
const DEFAULT_THRESHOLD = 20
const WHEEL_THRESHOLD = 90

const WIREFRAME_PRESETS = {
  mechanical: {
    threshold: DEFAULT_THRESHOLD,
    color: BLUEPRINT_COLOR,
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
    overrides: {
      'chassis_1': 16,
      'chassis_3': 16,
      'left_wheel-mesh': WHEEL_THRESHOLD,
      'left_wheel_001-mesh': WHEEL_THRESHOLD,
      'right_wheel-mesh': WHEEL_THRESHOLD,
      'right_wheel_001-mesh': WHEEL_THRESHOLD,
    },
  },
  mobility: {
    threshold: DEFAULT_THRESHOLD,
    color: BLUEPRINT_COLOR,
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
    overrides: {
      'left_wheel-mesh': WHEEL_THRESHOLD,
      'left_wheel_001-mesh': WHEEL_THRESHOLD,
    },
  },
  chassis: {
    threshold: DEFAULT_THRESHOLD,
    color: BLUEPRINT_COLOR,
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
    overrides: {
      chassis_1: 16,
      chassis_3: 16,
    },
  },
  arm: {
    threshold: DEFAULT_THRESHOLD,
    color: BLUEPRINT_COLOR,
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
  },
  science: {
    threshold: 15,
    color: BLUEPRINT_COLOR,
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
  },
  drone: {
    threshold: DEFAULT_THRESHOLD,
    color: BLUEPRINT_COLOR,
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
  },
  pcb: {
    threshold: 5,
    color: BLUEPRINT_COLOR,
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
  },
  flask: {
    threshold: 3,
    color: BLUEPRINT_COLOR,
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
  },
  dna: {
    threshold: 10,
    color: '#22c55e',
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
  },
  battery: {
    threshold: 12,
    color: '#f59e0b',
    lineOpacity: BLUEPRINT_LINE_OPACITY,
    meshOpacity: BLUEPRINT_MESH_OPACITY,
  },
} as const satisfies Record<string, WireframeConfig>

const BRANCH_DEFINITIONS: Branch[] = [
  {
    name: 'Mission',
    color: '#FF8C00',
    accent: '#FFE0B2',
    sections: [
      {
        name: 'mission-intro',
        label: 'The Mission',
        navLabel: 'Title',
        layout: 'intro',
        camera: { x: 0, y: 200, z: 600 },
        lookAt: { x: 0, y: 0, z: 0 },
        model: {
          urdfPath: '/urdf/rover/rover.urdf',
          position: [0, -35, 0],
          rotation: [0, -Math.PI / 3, 0],
        },
      },
      {
        name: 'mission',
        label: 'The Mission',
        navLabel: 'Mission Statement',
        layout: 'mission',
        description:
          "The Michigan Mars Rover Team designs, builds, and tests a Mars rover prototype to compete in the University Rover Challenge. Our interdisciplinary team of students pushes the boundaries of what's possible in student-led space exploration.",
        camera: { x: 0, y: 80, z: 350 },
        lookAt: { x: 0, y: 20, z: 0 },
      },
    ],
  },
  {
    name: 'Mechanical',
    color: '#00274C',
    accent: '#FFCB05',
    sections: [
      {
        name: 'mobility',
        subteam: {
          name: 'Mobility',
          desc: 'Develops drive and suspension systems for navigating rough terrain while ensuring reliable driving and protecting onboard equipment from impacts.',
        },
        camera: { x: -400, y: 60, z: 180 },
        lookAt: { x: -400, y: 30, z: 0 },
        model: {
          urdfPath: '/urdf/rover/left_suspension.urdf',
          position: [-400, 35, 0],
          rotation: [0, -Math.PI / 6, 0],
          wireframe: WIREFRAME_PRESETS.mobility,
          floating: true,
        },
      },
      {
        name: 'chassis',
        subteam: {
          name: 'Chassis',
          desc: 'Creates a lightweight, strong chassis optimized for subsystem integration, plus gimbal cameras, electrical enclosures, and wire management.',
        },
        camera: { x: 400, y: 60, z: 180 },
        lookAt: { x: 400, y: 30, z: 0 },
        model: {
          urdfPath: '/urdf/rover/chassis.urdf',
          position: [400, -35, 0],
          rotation: [0, -Math.PI / 6, 0],
          wireframe: WIREFRAME_PRESETS.chassis,
          floating: true,
        },
      },
      {
        name: 'robotic-arm',
        subteam: {
          name: 'Robotic Arm',
          desc: 'Designs and builds a five degree-of-freedom robotic arm responsible for lifting, opening drawers, pushing buttons, typing, and precise movements.',
        },
        camera: { x: 1200, y: 60, z: 180 },
        lookAt: { x: 1200, y: 30, z: 0 },
        model: {
          urdfPath: '/urdf/rover/arm.urdf',
          position: [1180, 20, 0],
          rotation: [0, -Math.PI / 6, 0],
          wireframe: WIREFRAME_PRESETS.arm,
          floating: true,
        },
      },
    ],
  },
  {
    name: 'Science',
    color: '#4CAF50',
    accent: '#C8E6C9',
    sections: [
      {
        name: 'science-payload',
        subteam: {
          name: 'Science Payload',
          desc: 'Performs in-situ sampling with on-board science tests, environmental sensors, and external cameras for rock analysis, using a linear actuator-driven auger system.',
        },
        camera: { x: 100, y: 50, z: 250 },
        lookAt: { x: -30, y: 20, z: 0 },
        gltfModel: {
          modelPath: '/models/science_payload.glb',
          position: [0, 60, 0],
          rotation: [0, 0, 0],
          scale: 0.4,
          wireframe: WIREFRAME_PRESETS.science,
          floating: false,
          showAxes: true,
        },
      },
      {
        name: 'astrobiology',
        subteam: {
          name: 'Astrobiology',
          desc: 'Develops tests analyzing soil and rock samples for life indicators, researching tests and implementing them on the rover for competition use.',
        },
        camera: { x: 20, y: 15, z: 150 },
        lookAt: { x: 10, y: 25, z: 0 },
        gltfModel: {
          modelPath: '/models/dna.glb',
          position: [30, 28, 45],
          rotation: [Math.PI / 2, 0, 0],
          scale: 0.15,
          wireframe: WIREFRAME_PRESETS.dna,
          mirror: { axis: 'x' },
          particles: { type: 'dna' },
        },
      },
    ],
  },
  {
    name: 'Electrical',
    color: '#9C27B0',
    accent: '#E1BEE7',
    sections: [
      {
        name: 'power',
        subteam: {
          name: 'Power',
          desc: 'Provides rover power management and distributes electricity to key systems, currently improving custom battery design.',
        },
        camera: { x: -400, y: 70, z: 220 },
        lookAt: { x: -400, y: 20, z: 0 },
        model: {
          urdfPath: '/urdf/rover/rover.urdf',
          position: [-400, -35, 0],
          rotation: [0, -Math.PI / 4, 0],
          wireframe: WIREFRAME_PRESETS.mechanical,
        },
        gltfModel: {
          modelPath: '/models/battery.glb',
          position: [-400, 35, 80],
          rotation: [0, -Math.PI / 4, 0],
          scale: 4,
          wireframe: WIREFRAME_PRESETS.battery,
          powerPulse: {},
        },
      },
      {
        name: 'ehw',
        subteam: {
          name: 'Embedded Hardware',
          desc: 'Designs custom circuit boards for actuator control, sensor signal reception, and data connections between electronics and external components.',
          docsUrl: 'https://docs.mrover.org/esw/overview/',
        },
        camera: { x: 400, y: 70, z: 220 },
        lookAt: { x: 400, y: 20, z: 0 },
        gltfModel: {
          modelPath: '/models/pcb.glb',
          position: [350, 40, -20],
          rotation: [-Math.PI / 3, 0, - Math.PI / 2],
          scale: 800,
          wireframe: WIREFRAME_PRESETS.pcb,
          floating: false,
        },
      },
      {
        name: 'comms',
        subteam: {
          name: 'Communications',
          desc: 'Ensures wireless RF communication between base station and rover through equipment testing and selection.',
        },
        camera: { x: -800, y: -740, z: 800 },
        lookAt: { x: 200, y: -800, z: 0 },
        gltfModel: {
          modelPath: '/models/radio_tower.glb',
          position: [-700, -810, 770],
          rotation: [0, 0, 0],
          scale: 1,
          wireframe: WIREFRAME_PRESETS.science,
          floating: false,
          commSignal: { heightOffset: 100, target: { section: 'perception', yOffset: 150 } },
        },
      },
    ],
  },
  {
    name: 'Software',
    color: '#2196F3',
    accent: '#BBDEFB',
    sections: [
      {
        name: 'perception',
        subteam: {
          name: 'Perception',
          desc: 'Identifies environmental features and objects as part of the Autonomy team using camera and sensor data.',
          docsUrl: 'https://docs.mrover.org/perception/overview/',
        },
        camera: { x: -200, y: 60, z: 200 },
        lookAt: { x: 50, y: 0, z: 0 },
        model: {
          urdfPath: '/urdf/rover/rover.urdf',
          position: [0, -35, 0],
          rotation: [0, -Math.PI / 2, 0],
          wireframe: WIREFRAME_PRESETS.mechanical,
          terrain: {
            radius: 400,
            gridSize: 20,
            scrollSpeed: -60,
          },
          wheelSpeed: 3,
          armAnimation: true,
        },
        gltfModel: {
          modelPath: '/models/nalgene.glb',
          position: [0, -30, 100],
          rotation: [0, -Math.PI/2, 0],
          scale: 110,
          wireframe: {
            threshold: 5,
            color: BLUEPRINT_COLOR,
            lineOpacity: BLUEPRINT_LINE_OPACITY,
            meshOpacity: BLUEPRINT_MESH_OPACITY,
          },
          visibleInSection: 'perception',
          scanEffect: { targetSize: [40, 25, 40] },
        },
      },
      {
        name: 'navigation',
        subteam: {
          name: 'Navigation',
          desc: 'Uses A* pathfinding to plan obstacle-avoiding routes as part of the Autonomy team.',
          docsUrl: 'https://docs.mrover.org/navigation/overview/',
        },
        camera: { x: -300, y: 80, z: 280 },
        lookAt: { x: 0, y: 20, z: 0 },
      },
      {
        name: 'localization',
        subteam: {
          name: 'Localization',
          desc: 'Determines rover position and orientation as part of the Autonomy team using sensor fusion and mapping.',
          docsUrl: 'https://docs.mrover.org/localization/overview/',
        },
        camera: { x: 50, y: 20, z: 180 },
        lookAt: { x: 0, y: 250, z: -200 },
        // "Low Poly Satellite" by Rectilon (https://skfb.ly/6TTRr)
        // Licensed under CC BY 4.0 (http://creativecommons.org/licenses/by/4.0/)
        satellite: {
          modelPath: '/models/satellite.glb',
          position: [0, 500, -250],
          rotation: [Math.PI / 2, 0, 0],
          scale: 3,
        },
      },
      {
        name: 'drone',
        subteam: {
          name: 'Drone',
          desc: 'Develops manual and autonomous drone capable of reading signs, locating objects, and communications support during delivery missions.',
          docsUrl: 'https://docs.mrover.org/drone/overview/',
        },
        camera: { x: 400, y: 500, z: 450 },
        lookAt: { x: -100, y: 200, z: 180 },
        model: {
          urdfPath: '/urdf/drone/drone.urdf',
          position: [280, 400, 380],
          rotation: [0, Math.PI/2, 0],
          wireframe: WIREFRAME_PRESETS.drone,
          propellerSpeed: 35,
        },
      },
      {
        name: 'teleop',
        subteam: {
          name: 'Teleoperation',
          desc: 'Builds the base station GUI with mission views, control interfaces for arm and drive systems, 3D visualization, and camera streaming.',
          docsUrl: 'https://docs.mrover.org/teleop/overview/',
        },
        camera: { x: 180, y: 80, z: 280 },
        lookAt: { x: 0, y: 20, z: 0 },
        overlay: 'teleop',
      },
      {
        name: 'esw-controls',
        subteam: {
          name: 'Embedded Software',
          desc: 'Writes low-level driver code abstracting manufacturer libraries in C and Python for other programming teams.',
          docsUrl: 'https://docs.mrover.org/esw/overview/',
        },
        camera: { x: 300, y: 80, z: 280 },
        lookAt: { x: 0, y: 20, z: 0 },
        overlay: 'esw',
      },
    ],
  },
]

function offsetSections(sections: SectionTarget[], yOffset: number): SectionTarget[] {
  return sections.map((s) => ({
    ...s,
    camera: { ...s.camera, y: s.camera.y + yOffset },
    lookAt: { ...s.lookAt, y: s.lookAt.y + yOffset },
    model: s.model
      ? {
          ...s.model,
          position: [s.model.position[0], s.model.position[1] + yOffset, s.model.position[2]] as [
            number,
            number,
            number,
          ],
        }
      : undefined,
    gltfModel: s.gltfModel
      ? {
          ...s.gltfModel,
          position: [
            s.gltfModel.position[0],
            s.gltfModel.position[1] + yOffset,
            s.gltfModel.position[2],
          ] as [number, number, number],
        }
      : undefined,
  }))
}

export const BRANCHES: Branch[] = BRANCH_DEFINITIONS.map((branch, i) => ({
  ...branch,
  sections: offsetSections(branch.sections, -BRANCH_SPACING * i),
}))

export const ALL_SECTIONS = BRANCHES.flatMap((b) => b.sections)
export const TOTAL_SECTIONS = ALL_SECTIONS.length

export function getAllModels(): { section: SectionTarget; branchIndex: number }[] {
  const models: { section: SectionTarget; branchIndex: number }[] = []
  BRANCHES.forEach((branch, branchIndex) => {
    branch.sections.forEach((section) => {
      if (section.model) {
        models.push({ section, branchIndex })
      }
    })
  })
  return models
}

export function getAllGLTFModels(): SectionTarget[] {
  return ALL_SECTIONS.filter((s) => s.gltfModel)
}

export function getBranchesWithModels(): number[] {
  const branches = new Set<number>()
  BRANCHES.forEach((branch, branchIndex) => {
    if (branch.sections.some((s) => s.model || s.gltfModel)) {
      branches.add(branchIndex)
    }
  })
  return Array.from(branches)
}
