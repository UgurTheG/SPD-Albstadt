import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useConfig } from '@/hooks/useConfig'
import SectionHeader from '@/components/SectionHeader'
import { GridBackground } from '@/components/GridBackground'
import { toTelLink } from '@/utils/formatPhone'
import { ContactInfoPanel } from './ContactInfoPanel'
import { OfficeHoursPanel } from './OfficeHoursPanel'
import { KontaktForm } from './KontaktForm'
import { DEFAULT_ADRESSE, DEFAULT_EMAIL, DEFAULT_TELEFON, DEFAULT_BUEROZEITEN } from './constants'

export default function Kontakt() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const config = useConfig()

  const kontakt = config?.kontakt
  const buerozeiten = config?.buerozeiten ?? DEFAULT_BUEROZEITEN
  const adresseLines = (kontakt?.adresse ?? DEFAULT_ADRESSE).split('\n')
  const email = kontakt?.email ?? DEFAULT_EMAIL
  const telefon = kontakt?.telefon ?? DEFAULT_TELEFON
  const telefonLink = toTelLink(telefon)

  return (
    <section id="kontakt" className="py-24 bg-gray-50 dark:bg-red-950 relative overflow-hidden">
      {/* Background decoration */}
      <GridBackground id="kontakt-grid" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <SectionHeader
          sectionRef={ref}
          isInView={isInView}
          label="Kontakt"
          title="Schreiben Sie uns"
          description="Haben Sie Fragen, Anregungen oder möchten Sie Mitglied werden? Wir freuen uns auf Ihre Nachricht."
          mb="mb-12"
          descriptionClassName="max-w-2xl"
          inverted
        />

        <div className="grid lg:grid-cols-5 gap-8 items-stretch">
          {/* Form — 3 columns */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col"
          >
            <KontaktForm />
          </motion.div>

          {/* Contact info — 2 columns */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-2 flex flex-col gap-6"
          >
            {/* Group photo — hidden on small landscape screens where height is very limited */}
            <div className="rounded-2xl overflow-hidden ring-1 ring-gray-200 dark:ring-white/10 shadow-sm landscape-compact:hidden">
              <img
                src={kontakt?.gruppenbild || '/images/kontakt/gruppenbild.webp'}
                alt="SPD Albstadt – Gruppenbild"
                className="w-full h-auto block max-h-56 object-cover object-center"
              />
            </div>

            <ContactInfoPanel
              adresseLines={adresseLines}
              email={email}
              telefon={telefon}
              telefonLink={telefonLink}
            />

            <OfficeHoursPanel buerozeiten={buerozeiten} />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
