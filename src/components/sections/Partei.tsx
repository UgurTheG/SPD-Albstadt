import {type ElementType, useRef, useState} from 'react'
import {motion, useInView, type Variants} from 'framer-motion'
import {
  Briefcase,
  Building2,
  Bus,
  ExternalLink,
  GraduationCap,
  Home,
  Leaf,
  Mail,
  MapPin,
  Phone,
  Users
} from 'lucide-react'
import {useData} from '../../hooks/useData'
import {useHttpErrorRedirect} from '../../hooks/useHttpErrorRedirect'
import Sheet from '../Sheet'

interface Schwerpunkt {
  titel: string
  beschreibung: string
  icon: string
}

interface Mitglied {
  name: string
  rolle: string
  email: string
  phone?: string
  address?: string
  place?: string
  bildUrl: string
  bio: string
}

interface Abgeordneter {
  name: string
  rolle: string
  wahlkreis: string
  email: string
  website?: string
  bildUrl: string
  bio: string
}

interface PartyData {
  beschreibung: string
  schwerpunkte: Schwerpunkt[]
  vorstand: Mitglied[]
  abgeordnete: Abgeordneter[]
}

const ICONS: Record<string, ElementType> = {
  GraduationCap,
  Home,
  Leaf,
  Bus,
  Briefcase,
  Users,
}

