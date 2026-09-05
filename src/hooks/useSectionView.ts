import { useRef } from 'react'
import { useInView } from 'motion/react'

export function useSectionView() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return { ref, isInView }
}
