import {useEffect, useRef, useState} from 'react'
import {useLocation, useNavigate} from 'react-router-dom'
import {motion, useInView} from 'framer-motion'
import {FileText} from 'lucide-react'
import {useData} from '../../hooks/useData'
import {useHttpErrorRedirect} from '../../hooks/useHttpErrorRedirect'
import PersonSheet, {type PersonSheetData} from '../PersonSheet'
import PersonCard, {personCardContainerVariants} from '../PersonCard'
import SectionHeader from '../SectionHeader'

interface KommunalpolitikPerson {
  name: string
  rolle?: string
  bildUrl?: string
  email?: string
  bio?: string
  stadt?: string
}

interface Dokument {
  id: string
  titel: string
  url: string
}

interface KommunalpolitikJahr {
  id: string
  jahr: string
  aktiv: boolean
  gemeinderaete: KommunalpolitikPerson[]
  kreisraete: KommunalpolitikPerson[]
  dokumente?: Dokument[]
}

interface KommunalpolitikData {
  sichtbar: boolean
  beschreibung: string
  jahre: KommunalpolitikJahr[]
}

export default function Kommunalpolitik() {
  const ref = useRef(null)
  const isInView = useInView(ref, {once: true, margin: '-80px'})
  const navigate = useNavigate()
  const location = useLocation()
  const {data, error} = useData<KommunalpolitikData>('/data/kommunalpolitik.json')
  useHttpErrorRedirect(error)
  const [selectedPerson, setSelectedPerson] = useState<PersonSheetData | null>(null)

  useEffect(() => {
    if (data?.sichtbar === false && !location.pathname.startsWith('/admin')) {
      navigate('/', {replace: true})
    }
  }, [data, navigate, location.pathname])

  const aktiveJahre = data?.jahre.filter(j => j.aktiv) ?? []
  const [activeJahrId, setActiveJahrId] = useState<string | null>(null)
  const activeJahr = aktiveJahre.find(j => j.id === activeJahrId) ?? aktiveJahre[0] ?? null

  const gemeinderaete = activeJahr?.gemeinderaete ?? []
  const kreisraete = activeJahr?.kreisraete ?? []
  const dokumente = (activeJahr?.dokumente ?? []).filter(d => d.titel && d.url)
  const hasContent = gemeinderaete.length > 0 || kreisraete.length > 0 || dokumente.length > 0

  return (
    <section id="kommunalpolitik" className="py-24 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionRef={ref}
          isInView={isInView}
          label="Kommunalpolitik"
          title="Unsere Kommunalpolitiker"
          description={data?.beschreibung || undefined}
        />

        {/* Year selector */}
        {aktiveJahre.length > 1 && (
          <motion.div
            initial={{opacity: 0, y: 16}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{delay: 0.2}}
            className="flex flex-wrap gap-2 mb-10"
          >
            {aktiveJahre.map(j => (
              <button
                key={j.id}
                onClick={() => setActiveJahrId(j.id)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  j.id === (activeJahr?.id ?? null)
                    ? 'bg-spd-red text-white shadow-md shadow-spd-red/25'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {j.jahr}
              </button>
            ))}
          </motion.div>
        )}

        {activeJahr && (
          <motion.div
            key={activeJahr.id}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 0.3}}
          >
            {/* Gemeinderäte */}
            {gemeinderaete.length > 0 && (
              <div className="mb-20">
                <motion.div
                  initial={{opacity: 0}}
                  animate={isInView ? {opacity: 1} : {}}
                  transition={{delay: 0.2}}
                  className="mb-8"
                >
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Gemeinderatswahl {activeJahr.jahr}
                  </h3>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                    {gemeinderaete.length} {gemeinderaete.length === 1 ? 'Kandidat' : 'Kandidaten'}
                  </p>
                </motion.div>
                <motion.div
                  variants={personCardContainerVariants}
                  initial="hidden"
                  animate={isInView ? 'visible' : 'hidden'}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                >
                  {gemeinderaete.map((p, i) => (
                    <PersonCard
                      key={p.name}
                      name={p.name}
                      bildUrl={p.bildUrl}
                      label={p.rolle ? `Listenplatz ${i + 1} · ${p.rolle}` : `Listenplatz ${i + 1}`}
                      onClick={() => setSelectedPerson({...p, listenplatz: i + 1})}
                    />
                  ))}
                </motion.div>
              </div>
            )}

            {/* Kreisräte */}
            {kreisraete.length > 0 && (
              <div className="mb-20">
                <motion.div
                  initial={{opacity: 0}}
                  animate={isInView ? {opacity: 1} : {}}
                  transition={{delay: 0.3}}
                  className="mb-8"
                >
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Kreistagswahl {activeJahr.jahr}
                  </h3>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                    {kreisraete.length} {kreisraete.length === 1 ? 'Kandidat' : 'Kandidaten'}
                  </p>
                </motion.div>
                <motion.div
                  variants={personCardContainerVariants}
                  initial="hidden"
                  animate={isInView ? 'visible' : 'hidden'}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                >
                  {kreisraete.map((p, i) => (
                    <PersonCard
                      key={p.name}
                      name={p.name}
                      bildUrl={p.bildUrl}
                      label={p.rolle ? `Listenplatz ${i + 1} · ${p.rolle}` : `Listenplatz ${i + 1}`}
                      onClick={() => setSelectedPerson({...p, listenplatz: i + 1})}
                    />
                  ))}
                </motion.div>
              </div>
            )}

            {/* Dokumente */}
            {dokumente.length > 0 && (
              <motion.div
                initial={{opacity: 0, y: 16}}
                animate={isInView ? {opacity: 1, y: 0} : {}}
                transition={{delay: 0.35}}
                className="mb-16"
              >
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                  Dokumente {activeJahr.jahr}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {dokumente.map(dok => (
                    <a
                      key={dok.id}
                      href={dok.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-spd-red/40 hover:bg-spd-red/5 dark:hover:bg-spd-red/10 transition-all text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-spd-red dark:hover:text-spd-red shadow-sm hover:shadow-md"
                    >
                      <FileText size={15} className="shrink-0 text-spd-red"/>
                      {dok.titel}
                    </a>
                  ))}
                </div>
              </motion.div>
            )}

            {!hasContent && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">
                Noch keine Personen für dieses Jahr eingetragen.
              </p>
            )}
          </motion.div>
        )}

        {/* Skeleton while loading */}
        {!data && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-64 animate-pulse"/>
            ))}
          </div>
        )}
      </div>

      <PersonSheet
        open={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        person={selectedPerson}
      />
    </section>
  )
}
