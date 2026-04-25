import {useEffect, useMemo, useRef, useState} from 'react'
import {motion, useInView} from 'framer-motion'
import {FileDown} from 'lucide-react'
import {fetchData, useData} from '../../hooks/useData'
import {useHttpErrorRedirect} from '../../hooks/useHttpErrorRedirect'
import PersonSheet from '../PersonSheet'
import PersonCard, {personCardContainerVariants} from '../PersonCard'
import SectionHeader from '../SectionHeader'
import {useItemsPerPageMulti} from '../../utils/useItemsPerPage'

interface Gemeinderat {
  name: string
  beruf?: string
  bildUrl: string
  seit: string
  address?: string
  zipCode?: string
  email?: string
  ausschuesse: string[]
  bio?: string
}

interface FraktionData {
  beschreibung: string
  gemeinderaete: Gemeinderat[]
  kreisraete: Gemeinderat[]
}

export default function Fraktion() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const {data, error} = useData<FraktionData>('/data/fraktion.json')
  useHttpErrorRedirect(error)
  const [selectedMember, setSelectedMember] = useState<Gemeinderat | null>(null)
  // items per page = 2 full rows at every grid breakpoint (always an even number)
  // grid: 2 cols (xs) → 4 | 3 cols (sm 640) → 6 | 4 cols (md 768) → 8 | 5 cols (lg 1024) → 10
  const itemsPerPage = useItemsPerPageMulti([[1024, 10], [768, 8], [640, 6]], 4)
  const [visibleRedenCount, setVisibleRedenCount] = useState(itemsPerPage)
  useEffect(() => { setVisibleRedenCount(itemsPerPage) }, [itemsPerPage])
  const [availableYears, setAvailableYears] = useState<Set<number> | null>(null)
  const [disabledYears, setDisabledYears] = useState<Set<number>>(new Set([2013, 2015]))

  const alleReden = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years: number[] = []
    for (let y = currentYear; y >= 2010; y--) years.push(y)
    return years
  }, [])

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const results = await Promise.all(
        alleReden.map(async year => {
          try {
            const r = await fetch(`/documents/fraktion/haushaltsreden/${year}.pdf`, { method: 'HEAD' })
            const ct = r.headers.get('content-type') ?? ''
            // In dev Vite's SPA fallback returns 200+text/html for missing files;
            // real PDFs return application/pdf. In production missing files return 404.
            return (r.ok && !ct.includes('text/html')) ? year : null
          } catch {
            return null
          }
        })
      )
      if (!cancelled) {
        setAvailableYears(new Set(results.filter((y): y is number => y !== null)))
      }
    }
    check()
    // Fetch disabled years config
    fetchData<{disabledYears?: number[]}>('/data/haushaltsreden.json')
      .then(data => { if (!cancelled && data?.disabledYears) setDisabledYears(new Set(data.disabledYears)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [alleReden])

  // Filter out years that have no PDF and are explicitly disabled by the admin
  const visibleReden = alleReden.filter(year =>
    availableYears === null || availableYears.has(year) || !disabledYears.has(year)
  )
  const sichtbareReden = visibleReden.slice(0, visibleRedenCount)
  const hasMoreReden = visibleRedenCount < visibleReden.length

  return (
    <section id="fraktion" className="py-24 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <SectionHeader
          sectionRef={ref}
          isInView={isInView}
          label="Fraktion"
          title="SPD-Fraktion im Gemeinderat"
          description={data?.beschreibung}
        />

        {/* Gemeinderäte */}
        <div className="mb-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 mb-8"
          >
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Gemeinderäte
              </h3>
              {data && (
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {data.gemeinderaete.length} Mitglieder
                </p>
              )}
            </div>
          </motion.div>

          <motion.div
            variants={personCardContainerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {data?.gemeinderaete.map(m => (
              <PersonCard key={m.name} name={m.name} bildUrl={m.bildUrl} label={m.beruf} sublabel={`seit ${m.seit}`} onClick={() => setSelectedMember(m)} />
            ))}
            {!data && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-64 animate-pulse" />
            ))}
          </motion.div>
        </div>

        {/* Kreisräte */}
        <div className="mb-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4 mb-8"
          >
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Kreisrat
              </h3>
              {data && (
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  Zollernalbkreis
                </p>
              )}
            </div>
          </motion.div>

          <motion.div
            variants={personCardContainerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {data?.kreisraete.map(m => (
              <PersonCard key={m.name} name={m.name} bildUrl={m.bildUrl} label={m.beruf} sublabel={`seit ${m.seit}`} onClick={() => setSelectedMember(m)} />
            ))}
          </motion.div>
        </div>

        {/* Haushaltsreden */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-20"
        >
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
            Dokumente
          </h3>
          <p className="text-2xl font-black text-gray-900 dark:text-white mb-8">Haushaltsreden</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {sichtbareReden.map(year => {
              const isAvailable = availableYears === null || availableYears.has(year)
              if (!isAvailable) {
                return (
                  <div
                    key={year}
                    className="flex flex-col items-center gap-2.5 p-4
                               bg-gray-50 dark:bg-gray-800/30 rounded-2xl
                               border border-dashed border-gray-200 dark:border-gray-800
                               select-none"
                  >
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800/60 rounded-xl flex items-center justify-center">
                      <FileDown size={18} className="text-gray-300 dark:text-gray-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-gray-300 dark:text-gray-600 text-sm">{year}</p>
                      <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5 font-medium uppercase tracking-wider">Demnächst</p>
                    </div>
                  </div>
                )
              }
              return (
                <a
                  key={year}
                  href={`/documents/fraktion/haushaltsreden/${year}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-2.5 p-4
                             bg-white dark:bg-gray-800/60 rounded-2xl
                             border border-gray-100 dark:border-gray-800/80
                             shadow-sm dark:shadow-black/20
                             hover:shadow-lg
                             hover:-translate-y-0.5
                             transition-all duration-400"
                >
                  <div className="w-10 h-10 bg-spd-red/8 dark:bg-spd-red/12 rounded-xl flex items-center justify-center">
                    <FileDown size={18} className="text-spd-red" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-gray-900 dark:text-white text-sm">{year}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium uppercase tracking-wider">PDF</p>
                  </div>
                </a>
              )
            })}
          </div>
          {visibleReden.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {Math.min(visibleRedenCount, visibleReden.length)} von {visibleReden.length} Haushaltsreden
              </span>
              <div className="flex gap-2">
                {visibleRedenCount > itemsPerPage && (
                  <button
                    onClick={() => setVisibleRedenCount(v => Math.max(itemsPerPage, v - itemsPerPage))}
                    className="text-xs font-semibold text-gray-400 hover:text-spd-red transition-colors px-3 py-1.5 rounded-lg hover:bg-spd-red/5"
                  >
                    ↑ Weniger
                  </button>
                )}
                {hasMoreReden && (
                  <button
                    onClick={() => setVisibleRedenCount(v => v + itemsPerPage)}
                    className="text-xs font-semibold text-spd-red border border-spd-red/30 hover:bg-spd-red hover:text-white transition-all px-3 py-1.5 rounded-lg"
                  >
                    Mehr laden ↓
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>

      </div>


      {/* Member detail sheet */}
      <PersonSheet open={!!selectedMember} onClose={() => setSelectedMember(null)} person={selectedMember} />

    </section>
  )
}
