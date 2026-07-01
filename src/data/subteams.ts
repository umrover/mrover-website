export interface WireframeOpts {
  color?: string
  threshold?: number
  lineOpacity?: number
  meshOpacity?: number
  // Per-part edge-angle overrides. A mesh whose link (ancestor node) name contains
  // `match` uses `threshold` instead of the default. Lower threshold => more edges,
  // needed for near-cylindrical parts (wheels) whose facets fall under the default angle.
  overrides?: { match: string; threshold: number }[]
}

export type SceneSpec =
  | { type: 'gltf'; path: string; scale: number; wireframe?: WireframeOpts; rotation?: [number, number, number]; baseY?: number }
  | { type: 'widget'; kind: 'nav' | 'teleop' | 'esw' } // custom animated SVG display
  | { type: 'none' }

export interface Subteam {
  id: string
  name: string
  desc: string
  docsUrl?: string
  scene: SceneSpec
}

export interface Branch {
  id: string
  name: string
  accent: string
  subteams: Subteam[]
}

export const HERO_ROVER: SceneSpec = {
  type: 'gltf',
  path: '/models/rover.glb',
  scale: 0.022,
  wireframe: {
    color: '#0a7acc', threshold: 20, lineOpacity: 0.65, meshOpacity: 0.05,
  },
  rotation: [0, -Math.PI / 4, 0], // rotated 45deg left
}

export const MISSION_STATEMENT =
  "The Michigan Mars Rover Team designs, builds, and tests a Mars rover prototype to compete in the University Rover Challenge. We pride ourselves on being one of the most friendly and professional student-led project teams on campus!"

