import { useRef, useReducer } from 'react'
import { motion, useInView } from 'framer-motion'
import { useData } from '@/hooks/useData'
import { useHttpErrorRedirect } from '@/hooks/useHttpErrorRedirect'
import PersonSheet from '@/components/PersonSheet'
import PersonCard from '@/components/PersonCard'
import { personCardContainerVariants } from '@/components/personCardVariants'
import SectionHeader from '@/components/SectionHeader'
import SubsectionLabel from '@/components/SubsectionLabel'
import { SkeletonGrid } from '@/components/SkeletonGrid'
import type { Mitglied, Abgeordneter, PartyData, Schwerpunkt } from './types'
import { AbgeordneterCard } from './AbgeordneterCard'
import { SchwerpunktCard } from './SchwerpunktCard'
import { SchwerpunktSheet } from './SchwerpunktSheet'

// ---------------------------------------------------------------------------
// Sheet state machine
// ---------------------------------------------------------------------------

type SheetState =
  | { type: 'none' }
  | { type: 'person'; person: Mitglied | Abgeordneter }
  | { type: 'schwerpunkt'; schwerpunkt: Schwerpunkt }

type SheetAction =
  | { type: 'openPerson'; person: Mitglied | Abgeordneter }
  | { type: 'openSchwerpunkt'; schwerpunkt: Schwerpunkt }
  | { type: 'close' }

function sheetReducer(_: SheetState, action: SheetAction): SheetState {
  switch (action.type) {
    case 'openPerson':
      return { type: 'person', person: action.person }
    case 'openSchwerpunkt':
      return { type: 'schwerpunkt', schwerpunkt: action.schwerpunkt }
    case 'close':
      return { type: 'none' }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Partei() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const { data, error } = useData<PartyData>('/data/party.json')
  useHttpErrorRedirect(error)
  const [sheet, dispatch] = useReducer(sheetReducer, { type: 'none' })

  return (
    <section id="partei" className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionRef={ref}
          isInView={isInView}
          label="Partei"
          title="Die SPD Albstadt"
          description={data?.beschreibung}
        />

        {/* Schwerpunkte — hidden while loading skeleton shows, hidden when empty */}
        {(!data || data.schwerpunkte.length > 0) && (
          <div className="mb-20">
            <SubsectionLabel label="Unsere Schwerpunkte" isInView={isInView} delay={0.2} />
            <motion.div
              variants={personCardContainerVariants}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {data?.schwerpunkte.map(s => (
                <SchwerpunktCard
                  key={s.titel}
                  s={s}
                  onClick={() => dispatch({ type: 'openSchwerpunkt', schwerpunkt: s })}
                />
              ))}
              {!data && <SkeletonGrid count={6} />}
            </motion.div>
          </div>
        )}

        {/* Vorstand — hidden when empty */}
        {(!data || data.vorstand.length > 0) && (
          <div className="mb-20">
            <SubsectionLabel label="Vorstand" isInView={isInView} delay={0.3} />
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
                  onClick={() => dispatch({ type: 'openPerson', person: m })}
                />
              ))}
              {!data && <SkeletonGrid count={4} itemClassName="h-64" />}
            </motion.div>
          </div>
        )}

        {/* Abgeordnete — shown while loading (skeleton) or when data has entries */}
        {(!data || data.abgeordnete.length > 0) && (
          <div>
            <SubsectionLabel label="Abgeordnete" isInView={isInView} delay={0.4} />
            {!data ? (
              <div className="grid grid-cols-1 gap-5">
                <SkeletonGrid count={1} itemClassName="h-48" />
              </div>
            ) : (
              <motion.div
                variants={personCardContainerVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                className="grid grid-cols-1 gap-5"
              >
                {data.abgeordnete.map(a => (
                  <AbgeordneterCard
                    key={a.name}
                    a={a}
                    onClick={() => dispatch({ type: 'openPerson', person: a })}
                  />
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>

      <PersonSheet
        open={sheet.type === 'person'}
        onClose={() => dispatch({ type: 'close' })}
        person={sheet.type === 'person' ? sheet.person : null}
      />

      <SchwerpunktSheet
        item={sheet.type === 'schwerpunkt' ? sheet.schwerpunkt : null}
        onClose={() => dispatch({ type: 'close' })}
      />
    </section>
  )
}
