import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useSectionPage } from '@/hooks/useSectionPage'
import { useSheetState } from '@/hooks/useSheetState'
import PersonSheet from '@/components/PersonSheet'
import PersonCard from '@/components/PersonCard'
import { personCardContainerVariants } from '@/components/personCardVariants'
import SectionHeader from '@/components/SectionHeader'
import SubsectionLabel from '@/components/SubsectionLabel'
import { SkeletonGrid } from '@/components/SkeletonGrid'
import { slugify } from '@/utils/slugify'
import type { Mitglied, Abgeordneter, PartyData, Schwerpunkt } from './types'
import { AbgeordneterCard } from './AbgeordneterCard'
import { SchwerpunktCard } from './SchwerpunktCard'
import { SchwerpunktSheet } from './SchwerpunktSheet'
import SectionContainer from '@/components/SectionContainer'

// Static fallback used before party.json loads so SectionHeader always reserves
// the correct height for the description paragraph, preventing CLS.
const PARTEI_BESCHREIBUNG_FALLBACK =
  'Die SPD Albstadt ist der Stadtverband der Sozialdemokratischen Partei Deutschlands in Albstadt. ' +
  'Seit über 130 Jahren gestalten wir aktiv die Kommunalpolitik – für ein solidarisches, gerechtes und ' +
  'zukunftsorientiertes Albstadt. Ob Talgangbahn, bezahlbares Wohnen, Klimaschutz oder ' +
  'Bildungsgerechtigkeit: Wir sind die Stimme der Bürgerinnen und Bürger im Gemeinderat und setzen uns ' +
  'täglich dafür ein, dass Albstadt eine lebenswerte Stadt für alle bleibt. Werde Mitglied und gestalte mit!'

type SheetState =
  | { type: 'none' }
  | { type: 'person'; person: Mitglied | Abgeordneter }
  | { type: 'schwerpunkt'; schwerpunkt: Schwerpunkt }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Partei() {
  const { schwerpunktSlug } = useParams<{ schwerpunktSlug?: string }>()
  const navigate = useNavigate()
  const { ref, isInView, data } = useSectionPage<PartyData>('/data/party.json')
  const {
    state: sheet,
    set: setSheet,
    close: closeSheet,
  } = useSheetState<SheetState>({ type: 'none' })

  // Sync URL param → sheet state once data is loaded.
  useEffect(() => {
    if (!schwerpunktSlug || !data) return
    const match = data.schwerpunkte.find(s => slugify(s.titel) === schwerpunktSlug)
    if (match) {
      setSheet({ type: 'schwerpunkt', schwerpunkt: match })
    } else {
      navigate('/404', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schwerpunktSlug, data])

  function handleOpenSchwerpunkt(s: Schwerpunkt) {
    navigate(`/partei/${slugify(s.titel)}`)
  }

  function handleCloseSchwerpunkt() {
    closeSheet()
    navigate('/partei', { replace: true })
  }

  return (
    <>
      <SectionContainer id="partei">
        <SectionHeader
          sectionRef={ref}
          isInView={isInView}
          label="Partei"
          title="Die SPD Albstadt"
          description={data?.beschreibung ?? PARTEI_BESCHREIBUNG_FALLBACK}
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
                <SchwerpunktCard key={s.titel} s={s} onClick={() => handleOpenSchwerpunkt(s)} />
              ))}
              {!data && <SkeletonGrid count={6} itemClassName="h-48" />}
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
              {data?.vorstand.map((m, i) => (
                <PersonCard
                  key={m.name}
                  name={m.name}
                  bildUrl={m.bildUrl}
                  label={m.rolle}
                  priority={i === 0}
                  onClick={() => setSheet({ type: 'person', person: m })}
                />
              ))}
              {!data && <SkeletonGrid count={9} itemClassName="aspect-3/4" />}
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
                {data.abgeordnete.map((a, i) => (
                  <AbgeordneterCard
                    key={a.name}
                    a={a}
                    priority={i === 0}
                    onClick={() => setSheet({ type: 'person', person: a })}
                  />
                ))}
              </motion.div>
            )}
          </div>
        )}
      </SectionContainer>

      <PersonSheet
        open={sheet.type === 'person'}
        onClose={closeSheet}
        person={sheet.type === 'person' ? sheet.person : null}
      />

      <SchwerpunktSheet
        item={sheet.type === 'schwerpunkt' ? sheet.schwerpunkt : null}
        onClose={handleCloseSchwerpunkt}
      />
    </>
  )
}
