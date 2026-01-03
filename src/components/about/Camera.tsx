import { useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useScroll } from '../../hooks/use-scroll'
import { lerp } from '../../lib/maths'
import { getScrollState } from './utils'

export function CameraController() {
  const { camera, size } = useThree()
  const scrollRef = useRef(0)
  const windowHeightRef = useRef(0)
  const lookAtTarget = useRef(new THREE.Vector3())

  useEffect(() => {
    windowHeightRef.current = window.innerHeight
    const handleResize = () => { windowHeightRef.current = window.innerHeight }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useScroll(useCallback(({ scroll }: { scroll: number }) => {
    scrollRef.current = scroll
  }, []))

  useFrame(() => {
    if (document.hidden || !windowHeightRef.current) return

    const { sectionProgress, fromSection, toSection } = getScrollState(scrollRef.current, windowHeightRef.current)

    const aspect = size.width / size.height
    const isMobileAspect = aspect < 0.8
    const xScale = isMobileAspect ? 0.3 : 1
    const zScale = isMobileAspect ? 1.4 : 1

    camera.position.set(
      lerp(fromSection.camera.x, toSection.camera.x, sectionProgress) * xScale,
      lerp(fromSection.camera.y, toSection.camera.y, sectionProgress),
      lerp(fromSection.camera.z, toSection.camera.z, sectionProgress) * zScale
    )

    lookAtTarget.current.set(
      lerp(fromSection.lookAt.x, toSection.lookAt.x, sectionProgress) * xScale,
      lerp(fromSection.lookAt.y, toSection.lookAt.y, sectionProgress),
      lerp(fromSection.lookAt.z, toSection.lookAt.z, sectionProgress)
    )
    camera.lookAt(lookAtTarget.current)
  })

  return null
}
