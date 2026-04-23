import {type ElementType, useRef, useState} from 'react'
import {motion, useInView} from 'framer-motion'
import {
  Briefcase,
  Bus,
  ExternalLink,
  GraduationCap,
  Home,
  Leaf,
  Users
} from 'lucide-react'
import {useData} from '../../hooks/useData'
import {useHttpErrorRedirect} from '../../hooks/useHttpErrorRedirect'
import PersonSheet from '../PersonSheet'
import PersonCard, {personCardContainerVariants, personCardItemVariants} from '../PersonCard'

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
  bildUrls?: string[]
  bio: string
}

interface Abgeordneter {
  name: string
  rolle: string
  wahlkreis: string
  email: string
  website?: string
  bildUrl: string
  bildUrls?: string[]
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
            variants={personCardContainerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {data?.schwerpunkte.map((s) => {
              const Icon = ICONS[s.icon] || Users
              return (
                <motion.div
                  key={s.titel}
                  variants={personCardItemVariants}
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
            variants={personCardContainerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {data?.vorstand.map(m => (
              <PersonCard
                key={m.name}
                name={m.name}
                bildUrl={m.bildUrl}
                label={m.rolle}
                onClick={() => setSelectedPerson(m)}
              />
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
              variants={personCardContainerVariants}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              className="grid grid-cols-1 gap-5"
            >
              {data.abgeordnete.map(a => (
                <motion.div
                  key={a.name}
                  variants={personCardItemVariants}
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
      <PersonSheet open={!!selectedPerson} onClose={() => setSelectedPerson(null)} person={selectedPerson} />
    </section>
  )
}