export const BRANCHES: Branch[] = [
  {
    id: 'mechanical',
    name: 'Mechanical',
    accent: '#FFCB05',
    subteams: [
      {
        id: 'mobility',
        name: 'Mobility',
        desc: 'Develops drive and suspension systems for navigating rough terrain while ensuring reliable driving and protecting onboard equipment from impacts.',
        scene: {
          type: 'gltf',
          path: '/models/suspension.glb',
          scale: 0.032,
          wireframe: {
            color: '#0a7acc', threshold: 20, lineOpacity: 0.7, meshOpacity: 0.06,
          },
        },
      },
      {
        id: 'chassis',
        name: 'Chassis',
        desc: 'Creates a lightweight, strong chassis optimized for subsystem integration, plus gimbal cameras, electrical enclosures, and wire management.',
        scene: {
          type: 'gltf',
          path: '/models/chassis.glb',
          scale: 0.026,
          wireframe: {
            color: '#0a7acc', threshold: 16, lineOpacity: 0.7, meshOpacity: 0.06,
          },
          rotation: [0, -Math.PI / 3, 0],
          baseY: 0.2,
        },
      },
      {
        id: 'robotic-arm',
        name: 'Robotic Arm',
        desc: 'Designs and builds a five degree-of-freedom robotic arm responsible for lifting, opening drawers, pushing buttons, typing, and precise movements.',
        scene: {
          type: 'gltf',
          path: '/models/arm.glb',
          scale: 0.038,
          wireframe: { color: '#0a7acc', threshold: 20, lineOpacity: 0.7, meshOpacity: 0.06 },
        },
      },
    ],
  },
  {
    id: 'science',
    name: 'Science',
    accent: '#4CAF50',
    subteams: [
      {
        id: 'science-payload',
        name: 'Science Payload',
        desc: 'Performs in-situ sampling with on-board science tests, environmental sensors, and external cameras for rock analysis, using a linear actuator-driven auger system.',
        scene: {
          type: 'gltf',
          path: '/models/science_payload.glb',
          scale: 1.9,
          wireframe: { color: '#0a7acc', threshold: 15, lineOpacity: 0.7, meshOpacity: 0.06 },
          rotation: [0, 0.5, 0],
        },
      },
      {
        id: 'astrobiology',
        name: 'Astrobiology',
        desc: 'Develops tests analyzing soil and rock samples for life indicators, researching tests and implementing them on the rover for competition use.',
        scene: {
          type: 'gltf',
          path: '/models/dna.glb',
          scale: 1.3,
          wireframe: { color: '#0a7acc', threshold: 10, lineOpacity: 0.7, meshOpacity: 0.06 },
          rotation: [Math.PI / 2, 0, 0],
        },
      },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    accent: '#CE93D8',
    subteams: [
      {
        id: 'power',
        name: 'Power',
        desc: 'Provides rover power management and distributes electricity to key systems, currently improving custom battery design.',
        scene: {
          type: 'gltf',
          path: '/models/battery.glb',
          scale: 1.3,
          wireframe: { color: '#0a7acc', threshold: 12, lineOpacity: 0.7, meshOpacity: 0.06 },
          rotation: [0, -Math.PI / 4, 0],
        },
      },
      {
        id: 'embedded-hardware',
        name: 'Embedded Hardware',
        desc: 'Designs custom circuit boards for actuator control, sensor signal reception, and data connections between electronics and external components.',
        docsUrl: 'https://docs.mrover.org/esw/',
        scene: {
          type: 'gltf',
          path: '/models/pcb.glb',
          scale: 1.4,
          wireframe: { color: '#0a7acc', threshold: 5, lineOpacity: 0.7, meshOpacity: 0.06 },
          rotation: [-Math.PI / 3, 0, 0],
        },
      },
      {
        id: 'communications',
        name: 'Communications',
        desc: 'Ensures wireless RF communication between base station and rover through equipment testing and selection.',
        scene: {
          type: 'gltf',
          path: '/models/radio_tower.glb',
          scale: 2,
          wireframe: { color: '#0a7acc', threshold: 20, lineOpacity: 0.7, meshOpacity: 0.06 },
          rotation: [0, 0, 0],
          baseY: 0.25,
        },
      },
    ],
  },
  {
    id: 'software',
    name: 'Software',
    accent: '#90CAF9',
    subteams: [
      {
        id: 'perception',
        name: 'Perception',
        desc: 'Identifies environmental features and objects as part of the Autonomy team using camera and sensor data.',
        docsUrl: 'https://docs.mrover.org/autonomy/perception/overview/',
        scene: {
          type: 'gltf',
          path: '/models/nalgene.glb',
          scale: 1.1,
          wireframe: { color: '#0a7acc', threshold: 5, lineOpacity: 0.7, meshOpacity: 0.06 },
          rotation: [-Math.PI / 2, 0, 0],
        },
      },
      {
        id: 'navigation',
        name: 'Navigation',
        desc: 'Uses A* pathfinding to plan obstacle-avoiding routes as part of the Autonomy team.',
        docsUrl: 'https://docs.mrover.org/autonomy/navigation/overview/',
        scene: { type: 'widget', kind: 'nav' },
      },
      {
        id: 'localization',
        name: 'Localization',
        desc: 'Determines rover position and orientation as part of the Autonomy team using sensor fusion and mapping.',
        docsUrl: 'https://docs.mrover.org/autonomy/localization/overview/',
        scene: {
          type: 'gltf',
          path: '/models/satellite.glb',
          scale: 1.3,
          wireframe: { color: '#0a7acc', threshold: 20, lineOpacity: 0.7, meshOpacity: 0.06 },
          rotation: [Math.PI / 4, 0.4, 0],
        },
      },
      {
        id: 'drone',
        name: 'Drone',
        desc: 'Develops manual and autonomous drone capable of reading signs, locating objects, and communications support during delivery missions.',
        docsUrl: 'https://docs.mrover.org/drone/overview/',
        scene: {
          type: 'gltf',
          path: '/models/drone.glb',
          scale: 1.3,
          wireframe: { color: '#0a7acc', threshold: 20, lineOpacity: 0.7, meshOpacity: 0.06 },
          rotation: [-Math.PI * 2 / 5, 0, -Math.PI / 3],
        },
      },
      {
        id: 'teleoperation',
        name: 'Teleoperation',
        desc: 'Builds the base station GUI with mission views, control interfaces for arm and drive systems, 3D visualization, and camera streaming.',
        docsUrl: 'https://docs.mrover.org/teleop/overview/',
        scene: { type: 'widget', kind: 'teleop' },
      },
      {
        id: 'embedded-software',
        name: 'Embedded Software',
        desc: 'Writes low-level driver code abstracting manufacturer libraries in C and Python for other programming teams.',
        docsUrl: 'https://docs.mrover.org/esw/',
        scene: { type: 'widget', kind: 'esw' },
      },
    ],
  },
]
