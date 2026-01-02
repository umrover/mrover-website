export interface SectionTarget {
  name: string
  label?: string
  description?: string
  subteam?: {
    name: string
    desc: string
    color: string
    accent: string
    teamName: string
  }
  camera: { x: number; y: number; z: number }
  lookAt: { x: number; y: number; z: number }
}

export interface Branch {
  name: string
  color: string
  accent: string
  sections: SectionTarget[]
}
const SECTION_TARGETS: SectionTarget[] = [
  // Mission Intro
  {
    name: 'mission-intro',
    label: 'The Mission',
    camera: { x: 0, y: 200, z: 600 },
    lookAt: { x: 0, y: 0, z: 0 },
  },
  // Mission
  {
    name: 'mission',
    label: 'The Mission',
    description: "The Michigan Mars Rover Team designs, builds, and tests a Mars rover prototype to compete in the University Rover Challenge. Our interdisciplinary team of students pushes the boundaries of what's possible in student-led space exploration.",
    camera: { x: 0, y: 80, z: 350 },
    lookAt: { x: 0, y: 20, z: 0 },
  },
  // Mechanical - Mobility
  {
    name: 'mobility',
    subteam: {
      teamName: 'Mechanical',
      name: 'Mobility',
      desc: 'Develops drive and suspension systems for navigating rough terrain while ensuring reliable driving and protecting onboard equipment from impacts.',
      color: '#00274C',
      accent: '#FFCB05'
    },
    camera: { x: -100, y: 30, z: 250 },
    lookAt: { x: 0, y: -20, z: 0 },
  },
  // Mechanical - Chassis
  {
    name: 'chassis',
    subteam: {
      teamName: 'Mechanical',
      name: 'Chassis and Mounts',
      desc: 'Creates a lightweight, strong chassis optimized for subsystem integration, plus gimbal cameras, electrical enclosures, and wire management.',
      color: '#00274C',
      accent: '#FFCB05'
    },
    camera: { x: 0, y: 150, z: 300 },
    lookAt: { x: 0, y: 0, z: 0 },
  },
  // Mechanical - Robotic Arm
  {
    name: 'robotic-arm',
    subteam: {
      teamName: 'Mechanical',
      name: 'Robotic Arm',
      desc: 'Designs and builds a five degree-of-freedom robotic arm responsible for lifting, opening drawers, pushing buttons, typing, and precise movements.',
      color: '#00274C',
      accent: '#FFCB05'
    },
    camera: { x: 150, y: 80, z: 200 },
    lookAt: { x: 50, y: 40, z: 0 },
  },
  // Science - Science Payload
  {
    name: 'science-payload',
    subteam: {
      teamName: 'Science',
      name: 'Science Payload',
      desc: 'Performs in-situ sampling with on-board science tests, environmental sensors, and external cameras for rock analysis, using a linear actuator-driven auger system.',
      color: '#4CAF50',
      accent: '#C8E6C9'
    },
    camera: { x: 80, y: 60, z: 180 },
    lookAt: { x: 20, y: 20, z: 0 },
  },
  // Science - Astrobiology
  {
    name: 'astrobiology',
    subteam: {
      teamName: 'Science',
      name: 'Astrobiology',
      desc: 'Develops tests analyzing soil and rock samples for life indicators, researching tests and implementing them on the rover for competition use.',
      color: '#4CAF50',
      accent: '#C8E6C9'
    },
    camera: { x: 60, y: 80, z: 220 },
    lookAt: { x: 0, y: 30, z: 0 },
  },
  // Electrical - Power
  {
    name: 'power',
    subteam: {
      teamName: 'Electrical',
      name: 'Power',
      desc: 'Provides rover power management and distributes electricity to key systems, currently improving custom battery design.',
      color: '#9C27B0',
      accent: '#E1BEE7'
    },
    camera: { x: -60, y: 80, z: 220 },
    lookAt: { x: 0, y: 30, z: 0 },
  },
  // Electrical - EHW
  {
    name: 'ehw',
    subteam: {
      teamName: 'Electrical',
      name: 'Embedded Hardware',
      desc: 'Designs custom circuit boards for actuator control, sensor signal reception, and data connections between electronics and external components.',
      color: '#9C27B0',
      accent: '#E1BEE7'
    },
    camera: { x: 100, y: 50, z: 180 },
    lookAt: { x: 20, y: 20, z: 0 },
  },
  // Electrical - Comms
  {
    name: 'comms',
    subteam: {
      teamName: 'Electrical',
      name: 'Communications',
      desc: 'Ensures wireless RF communication between base station and rover through equipment testing and selection.',
      color: '#9C27B0',
      accent: '#E1BEE7'
    },
    camera: { x: 0, y: 100, z: 300 },
    lookAt: { x: 0, y: 40, z: 0 },
  },
  // Software - Navigation
  {
    name: 'navigation',
    subteam: {
      teamName: 'Software',
      name: 'Navigation',
      desc: 'Uses A* pathfinding to plan obstacle-avoiding routes as part of the Autonomy team.',
      color: '#2196F3',
      accent: '#BBDEFB'
    },
    camera: { x: 0, y: 120, z: 350 },
    lookAt: { x: 0, y: 0, z: 0 },
  },
  // Software - Localization
  {
    name: 'localization',
    subteam: {
      teamName: 'Software',
      name: 'Localization',
      desc: 'Determines rover position and orientation as part of the Autonomy team using sensor fusion and mapping.',
      color: '#2196F3',
      accent: '#BBDEFB'
    },
    camera: { x: -80, y: 60, z: 200 },
    lookAt: { x: 0, y: 20, z: 0 },
  },
  // Software - Perception
  {
    name: 'perception',
    subteam: {
      teamName: 'Software',
      name: 'Perception',
      desc: 'Identifies environmental features and objects as part of the Autonomy team using camera and sensor data.',
      color: '#2196F3',
      accent: '#BBDEFB'
    },
    camera: { x: 50, y: 100, z: 280 },
    lookAt: { x: 0, y: 20, z: 0 },
  },
  // Software - Drone
  {
    name: 'drone',
    subteam: {
      teamName: 'Software',
      name: 'Drone',
      desc: 'Develops manual and autonomous drone capable of reading signs, locating objects, and communications support during delivery missions.',
      color: '#2196F3',
      accent: '#BBDEFB'
    },
    camera: { x: 0, y: 180, z: 400 },
    lookAt: { x: 0, y: 50, z: 0 },
  },
  // Software - ESW Controls
  {
    name: 'esw-controls',
    subteam: {
      teamName: 'Software',
      name: 'Embedded Software',
      desc: 'Writes low-level driver code abstracting manufacturer libraries in C and Python for other programming teams.',
      color: '#2196F3',
      accent: '#BBDEFB'
    },
    camera: { x: -60, y: 80, z: 220 },
    lookAt: { x: 0, y: 30, z: 0 },
  },
  // Software - ESW Telemetry
  {
    name: 'esw-telemetry',
    subteam: {
      teamName: 'Software',
      name: 'ESW Telemetry',
      desc: 'TO BE COMPLETED',
      color: '#2196F3',
      accent: '#BBDEFB'
    },
    camera: { x: 100, y: 50, z: 180 },
    lookAt: { x: 20, y: 20, z: 0 },
  },
  // Software - Teleop
  {
    name: 'teleop',
    subteam: {
      teamName: 'Software',
      name: 'Teleoperation',
      desc: 'Creates driver-rover interfaces through base station GUIs, control solutions for complex systems, and custom build infrastructure.',
      color: '#2196F3',
      accent: '#BBDEFB'
    },
    camera: { x: 80, y: 100, z: 280 },
    lookAt: { x: 0, y: 20, z: 0 },
  },
]