function Avatar({ name, imageUrl, size = 'md' }: { name: string; imageUrl?: string; size?: 'sm' | 'md' | 'lg' | 'xl' | 'card' }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const sizeClasses: Record<string, string> = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-16 h-16 text-xl',
    lg: 'w-24 h-24 text-3xl',
    xl: 'w-32 h-32 text-4xl',
    card: 'w-full h-full text-4xl',
  }
  const cls = sizeClasses[size]
  const rounded = size === 'card' ? '' : 'rounded-full'
  if (imageUrl) {
    return <img loading="lazy" src={imageUrl} alt={name} className={`${cls} ${rounded} object-cover`} />
  }
  return (
    <div className={`${cls} ${rounded} bg-spd-red flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  )
}

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export default function Partei() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const {data, error} = useData<PartyData>('/data/party.json')
  useHttpErrorRedirect(error)
  const [selectedPerson, setSelectedPerson] = useState<Mitglied | Abgeordneter | null>(null)

  return (
    <section id="partei" className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative mb-16"        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-1 w-12 bg-spd-red rounded-full" />
            <span className="text-spd-red font-semibold text-sm uppercase tracking-wider">Partei</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-6 text-left">
            Die SPD Albstadt
          </h2>
          {data && (
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-3xl leading-relaxed whitespace-pre-line">
              {data.beschreibung}
            </p>
          )}
        </motion.div>

        {/* Schwerpunkte */}
        <div className="mb-20">
          <motion.h3
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-8"
          >
            Unsere Schwerpunkte
          </motion.h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {data?.schwerpunkte.map((s) => {
              const Icon = ICONS[s.icon] || Users
              return (
                <motion.div
                  key={s.titel}
                  variants={itemVariants}
                  className="group relative rounded-2xl overflow-hidden
                             bg-white dark:bg-gray-800/60
                             border border-gray-100 dark:border-gray-800/80
                             shadow-sm dark:shadow-black/20
                             hover:shadow-lg
                             hover:-translate-y-1
                             transition-all duration-500"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-11 h-11 bg-spd-red/8 dark:bg-spd-red/12 rounded-xl flex items-center justify-center transition-all duration-300">
                        <Icon size={20} className="text-spd-red" />
                      </div>
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2 leading-snug">{s.titel}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">{s.beschreibung}</p>
                  </div>
                </motion.div>
              )
            })}

            {!data && (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-40 animate-pulse" />
              ))
            )}
          </motion.div>
        </div>

        {/* Vorstand */}
        <div className="mb-20">
          <motion.h3
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-8"
          >
            Vorstand
          </motion.h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {data?.vorstand.map(m => (
              <motion.div
                key={m.name}
                variants={itemVariants}
                onClick={() => setSelectedPerson(m)}
                className="group relative rounded-2xl overflow-hidden cursor-pointer
                           bg-gray-950 transform-gpu
                           shadow-[0_4px_20px_rgba(0,0,0,0.55)]
                           hover:shadow-[0_8px_36px_rgba(0,0,0,0.7)] hover:-translate-y-1
                           transition-all duration-500"
              >
                {/* Full portrait */}
                {(() => {
                  const imgs = m.bildUrl ? [m.bildUrl] : []
                  return imgs.length > 0 ? (
                    <div className="aspect-3/4 overflow-hidden">
                      <img loading="lazy" src={imgs[0]} alt={m.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                    </div>
                  ) : (
                    <div className="aspect-3/4 overflow-hidden">
                      <Avatar name={m.name} size="card" />
                    </div>
                  )
                })()}
                {/* Cinematic gradient */}
                <div className="absolute inset-0 bg-linear-to-t from-gray-950 via-gray-950/40 to-transparent pointer-events-none" />
                {/* Text overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 pointer-events-none">
                  <p className="text-[10px] sm:text-[11px] font-medium tracking-wide text-white/50 mb-0.5">{m.rolle}</p>
                  <h4 className="font-extrabold text-white text-sm sm:text-base leading-tight">{m.name}</h4>
                  <span className="inline-flex items-center text-[11px] font-semibold text-white/50 group-hover:text-spd-red transition-colors duration-300 mt-2">Mehr anzeigen →</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Abgeordnete */}
        {data?.abgeordnete && data.abgeordnete.length > 0 && (
          <div>
            <motion.h3
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-8"
            >
              Abgeordnete
            </motion.h3>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              className="grid grid-cols-1 gap-5"
            >
              {data.abgeordnete.map(a => (
                <motion.div
                  key={a.name}
                  variants={itemVariants}
                  onClick={() => setSelectedPerson(a)}
                  className="group flex rounded-2xl overflow-hidden cursor-pointer
                             bg-white dark:bg-gray-900
                             border border-gray-100 dark:border-gray-800/80
                             shadow-sm dark:shadow-black/40
                             hover:shadow-xl
                             transition-all duration-500 hover:-translate-y-1"
                >

                  {/* Image column — fully visible, dark-framed */}
                  <div className="relative w-32 sm:w-60 [@media(orientation:landscape)_and_(max-height:600px)]:w-32 shrink-0 overflow-hidden bg-gray-950 self-stretch">
                    <img
                      src={a.bildUrl}
                      alt={a.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between p-4 sm:p-7 [@media(orientation:landscape)_and_(max-height:600px)]:p-4 min-h-45 sm:min-h-65 [@media(orientation:landscape)_and_(max-height:600px)]:min-h-0">
                    <div>
                      <p className="text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">{a.rolle}</p>
                      <h4 className="font-extrabold text-gray-900 dark:text-white text-lg sm:text-2xl leading-tight">{a.name}</h4>
                      <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1 sm:mt-1.5">{a.wahlkreis}</p>
                      <p className="hidden sm:block [@media(orientation:landscape)_and_(max-height:600px)]:hidden text-sm text-gray-500 dark:text-gray-400 leading-relaxed mt-4 line-clamp-4 whitespace-pre-line">{a.bio}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      {a.website && (
                        <a
                          href={a.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-spd-red hover:underline"
                        >
                          <ExternalLink size={12} /> Website
                        </a>
                      )}
                      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-600 group-hover:text-spd-red transition-colors duration-300 ml-auto">
                        Mehr anzeigen →
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>

      {/* Person detail sheet */}
      <Sheet open={!!selectedPerson} onClose={() => setSelectedPerson(null)}>
        {selectedPerson && (
          /* Portrait: stacked. Short landscape: image left, info right */
          <div className="[@media(orientation:landscape)_and_(max-height:600px)]:flex
                          [@media(orientation:landscape)_and_(max-height:600px)]:flex-row
                          [@media(orientation:landscape)_and_(max-height:600px)]:min-h-0
                          [@media(orientation:landscape)_and_(max-height:600px)]:h-full">

            {/* Hero image */}
            <div className="relative overflow-hidden bg-gray-900
                            [@media(orientation:landscape)_and_(max-height:600px)]:w-1/2
                            [@media(orientation:landscape)_and_(max-height:600px)]:shrink-0">
              {selectedPerson.bildUrl ? (
                <img
                  src={selectedPerson.bildUrl}
                  alt={selectedPerson.name}
                  className="w-full block object-cover object-top
                             max-h-[58dvh] sm:max-h-[70dvh]
                             [@media(orientation:landscape)_and_(max-height:600px)]:max-h-none
                             [@media(orientation:landscape)_and_(max-height:600px)]:h-full"
                />
              ) : (
                <div className="w-full aspect-square [@media(orientation:landscape)_and_(max-height:600px)]:aspect-auto [@media(orientation:landscape)_and_(max-height:600px)]:h-full bg-linear-to-br from-spd-red to-spd-red-dark flex items-center justify-center">
                  <span className="text-6xl font-bold text-white/90">
                    {selectedPerson.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/50 to-gray-900/10
                              [@media(orientation:landscape)_and_(max-height:600px)]:bg-none" />
              {/* Info overlay — portrait only */}
              <div className="absolute bottom-0 inset-x-0 px-6 pb-7
                              [@media(orientation:landscape)_and_(max-height:600px)]:hidden">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-black text-white text-2xl leading-snug">{selectedPerson.name}</h3>
                </div>
                <p className="text-sm font-medium tracking-wide text-white/50 mt-1">{selectedPerson.rolle}</p>
                {'wahlkreis' in selectedPerson && (
                  <p className="text-sm text-white/60 mt-1">{(selectedPerson as { wahlkreis: string }).wahlkreis}</p>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pt-6 pb-8 space-y-6
                            [@media(orientation:landscape)_and_(max-height:600px)]:flex-1
                            [@media(orientation:landscape)_and_(max-height:600px)]:overflow-y-auto
                            [@media(orientation:landscape)_and_(max-height:600px)]:px-5
                            [@media(orientation:landscape)_and_(max-height:600px)]:py-5">
              {/* Name shown only in landscape */}
              <div className="hidden [@media(orientation:landscape)_and_(max-height:600px)]:block">
                <h3 className="font-black text-gray-900 dark:text-white text-xl leading-snug">{selectedPerson.name}</h3>
                <p className="text-sm font-medium tracking-wide text-gray-500 dark:text-white/50 mt-0.5">{selectedPerson.rolle}</p>
                {'wahlkreis' in selectedPerson && (
                  <p className="text-sm text-gray-500 dark:text-white/60 mt-0.5">{(selectedPerson as { wahlkreis: string }).wahlkreis}</p>
                )}
              </div>
              <div className="w-8 h-0.5 bg-spd-red rounded-full" />
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {selectedPerson.bio}
              </p>

              {/* Contact info — elegant list */}
              {(('address' in selectedPerson && selectedPerson.address) || ('phone' in selectedPerson && selectedPerson.phone) || selectedPerson.email || ('website' in selectedPerson && selectedPerson.website)) && (
                <div className="rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800
                                border border-gray-100 dark:border-gray-800">
                  {'address' in selectedPerson && selectedPerson.address && (
                    <div className="flex items-center gap-3.5 px-4 py-3.5">
                      <div className="w-8 h-8 rounded-xl bg-spd-red/8 dark:bg-spd-red/12 flex items-center justify-center shrink-0">
                        <MapPin size={14} className="text-spd-red" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{(selectedPerson as Mitglied).address}</span>
                    </div>
                  )}
                  {'place' in selectedPerson && selectedPerson.place && (
                    <div className="flex items-center gap-3.5 px-4 py-3.5">
                      <div className="w-8 h-8 rounded-xl bg-spd-red/8 dark:bg-spd-red/12 flex items-center justify-center shrink-0">
                        <Building2 size={14} className="text-spd-red" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{(selectedPerson as Mitglied).place}</span>
                    </div>
                  )}
                  {'phone' in selectedPerson && selectedPerson.phone && (
                    <a href={`tel:${(selectedPerson as Mitglied).phone!.replace(/\s/g, '')}`}
                      className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-spd-red/8 dark:bg-spd-red/12 flex items-center justify-center shrink-0">
                        <Phone size={14} className="text-spd-red" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{(selectedPerson as Mitglied).phone}</span>
                    </a>
                  )}
                  {selectedPerson.email && (
                    <a href={`mailto:${selectedPerson.email}`}
                      className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-spd-red/8 dark:bg-spd-red/12 flex items-center justify-center shrink-0">
                        <Mail size={14} className="text-spd-red" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{selectedPerson.email}</span>
                    </a>
                  )}
                  {'website' in selectedPerson && selectedPerson.website && (
                    <a href={(selectedPerson as Abgeordneter).website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-spd-red/8 dark:bg-spd-red/12 flex items-center justify-center shrink-0">
                        <ExternalLink size={14} className="text-spd-red" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{(selectedPerson as Abgeordneter).website?.replace('https://', '')}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </section>
  )
}
