// HUD frame overlaid on each isolated View — accent-tinted border and corner
// brackets to sell the "self-contained viewport" feel.
export function ViewportFrame({ accent }: { accent: string }) {
  const corners = [
    'top-0 left-0 border-t-2 border-l-2',
    'top-0 right-0 border-t-2 border-r-2',
    'bottom-0 left-0 border-b-2 border-l-2',
    'bottom-0 right-0 border-b-2 border-r-2',
  ]
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute inset-0 border" style={{ borderColor: `${accent}22` }} />
      {corners.map((c) => (
        <div key={c} className={`absolute w-5 h-5 ${c}`} style={{ borderColor: accent }} />
      ))}
    </div>
  )
}
