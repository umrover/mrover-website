// Blueprint oscilloscope: a scrolling sine + PWM trace over a scope grid, with
// a flowing bit stream below. Represents the ESW subteam's signal/driver work.
export function EswScope({ accent }: { accent: string }) {
  const X0 = 8, W = 84, YC = 32, AMP = 12, P = 28 // scope box + wave params

  // Build a wave path wide enough to scroll one period seamlessly.
  const wave = (fn: (x: number) => number) => {
    let d = ''
    for (let x = X0 - P; x <= X0 + W + P; x += 2) d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${fn(x).toFixed(1)} `
    return d
  }
  const sineD = wave((x) => YC + AMP * Math.sin((x / P) * Math.PI * 2))

  // Square (PWM) wave built from vertical + horizontal segments.
  let pwmD = ''
  for (let x = X0 - P, hi = true; x <= X0 + W + P; x += P / 2, hi = !hi) {
    const yTop = YC - AMP * 0.7, yBot = YC + AMP * 0.7
    pwmD += `${x === X0 - P ? 'M' : 'L'}${x} ${hi ? yTop : yBot} L${x + P / 2} ${hi ? yTop : yBot} `
  }

  const gridV = Array.from({ length: 8 }, (_, i) => X0 + (i * W) / 7)
  const gridH = [YC - AMP, YC, YC + AMP]
  const bits = Array.from({ length: 22 })

  return (
    <div className="absolute inset-0 flex items-center justify-center p-7">
      <svg viewBox="0 0 100 100" className="w-full h-full" style={{ color: accent }}>
        <defs>
          <clipPath id="esw-scope"><rect x={X0} y={12} width={W} height={40} rx={2} /></clipPath>
        </defs>
        {/* scope frame + grid */}
        <rect x={X0} y={12} width={W} height={40} rx={2} fill="none" stroke="currentColor" strokeWidth={0.6} opacity={0.5} />
        <g clipPath="url(#esw-scope)" stroke="currentColor" strokeWidth={0.3} opacity={0.13}>
          {gridV.map((x) => <line key={x} x1={x} y1={12} x2={x} y2={52} />)}
          {gridH.map((y) => <line key={y} x1={X0} y1={y} x2={X0 + W} y2={y} />)}
        </g>
        {/* scrolling traces */}
        <g clipPath="url(#esw-scope)">
          <g>
            <animateTransform attributeName="transform" type="translate" from="0 0" to={`${-P} 0`} dur="3s" repeatCount="indefinite" />
            <path d={sineD} fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinejoin="round" />
          </g>
          <g opacity={0.55}>
            <animateTransform attributeName="transform" type="translate" from="0 0" to={`${-P} 0`} dur="4.5s" repeatCount="indefinite" />
            <path d={pwmD} fill="none" stroke="currentColor" strokeWidth={0.9} strokeLinejoin="miter" />
          </g>
        </g>
        {/* flowing bit stream */}
        <g fill="currentColor">
          {bits.map((_, i) => (
            <rect key={i} x={X0 + i * ((W - 3) / 21)} y={64} width={3} height={3.4} opacity={0.15}>
              <animate attributeName="opacity" values="0.12;1;0.12" dur="2.4s" begin={`${(i * 0.11).toFixed(2)}s`} repeatCount="indefinite" />
            </rect>
          ))}
        </g>
        <g fill="currentColor" opacity={0.5}>
          {bits.map((_, i) => (
            <rect key={i} x={X0 + i * ((W - 3) / 21)} y={72} width={3} height={3.4} opacity={0.15}>
              <animate attributeName="opacity" values="0.1;0.8;0.1" dur="3.1s" begin={`${(i * 0.17 + 1).toFixed(2)}s`} repeatCount="indefinite" />
            </rect>
          ))}
        </g>
      </svg>
    </div>
  )
}
