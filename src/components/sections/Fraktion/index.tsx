import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useData } from '@/hooks/useData'
import { useHttpErrorRedirect } from '@/hooks/useHttpErrorRedirect'
import { useHaushaltsredenPagination } from '@/hooks/useHaushaltsredenPagination'
import { useSheetState } from '@/hooks/useSheetState'
import PersonSheet from '@/components/PersonSheet'
import SectionHeader from '@/components/SectionHeader'
import SubsectionLabel from '@/components/SubsectionLabel'
import { PersonGrid } from '@/components/PersonGrid'
import type { FraktionData, Gemeinderat } from './types'
import { HaushaltsredeCard, HaushaltsredePlaceholder } from './HaushaltsredeCards'
import { HaushaltsredenPagination } from './HaushaltsredenPagination'

export default function Fraktion() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const { data, error } = useData<FraktionData>('/data/fraktion.json')
  useHttpErrorRedirect(error)
  const { state: selectedMember, set: openMember, close: closeMember } = useSheetState<Gemeinderat | null>(null)

  const {
    paginatedJahre,
    filteredJahre,
    availableYears,
    visibleCount: visibleRedenCount,
    itemsPerPage,
    hasMore: hasMoreReden,
    loadMore: loadMoreReden,
    loadLess: loadLessReden,
  } = useHaushaltsredenPagination()

  return (
    <section id="fraktion" className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionRef={ref}
          isInView={isInView}
          label="Fraktion"
          title="SPD-Fraktion im Gemeinderat"
          description={data?.beschreibung}
        />

        <PersonGrid
          label="Gemeinderäte"
          countLabel={data ? `${data.gemeinderaete.length} Mitglieder` : undefined}
          members={data?.gemeinderaete}
          isInView={isInView}
          animationDelay={0.2}
          onSelect={openMember}
          renderCardProps={m => ({ sublabel: `seit ${m.seit}` })}
        />

        <PersonGrid
          label="Kreisrat"
          countLabel={data ? 'Zollernalbkreis' : undefined}
          members={data?.kreisraete}
          isInView={isInView}
          animationDelay={0.3}
          onSelect={openMember}
          renderCardProps={m => ({ sublabel: `seit ${m.seit}` })}
        />

        {/* Haushaltsreden */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-20"
        >
          <SubsectionLabel
            label="Dokumente"
            title="Haushaltsreden"
            isInView={isInView}
            delay={0.5}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {paginatedJahre.map(year => {
              const isAvailable = availableYears === null || availableYears.has(year)
              return isAvailable ? (
                <HaushaltsredeCard key={year} year={year} />
              ) : (
                <HaushaltsredePlaceholder key={year} year={year} />
              )
            })}
          </div>
          <HaushaltsredenPagination
            total={filteredJahre.length}
            visibleCount={visibleRedenCount}
            itemsPerPage={itemsPerPage}
            hasMore={hasMoreReden}
            onLoadMore={loadMoreReden}
            onLoadLess={loadLessReden}
          />
        </motion.div>
      </div>

      <PersonSheet
        open={selectedMember !== null}
        onClose={closeMember}
        person={selectedMember}
      />
    </section>
  )
}
