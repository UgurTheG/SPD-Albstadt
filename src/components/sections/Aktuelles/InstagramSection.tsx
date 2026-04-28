import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Camera, ExternalLink } from 'lucide-react'
import { INSTAGRAM_PROFILE_URL, INSTAGRAM_USERNAME } from '@/shared/instagram'
import SubsectionHeading from '@/components/SubsectionHeading'

interface Props {
  elfsightAppId?: string
}

export default function InstagramSection({ elfsightAppId }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  // Reactively track dark-mode so the Elfsight widget theme updates with user preference
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    if (!elfsightAppId) return
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [elfsightAppId])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="mt-14"
      ref={ref}
    >
      <SubsectionHeading
        icon={<Camera size={15} className="text-spd-red" />}
        title="Instagram"
        subtitle={`Neueste Beiträge von @${INSTAGRAM_USERNAME}`}
        mb="mb-6"
        action={
          <a
            href={INSTAGRAM_PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-spd-red/25 px-3 py-1.5 text-xs font-semibold text-spd-red hover:bg-spd-red hover:text-white transition-colors"
          >
            Folgen <ExternalLink size={12} />
          </a>
        }
      />

      {elfsightAppId && (
        <div
          className={`elfsight-app-${elfsightAppId}`}
          data-elfsight-app-lazy
          data-elfsight-app-theme={isDark ? 'dark' : 'light'}
        />
      )}
    </motion.div>
  )
}
