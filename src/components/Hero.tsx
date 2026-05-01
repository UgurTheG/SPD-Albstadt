import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ChevronDown, UserPlus } from 'lucide-react'
import { useConfig } from '../hooks/useConfig'
import { useNavigateTo } from '../hooks/useNavigateTo'
import { useNavItems } from '../hooks/useNavItems'

export default function Hero() {
  const navigateTo = useNavigateTo()
  const config = useConfig()
  const slogan =
    config?.heroSlogan || 'Gemeinsam für Albstadt — sozial, gerecht und zukunftsorientiert.'
  const badge = config?.heroBadge || 'Ortsverein Albstadt · Zollernalb'
  const navItems = useNavItems()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [0, -180])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.05])
  return (
    <section
      ref={ref}
      id="hero"
      className="relative h-screen min-h-150 overflow-hidden bg-spd-red dark:bg-red-950"
    >
      {/* Background layers */}
      <motion.div style={{ scale }} className="absolute inset-0">
        <div className="absolute inset-0 bg-linear-to-b from-spd-red via-spd-red-dark to-[#8B000A] dark:from-red-950 dark:via-red-950 dark:to-[#1a0000]" />
        {/* Radial vignette — darkens edges, keeps center bright */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 40%, transparent 0%, rgba(0,0,0,0.35) 100%)',
          }}
        />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.05]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          role="presentation"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="absolute -top-32 -right-32 w-125 h-125 rounded-full bg-white/3" />
        <div className="absolute top-1/3 -left-48 w-100 h-100 rounded-full bg-white/3" />
        <div className="absolute -bottom-24 right-1/4 w-75 h-75 rounded-full bg-white/3" />
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
          <span className="text-[20vw] font-black text-white/3 tracking-tighter leading-none">
            SPD
          </span>
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
            {badge}
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
          {slogan}
        </motion.p>

        {/* Navigation pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
          className="flex flex-wrap justify-center gap-2.5 mb-8"
        >
          {navItems.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + i * 0.08 }}
              whileHover={{ scale: 1.06, backgroundColor: 'rgba(255,255,255,0.22)' }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigateTo(item.id)}
              className="bg-white/12 backdrop-blur-sm border border-white/25 text-white font-medium px-5 py-2.5 min-h-[44px] min-w-[44px] rounded-full text-sm transition-all cursor-pointer hover:border-white/50 hover:shadow-lg"
            >
              {item.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="flex items-center gap-3 mb-6 w-56"
        >
          <div className="flex-1 h-px bg-white/15" />
          <span className="text-[11px] text-white/35 font-medium tracking-wide">oder</span>
          <div className="flex-1 h-px bg-white/15" />
        </motion.div>

        {/* Secondary CTA */}
        <motion.a
          href="https://www.spd.de/unterstuetzen/mitglied-werden"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9, ease: 'easeOut' }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 bg-white/12 backdrop-blur-sm border border-white/25 text-white font-semibold px-6 py-2.5 min-h-[44px] rounded-full text-sm hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer"
        >
          <UserPlus size={15} strokeWidth={2.5} />
          Mitglied werden
        </motion.a>
      </motion.div>
      {/* Bottom fade — dark mode only: blends hero into the dark page background */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t dark:from-gray-950 to-transparent z-10 pointer-events-none" />

      {/* Scroll indicator */}
      <motion.button
        onClick={() => navigateTo('aktuelles')}
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 hover:text-white transition-colors z-20 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Zu Aktuelles"
      >
        <ChevronDown size={34} strokeWidth={1.5} />
      </motion.button>
    </section>
  )
}
