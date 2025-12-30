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
  // Mission Intro - title only, camera far back
  {
    name: 'mission-intro',
    label: 'The Mission',
    camera: { x: 0, y: 200, z: 600 },
    lookAt: { x: 0, y: 0, z: 0 },
  },
  // The Mission - rover slides in with description
  {
    name: 'mission',
    label: 'The Mission',
    description: "The Michigan Mars Rover Team designs, builds, and tests a Mars rover prototype to compete in the University Rover Challenge. Our interdisciplinary team of students pushes the boundaries of what's possible in student-led space exploration.",
    camera: { x: 0, y: 80, z: 350 },
    lookAt: { x: 0, y: 20, z: 0 },
  },
  {
    name: 'robotic-arm',
    subteam: {
      teamName: 'Mechanical',
      name: 'Robotic Arm',
      desc: 'Designs and builds a five degree-of-freedom robotic arm for Equipment Servicing and Extreme Retrieval missions.',
      color: '#00274C',
      accent: '#FFCB05'
    },
    camera: { x: 150, y: 80, z: 200 },
    lookAt: { x: 50, y: 40, z: 0 },
  },
  // Mechanical - Mobility
  { 
    name: 'mobility', 
    subteam: {
      teamName: 'Mechanical',
      name: 'Mobility',
      desc: 'Develops drive and suspension systems to navigate rocks and rough terrain in each competition mission.',
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
      desc: 'Develops a lightweight and strong chassis optimized for integration of all sub-systems.',
      color: '#00274C',
      accent: '#FFCB05'
    },
    camera: { x: 0, y: 150, z: 300 }, 
    lookAt: { x: 0, y: 0, z: 0 }, 
  },
  // Science-Mechanical - SPI
  { 
    name: 'spi', 
    subteam: {
      teamName: 'Science-Mechanical',
      name: 'Science Payload Instrumentation',
      desc: 'Brings together sensors and tests for in-situ sampling with on-board life-detection tests.',
      color: '#FF6B35',
      accent: '#FFE0D4'
    },
    camera: { x: 80, y: 60, z: 180 }, 
    lookAt: { x: 20, y: 20, z: 0 }, 
  },
  // Science-Mechanical - SPA
  { 
    name: 'spa', 
    subteam: {
      teamName: 'Science-Mechanical',
      name: 'Science Payload Acquisition',
      desc: 'Develops and tests soil collection mechanics with a linear actuator-driven auger system.',
      color: '#FF6B35',
      accent: '#FFE0D4'
    },
    camera: { x: 100, y: 40, z: 200 }, 
    lookAt: { x: 30, y: 10, z: 0 }, 
  },
  // Science - Astrobiology
  { 
    name: 'astrobiology', 
    subteam: {
      teamName: 'Science',
      name: 'Astrobiology',
      desc: 'Develops tests to analyze soil and rock samples for signs of past or present life.',
      color: '#4CAF50',
      accent: '#C8E6C9'
    },
    camera: { x: 60, y: 80, z: 220 }, 
    lookAt: { x: 0, y: 30, z: 0 }, 
  },
  // Software - Autonomy
  { 
    name: 'autonomy', 
    subteam: {
      teamName: 'Software',
      name: 'Autonomy',
      desc: 'Handles Navigation, Perception, and Localization. Uses A* to path plan around obstacles.',
      color: '#2196F3',
      accent: '#BBDEFB'
    },
    camera: { x: 0, y: 120, z: 350 }, 
    lookAt: { x: 0, y: 0, z: 0 }, 
  },
  // Software - ESW
  { 
    name: 'esw', 
    subteam: {
      teamName: 'Software',
      name: 'Embedded Software',
      desc: 'Writes low-level driver code for other programming subteams to utilize electronic equipment.',
      color: '#2196F3',
      accent: '#BBDEFB'
    },
    camera: { x: -80, y: 60, z: 200 }, 
    lookAt: { x: 0, y: 20, z: 0 }, 
  },
  // Software - Teleop
  { 
    name: 'teleop', 
    subteam: {
      teamName: 'Software',
      name: 'Teleoperation',
      desc: 'Creates the interface between driver and rover, maintaining GUIs and control solutions.',
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
      desc: 'Develops a drone for collaboration with the Rover, capable of manual and autonomous operation.',
      color: '#2196F3',
      accent: '#BBDEFB'
    },
    camera: { x: 0, y: 180, z: 400 }, 
    lookAt: { x: 0, y: 50, z: 0 }, 
  },
  // Electrical - Power
  { 
    name: 'power', 
    subteam: {
      teamName: 'Electrical',
      name: 'Power',
      desc: 'Provides power to the rover and manages the electronics box with custom distribution solutions.',
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
      desc: 'Controls actuators, receives sensor signals, and designs custom PCBs for motor control.',
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
      desc: 'Ensures strong wireless RF communication link between base station and rover.',
      color: '#9C27B0',
      accent: '#E1BEE7'
    },
    camera: { x: 0, y: 100, z: 300 }, 
    lookAt: { x: 0, y: 40, z: 0 }, 
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
    filter: (s: SectionTarget) => s.subteam?.teamName === 'Science-Mechanical' || s.subteam?.teamName === 'Science',
  },
  {
    name: 'Software',
    color: '#2196F3',
    accent: '#BBDEFB',
    filter: (s: SectionTarget) => s.subteam?.teamName === 'Software',
  },
  {
    name: 'Electrical',
    color: '#9C27B0',
    accent: '#E1BEE7',
    filter: (s: SectionTarget) => s.subteam?.teamName === 'Electrical',
  },
]

export const BRANCHES: Branch[] = BRANCH_DEFINITIONS.map((def, i) => ({
  name: def.name,
  color: def.color,
  accent: def.accent,
  sections: offsetSections(SECTION_TARGETS.filter(def.filter), -BRANCH_SPACING * i),
}))
