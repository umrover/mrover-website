// Decorative A* pathfinding display: a grid with obstacles and an obstacle-
// avoiding route that draws itself repeatedly, with a marker traversing it.
export function NavGrid({ accent }: { accent: string }) {
  const obstacles = [
    [24, 24], [24, 36], [48, 48], [60, 48], [48, 60], [36, 72], [72, 24], [72, 60],
  ]
  const path = 'M 6 90 L 6 60 L 30 60 L 30 36 L 54 36 L 54 12 L 90 12'
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <svg viewBox="0 0 96 96" className="w-full h-full" style={{ color: accent }}>
        {/* grid */}
        {Array.from({ length: 9 }, (_, i) => i * 12).map((v) => (
          <g key={v} stroke="currentColor" strokeWidth={0.3} opacity={0.15}>
            <line x1={v} y1={0} x2={v} y2={96} />
            <line x1={0} y1={v} x2={96} y2={v} />
          </g>
        ))}
        {/* obstacles */}
        {obstacles.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={12} height={12} fill="currentColor" opacity={0.18} />
        ))}
        {/* route */}
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
          strokeDasharray={100}
        >
          <animate attributeName="stroke-dashoffset" values="100;0;0;100" keyTimes="0;0.55;0.9;1" dur="4s" repeatCount="indefinite" />
        </path>
        {/* start + goal */}
        <circle cx={6} cy={90} r={2.5} fill="currentColor" />
        <g stroke="currentColor" strokeWidth={1.2} fill="none">
          <circle cx={90} cy={12} r={4} />
          <circle cx={90} cy={12} r={1.5} fill="currentColor" stroke="none" />
        </g>
        {/* traversing marker */}
        <circle r={2.5} fill="currentColor">
          <animateMotion dur="4s" keyPoints="0;1;1;1" keyTimes="0;0.55;0.9;1" calcMode="linear" repeatCount="indefinite" path={path} />
          <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.55;0.6;1" dur="4s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}
