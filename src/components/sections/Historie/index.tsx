import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { useSectionView } from '@/hooks/useSectionView'
import Sheet from '@/components/Sheet'
import PersonSheet from '@/components/PersonSheet'
import SectionHeader from '@/components/SectionHeader'
import { SkeletonGrid } from '@/components/SkeletonGrid'
import SectionContainer from '@/components/SectionContainer'
import { TIMELINE_TYPE_META } from './types'
import { TimelineRow } from './TimelineRow'
import { EventSheet } from './EventSheet'
import { useHistorie } from '@/hooks/useHistorie'

export default function Historie() {
  const { jahreSlug } = useParams<{ jahreSlug?: string }>()
  const { ref, isInView } = useSectionView()
  const { data, merged, sheet, openEvent, openPerson, closeSheet } = useHistorie(jahreSlug)

  return (
    <>
      {sheet.type === 'event' && (
        <Helmet>
          <title>
            {sheet.entry.titel} ({sheet.entry.jahr}) – SPD Albstadt
          </title>
          <meta name="description" content={sheet.entry.beschreibung.slice(0, 160)} />
          <link rel="canonical" href={`https://www.spd-albstadt.de/historie/${jahreSlug}`} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={`https://www.spd-albstadt.de/historie/${jahreSlug}`} />
          <meta
            property="og:title"
            content={`${sheet.entry.titel} (${sheet.entry.jahr}) – SPD Albstadt`}
          />
          <meta property="og:description" content={sheet.entry.beschreibung.slice(0, 160)} />
          <meta property="og:locale" content="de_DE" />
          <meta property="og:site_name" content="SPD Albstadt" />
          <meta name="twitter:card" content="summary" />
          <meta
            name="twitter:title"
            content={`${sheet.entry.titel} (${sheet.entry.jahr}) – SPD Albstadt`}
          />
          <meta name="twitter:description" content={sheet.entry.beschreibung.slice(0, 160)} />
        </Helmet>
      )}

      <SectionContainer id="historie">
        <SectionHeader
          sectionRef={ref}
          isInView={isInView}
          label="Historie"
          title="Geschichte der SPD Albstadt"
          description={data?.einleitung}
          descriptionClassName="max-w-3xl leading-relaxed"
        />

        {/* Legend */}
        {merged.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-6 mb-12 text-xs text-gray-400 dark:text-gray-500"
          >
            {Object.values(TIMELINE_TYPE_META).map(({ label, legendDotClass }) => (
              <span key={label} className="flex items-center gap-2">
                <span className={`${legendDotClass} inline-block`} /> {label}
              </span>
            ))}
          </motion.div>
        )}

        {/* Unified timeline */}
        {merged.length > 0 && (
          <div className="relative">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.3 }}
              style={{ originY: 0 }}
              className="absolute left-2 md:left-1/2 top-0 bottom-0 w-px bg-linear-to-b from-spd-red/60 via-spd-red/50 to-spd-red/30 md:-translate-x-px"
            />
            <div className="space-y-10 relative">
              {merged.map((item, i) => (
                <TimelineRow
                  key={item.type === 'event' ? `e-${item.data.jahr}` : `p-${item.data.name}`}
                  item={item}
                  index={i}
                  onOpenEvent={openEvent}
                  onOpenPerson={openPerson}
                />
              ))}
            </div>
          </div>
        )}

        {!data && (
          <div className="space-y-10">
            <SkeletonGrid count={4} itemClassName="h-24" />
          </div>
        )}
      </SectionContainer>

      <Sheet open={sheet.type === 'event'} onClose={closeSheet} size="lg">
        {sheet.type === 'event' && <EventSheet entry={sheet.entry} />}
      </Sheet>

      <PersonSheet
        open={sheet.type === 'person'}
        onClose={closeSheet}
        person={sheet.type === 'person' ? sheet.person : null}
      />
    </>
  )
}
