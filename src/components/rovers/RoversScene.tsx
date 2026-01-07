import { lazy, Suspense } from 'react'

const StarsBackground = lazy(() => import('@/components/StarsBackground').then(m => ({ default: m.StarsBackground })))

export function RoversScene() {
  return (
    <Suspense fallback={<div style={{ position: 'fixed', inset: '-50px', zIndex: -1, background: '#0a0808' }} />}>
      <StarsBackground />
    </Suspense>
  )
}
