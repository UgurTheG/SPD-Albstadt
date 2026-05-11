import { Building2, ExternalLink, Hash, Mail, MapPin, Phone } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import Sheet from './Sheet'
import PhotoGallery from './PhotoGallery'
import type { PersonSheetData } from '../types/person'
import { getInitials } from '@/utils/getInitials'

export type { PersonSheetData }

interface ContactRowProps {
  icon: ComponentType<{ size?: number; className?: string }>
  label?: string
  value: ReactNode
  href?: string
  target?: '_blank'
  rel?: string
}

function ContactRow({ icon: Icon, label, value, href, target, rel }: ContactRowProps) {
  const inner = (
    <>
      <div className="w-8 h-8 rounded-xl bg-spd-red/8 dark:bg-spd-red/12 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-spd-red" />
      </div>
      {label ? (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{value}</p>
        </div>
      ) : (
        <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
      )}
    </>
  )

  const base = 'flex items-center gap-3.5 px-4 py-3.5'

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={`${base} hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors`}
      >
        {inner}
      </a>
    )
  }

  return <div className={base}>{inner}</div>
}

interface Props {
  person: PersonSheetData | null
  open: boolean
  onClose: () => void
}

export default function PersonSheet({ person, open, onClose }: Props) {
  const label = person?.rolle ?? person?.beruf

  return (
    <Sheet open={open} onClose={onClose}>
      {person && (
        <div
          className="landscape-compact:flex
                        landscape-compact:flex-row
                        landscape-compact:min-h-0
                        landscape-compact:h-full"
        >
          {/* ── Hero image ── */}
          <div
            className="relative overflow-hidden bg-gray-900
                          landscape-compact:w-1/2
                          landscape-compact:shrink-0"
          >
            {person.bildUrl ? (
              <img
                src={person.bildUrl}
                alt={person.name}
                loading="lazy"
                className="w-full block object-cover object-top
                           max-h-[58dvh] sm:max-h-[70dvh]
                           landscape-compact:max-h-none
                           landscape-compact:h-full"
              />
            ) : (
              <div
                className="w-full aspect-square
                              landscape-compact:aspect-auto
                              landscape-compact:h-full
                              bg-linear-to-br from-spd-red to-spd-red-dark
                              flex items-center justify-center"
              >
                <span className="text-6xl font-bold text-white/90">{getInitials(person.name)}</span>
              </div>
            )}

            {/* Gradient overlay */}
            <div
              className="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/50 to-gray-900/10
                            landscape-compact:bg-none"
            />

            {/* Name overlay — portrait only */}
            <div
              className="absolute bottom-0 inset-x-0 px-6 pb-7
                            landscape-compact:hidden"
            >
              {label && (
                <p className="text-[11px] font-medium tracking-wide text-white/50 mb-1">{label}</p>
              )}
              <h3 className="font-black text-white text-2xl leading-snug">{person.name}</h3>
              {person.wahlkreis && <p className="text-sm text-white/60 mt-1">{person.wahlkreis}</p>}
              {person.jahre && <p className="text-sm text-white/60 mt-1">{person.jahre}</p>}
              {person.seit && <p className="text-sm text-white/60 mt-1">seit {person.seit}</p>}
              {person.listenplatz != null && (
                <p className="text-sm text-white/60 mt-1">Listenplatz {person.listenplatz}</p>
              )}
              {person.stadt && <p className="text-sm text-white/60 mt-1">{person.stadt}</p>}
            </div>
          </div>

          {/* ── Body ── */}
          <div
            className="px-6 pt-6 pb-8 space-y-6
                          landscape-compact:flex-1
                          landscape-compact:overflow-y-auto
                          landscape-compact:px-5
                          landscape-compact:py-5"
          >
            {/* Name + meta — landscape only */}
            <div className="hidden landscape-compact:block">
              {label && (
                <p className="text-[11px] font-medium tracking-wide text-gray-500 dark:text-white/50 mb-0.5">
                  {label}
                </p>
              )}
              <h3 className="font-black text-gray-900 dark:text-white text-xl leading-snug">
                {person.name}
              </h3>
              {person.wahlkreis && (
                <p className="text-sm text-gray-500 dark:text-white/60 mt-0.5">
                  {person.wahlkreis}
                </p>
              )}
              {person.jahre && (
                <p className="text-sm text-gray-500 dark:text-white/60 mt-0.5">{person.jahre}</p>
              )}
              {person.seit && (
                <p className="text-sm text-gray-500 dark:text-white/60 mt-0.5">
                  seit {person.seit}
                </p>
              )}
              {person.listenplatz != null && (
                <p className="text-sm text-gray-500 dark:text-white/60 mt-0.5">
                  Listenplatz {person.listenplatz}
                </p>
              )}
              {person.stadt && (
                <p className="text-sm text-gray-500 dark:text-white/60 mt-0.5">{person.stadt}</p>
              )}
            </div>

            <div className="w-8 h-0.5 bg-spd-red rounded-full" />

            {/* Extra photo gallery */}
            {person.bildUrls && person.bildUrls.length > 0 && (
              <div>
                <PhotoGallery images={person.bildUrls} alt={person.name} />
              </div>
            )}

            {/* Bio / description */}
            {(person.bio || person.beschreibung) && (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {person.bio ?? person.beschreibung}
              </p>
            )}

            {/* Contact rows */}
            {(person.listenplatz != null ||
              person.stadt ||
              person.address ||
              person.place ||
              person.zipCode ||
              person.phone ||
              person.email ||
              person.website) && (
              <div
                className="rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800
                              border border-gray-100 dark:border-gray-800"
              >
                {person.listenplatz != null && (
                  <ContactRow icon={Hash} label="Listenplatz" value={person.listenplatz} />
                )}
                {person.stadt && (
                  <ContactRow icon={Building2} label="Stadt / Ortsteil" value={person.stadt} />
                )}
                {person.address && <ContactRow icon={MapPin} value={person.address} />}
                {(person.place || person.zipCode) && (
                  <ContactRow icon={Building2} value={person.place ?? person.zipCode} />
                )}
                {person.phone && (
                  <ContactRow
                    icon={Phone}
                    value={person.phone}
                    href={`tel:${person.phone.replace(/\s/g, '')}`}
                  />
                )}
                {person.email && (
                  <ContactRow icon={Mail} value={person.email} href={`mailto:${person.email}`} />
                )}
                {person.website && (
                  <ContactRow
                    icon={ExternalLink}
                    value={person.website.replace(/^https?:\/\//, '')}
                    href={person.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                )}
              </div>
            )}

            {/* Committee memberships */}
            {person.ausschuesse && person.ausschuesse.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-3">
                  Ausschüsse
                </p>
                <div className="flex flex-wrap gap-2">
                  {person.ausschuesse.map(a => (
                    <span
                      key={a}
                      className="text-xs text-gray-600 dark:text-gray-300
                                 bg-gray-50 dark:bg-gray-800
                                 border border-gray-100 dark:border-gray-700/50
                                 px-3 py-1.5 rounded-xl font-medium"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
