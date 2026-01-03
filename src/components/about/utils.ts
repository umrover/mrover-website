import { ALL_SECTIONS, TOTAL_SECTIONS } from './SceneConfig'

export function getScrollState(scroll: number, windowHeight: number) {
  if (!windowHeight) {
    return { sectionIndex: 0, sectionProgress: 0, fromSection: ALL_SECTIONS[0], toSection: ALL_SECTIONS[0] }
  }

  const scrollPerSection = windowHeight
  const totalScrollable = (TOTAL_SECTIONS - 1) * scrollPerSection
  const clampedScroll = Math.max(0, Math.min(scroll, totalScrollable))

  const exactSection = clampedScroll / scrollPerSection
  const sectionIndex = Math.min(Math.floor(exactSection), TOTAL_SECTIONS - 1)
  const sectionProgress = exactSection - sectionIndex

  return {
    sectionIndex,
    sectionProgress: Math.min(sectionProgress, 1),
    fromSection: ALL_SECTIONS[sectionIndex],
    toSection: ALL_SECTIONS[Math.min(sectionIndex + 1, TOTAL_SECTIONS - 1)],
  }
}
