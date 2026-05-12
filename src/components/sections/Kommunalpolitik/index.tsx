import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSectionPage } from '@/hooks/useSectionPage'
import { useSheetState } from '@/hooks/useSheetState'
import PersonSheet from '@/components/PersonSheet'
import type { PersonSheetData } from '@/types/person'
import { PersonGrid } from '@/components/PersonGrid'
import SectionHeader from '@/components/SectionHeader'
import { SkeletonGrid } from '@/components/SkeletonGrid'
import SectionContainer from '@/components/SectionContainer'
import type { KommunalpolitikData, KommunalpolitikPerson } from './types'
import { DokumentCard } from './DokumentCard'

export default function Kommunalpolitik() {
  const { ref, isInView, data } = useSectionPage<KommunalpolitikData>('/data/kommunalpolitik.json')
  const navigate = useNavigate()
  const location = useLocation()
  const {
    state: selectedPerson,
    set: setSelectedPerson,
    close: closePerson,
  } = useSheetState<PersonSheetData | null>(null)

  useEffect(() => {
    if (data?.sichtbar === false && !location.pathname.startsWith('/admin')) {
      navigate('/', { replace: true })
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
    <>
      <SectionContainer id="kommunalpolitik" className="bg-white dark:bg-gray-950">
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
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <PersonGrid<KommunalpolitikPerson>
              label={`Gemeinderatswahl ${activeJahr.jahr}`}
              countLabel={`${gemeinderaete.length} ${gemeinderaete.length === 1 ? 'Kandidat' : 'Kandidaten'}`}
              members={gemeinderaete}
              isInView={isInView}
              animationDelay={0.2}
              onSelect={(p, i) => setSelectedPerson({ ...p, listenplatz: i + 1 })}
              renderCardProps={(p, i) => ({
                label: p.rolle ? `Listenplatz ${i + 1} · ${p.rolle}` : `Listenplatz ${i + 1}`,
              })}
            />

            <PersonGrid<KommunalpolitikPerson>
              label={`Kreistagswahl ${activeJahr.jahr}`}
              countLabel={`${kreisraete.length} ${kreisraete.length === 1 ? 'Kandidat' : 'Kandidaten'}`}
              members={kreisraete}
              isInView={isInView}
              animationDelay={0.3}
              onSelect={(p, i) => setSelectedPerson({ ...p, listenplatz: i + 1 })}
              renderCardProps={(p, i) => ({
                label: p.rolle ? `Listenplatz ${i + 1} · ${p.rolle}` : `Listenplatz ${i + 1}`,
              })}
            />

            {/* Dokumente */}
            {dokumente.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="mb-16"
              >
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                  Dokumente
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {dokumente.map(dok => (
                    <DokumentCard key={dok.id} dok={dok} />
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
            <SkeletonGrid count={4} itemClassName="h-64" />
          </div>
        )}
      </SectionContainer>

      <PersonSheet open={!!selectedPerson} onClose={closePerson} person={selectedPerson} />
    </>
  )
}
