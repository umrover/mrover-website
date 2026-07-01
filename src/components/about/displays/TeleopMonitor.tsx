// Blueprint base-station monitor: a screen with a live-ish mission map, an
// attitude gauge, and telemetry bars. Represents the teleop GUI without the
// real (light-themed) web app.
export function TeleopMonitor({ accent }: { accent: string }) {
  const baseline = 59
  const bars = [
    { x: 50, h: [4, 12, 7], dur: '2.2s' },
    { x: 58, h: [10, 5, 11], dur: '2.7s' },
    { x: 66, h: [6, 12, 4], dur: '2.0s' },
    { x: 74, h: [11, 6, 9], dur: '3.0s' },
    { x: 82, h: [5, 10, 7], dur: '2.4s' },
  ]
  const loop = (a: number[]) => [...a, a[0]].join(';')

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <svg viewBox="0 0 100 100" className="w-full h-full" style={{ color: accent }}>
        {/* screen + stand */}
        <rect x={6} y={8} width={88} height={58} rx={2.5} fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.55} />
        <path d="M44 66 L40 78 L60 78 L56 66" fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.4} />
        <line x1={34} y1={80} x2={66} y2={80} stroke="currentColor" strokeWidth={1.2} opacity={0.5} strokeLinecap="round" />

        {/* header divider + REC dot */}
        <line x1={10} y1={16} x2={90} y2={16} stroke="currentColor" strokeWidth={0.4} opacity={0.3} />
        <circle cx={13} cy={12.5} r={1.4} fill="currentColor">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
        {[20, 24, 28].map((x) => <line key={x} x1={x} y1={11} x2={x} y2={14} stroke="currentColor" strokeWidth={0.5} opacity={0.35} />)}

        {/* mission map with moving rover blip */}
        <g stroke="currentColor" strokeWidth={0.3} opacity={0.14}>
          {[22, 29, 36, 43].map((y) => <line key={y} x1={10} y1={y} x2={42} y2={y} />)}
          {[10, 18, 26, 34, 42].map((x) => <line key={x} x1={x} y1={20} x2={x} y2={46} />)}
        </g>
        <path id="teleop-route" d="M13 44 L13 30 L26 30 L26 24 L39 24" fill="none" stroke="currentColor" strokeWidth={0.9} opacity={0.6} strokeLinecap="round" strokeLinejoin="round" />
        <circle r={1.8} fill="currentColor">
          <animateMotion dur="5s" repeatCount="indefinite" path="M13 44 L13 30 L26 30 L26 24 L39 24" />
        </circle>

        {/* attitude gauge */}
        <g transform="translate(64 32)">
          <circle r={11} fill="none" stroke="currentColor" strokeWidth={0.6} opacity={0.5} />
          <line x1={-11} y1={0} x2={11} y2={0} stroke="currentColor" strokeWidth={0.3} opacity={0.25} />
          <g>
            <animateTransform attributeName="transform" type="rotate" values="-32;32;-32" dur="4s" repeatCount="indefinite" />
            <line x1={0} y1={0} x2={0} y2={-9} stroke="currentColor" strokeWidth={1} strokeLinecap="round" />
          </g>
          <circle r={1.3} fill="currentColor" />
        </g>

        {/* telemetry bars */}
        <g fill="currentColor" opacity={0.75}>
          {bars.map((b) => (
            <rect key={b.x} x={b.x} width={6} rx={0.5} y={baseline - b.h[0]} height={b.h[0]}>
              <animate attributeName="height" values={loop(b.h)} dur={b.dur} repeatCount="indefinite" />
              <animate attributeName="y" values={loop(b.h.map((h) => baseline - h))} dur={b.dur} repeatCount="indefinite" />
            </rect>
          ))}
        </g>
        <line x1={48} y1={baseline + 0.5} x2={90} y2={baseline + 0.5} stroke="currentColor" strokeWidth={0.4} opacity={0.3} />
      </svg>
    </div>
  )
}