export const BRANCH_SPACING = 800

function offsetSections(sections: SectionTarget[], yOffset: number): SectionTarget[] {
  return sections.map(s => ({
    ...s,
    camera: { ...s.camera, y: s.camera.y + yOffset },
    lookAt: { ...s.lookAt, y: s.lookAt.y + yOffset },
  }))
}

const BRANCH_DEFINITIONS = [
  {
    name: 'Mission',
    color: '#FF8C00',
    accent: '#FFE0B2',
    filter: (s: SectionTarget) => s.name === 'mission-intro' || s.name === 'mission',
  },
  {
    name: 'Mechanical',
    color: '#00274C',
    accent: '#FFCB05',
    filter: (s: SectionTarget) => s.subteam?.teamName === 'Mechanical',
  },
  {
    name: 'Science',
    color: '#4CAF50',
    accent: '#C8E6C9',
    filter: (s: SectionTarget) => s.subteam?.teamName === 'Science',
  },
  {
    name: 'Electrical',
    color: '#9C27B0',
    accent: '#E1BEE7',
    filter: (s: SectionTarget) => s.subteam?.teamName === 'Electrical',
  },
  {
    name: 'Software',
    color: '#2196F3',
    accent: '#BBDEFB',
    filter: (s: SectionTarget) => s.subteam?.teamName === 'Software',
  },
]

export const BRANCHES: Branch[] = BRANCH_DEFINITIONS.map((def, i) => ({
  name: def.name,
  color: def.color,
  accent: def.accent,
  sections: offsetSections(SECTION_TARGETS.filter(def.filter), -BRANCH_SPACING * i),
}))
