import { useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useScroll } from '../../hooks/use-scroll'
import { lerp } from '../../lib/maths'
import { getScrollState } from './utils'

export function CameraController() {
  const { camera } = useThree()
  const scrollRef = useRef(0)
  const windowHeightRef = useRef(0)
  const smoothedPos = useRef(new THREE.Vector3())
  const smoothedLookAt = useRef(new THREE.Vector3())
  const targetPos = useRef(new THREE.Vector3())
  const lookAtTarget = useRef(new THREE.Vector3())
  const initialized = useRef(false)

  useEffect(() => {
    windowHeightRef.current = window.innerHeight
    const handleResize = () => { windowHeightRef.current = window.innerHeight }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useScroll(useCallback(({ scroll }: { scroll: number }) => {
    scrollRef.current = scroll
  }, []))

  useFrame((_, delta) => {
    if (document.hidden || !windowHeightRef.current) return

    const { sectionProgress, fromSection, toSection } = getScrollState(scrollRef.current, windowHeightRef.current)

    targetPos.current.set(
      lerp(fromSection.camera.x, toSection.camera.x, sectionProgress),
      lerp(fromSection.camera.y, toSection.camera.y, sectionProgress),
      lerp(fromSection.camera.z, toSection.camera.z, sectionProgress)
    )

    lookAtTarget.current.set(
      lerp(fromSection.lookAt.x, toSection.lookAt.x, sectionProgress),
      lerp(fromSection.lookAt.y, toSection.lookAt.y, sectionProgress),
      lerp(fromSection.lookAt.z, toSection.lookAt.z, sectionProgress)
    )

    if (!initialized.current) {
      smoothedPos.current.copy(targetPos.current)
      smoothedLookAt.current.copy(lookAtTarget.current)
      initialized.current = true
    }

    const factor = 1 - Math.exp(-8 * delta)
    smoothedPos.current.lerp(targetPos.current, factor)
    smoothedLookAt.current.lerp(lookAtTarget.current, factor)

    camera.position.copy(smoothedPos.current)
    camera.lookAt(smoothedLookAt.current)
  })

  return null
}
