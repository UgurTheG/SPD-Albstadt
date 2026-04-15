import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
interface HeroProps {
  navigateTo: (id: string) => void
}
const NAV_ITEMS = [
  { id: 'aktuelles', label: 'Aktuelles' },
  { id: 'partei', label: 'Partei' },
  { id: 'fraktion', label: 'Fraktion' },
  { id: 'historie', label: 'Historie' },
  { id: 'kontakt', label: 'Kontakt' },
]
export default function Hero({ navigateTo }: HeroProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [0, -180])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.05])
  return (
    <section ref={ref} id="hero" className="relative h-screen min-h-[600px] overflow-hidden bg-spd-red dark:bg-red-950">
      {/* Background layers */}
      <motion.div style={{ scale }} className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-spd-red via-spd-red-dark to-[#8B000A] dark:from-red-950 dark:via-red-950 dark:to-[#1a0000]" />
        {/* Radial vignette — darkens edges, keeps center bright */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, transparent 0%, rgba(0,0,0,0.35) 100%)' }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/[0.03]" />
        <div className="absolute top-1/3 -left-48 w-[400px] h-[400px] rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-24 right-1/4 w-[300px] h-[300px] rounded-full bg-white/[0.03]" />
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
          <span className="text-[20vw] font-black text-white/[0.03] tracking-tighter leading-none">SPD</span>
        </div>
      </motion.div>
      {/* Main content with parallax */}
      <motion.div
        style={{ y, opacity }}
        className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 text-sm font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Ortsverein Albstadt · Zollernalb
          </div>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          className="text-6xl sm:text-8xl lg:text-[10rem] font-black leading-none tracking-tighter mb-4"
        >
          SPD
          <br />
          <span className="text-white/75">Albstadt</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="text-lg sm:text-2xl text-white/75 max-w-xl mb-12 font-light leading-relaxed"
        >
          Gemeinsam für Albstadt —
          <br className="hidden sm:block" /> sozial, gerecht und zukunftsorientiert.
        </motion.p>

        {/* Navigation pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}
          className="flex flex-wrap justify-center gap-2.5"
        >
          {NAV_ITEMS.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              whileHover={{ scale: 1.06, backgroundColor: 'rgba(255,255,255,0.22)' }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigateTo(item.id)}
              className="bg-white/12 backdrop-blur-sm border border-white/25 text-white font-medium px-5 py-2.5 rounded-full text-sm transition-all cursor-pointer hover:border-white/50 hover:shadow-lg"
            >
              {item.label}
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
      {/* Bottom fade — softens the hard edge into the next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-gray-950 dark:from-gray-950 to-transparent z-10 pointer-events-none" />

      {/* Scroll indicator */}
      <motion.button
        onClick={() => navigateTo('aktuelles')}
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 hover:text-white transition-colors z-20 cursor-pointer"
        aria-label="Zu Aktuelles"
      >
        <ChevronDown size={34} strokeWidth={1.5} />
      </motion.button>
    </section>
  )
}
