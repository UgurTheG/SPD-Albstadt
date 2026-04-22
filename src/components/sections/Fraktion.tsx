import {useEffect, useMemo, useRef, useState} from 'react'
import {motion, useInView, type Variants} from 'framer-motion'
import {Building2, ExternalLink, FileDown, Mail, MapPin} from 'lucide-react'
import {fetchData, useData} from '../../hooks/useData'
import {useHttpErrorRedirect} from '../../hooks/useHttpErrorRedirect'
import Sheet from '../Sheet'
import PhotoGallery from '../PhotoGallery'
import {useFeatures} from '../../hooks/useFeatures'

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

interface FraktionNews {
  id: string
  datum: string
  titel: string
  inhalt: string
  bildUrl?: string
}

interface FraktionData {
  beschreibung: string
  gemeinderaete: Gemeinderat[]
  kreisraete: Gemeinderat[]
  news: FraktionNews[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function Avatar({ name, imageUrl, size = 'md' }: { name: string; imageUrl?: string; size?: 'sm' | 'md' | 'lg' | 'xl' | 'card' }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const sizeClasses: Record<string, string> = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-16 h-16 text-xl',
    lg: 'w-24 h-24 text-3xl',
    xl: 'w-32 h-32 text-4xl',
    card: 'w-full h-full text-4xl',
  }
  const cls = sizeClasses[size]
  const rounded = size === 'card' ? '' : 'rounded-full'
  if (imageUrl) {
    return <img loading="lazy" src={imageUrl} alt={name} className={`${cls} ${rounded} object-cover`} />
  }
  return (
    <div className={`${cls} ${rounded} bg-spd-red flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  )
}


const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

function MemberCard({ member, onClick }: { member: Gemeinderat; onClick: () => void }) {
  const images = member.bildUrl ? [member.bildUrl] : []
  return (
    <motion.div
      variants={itemVariants}
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden cursor-pointer
                 bg-gray-950 transform-gpu
                 shadow-[0_4px_20px_rgba(0,0,0,0.55)]
                 hover:shadow-[0_8px_36px_rgba(0,0,0,0.7)] hover:-translate-y-1
                 transition-all duration-500"
    >
      {images.length > 0 ? (
        <div className="aspect-3/4 [@media(orientation:landscape)_and_(max-height:600px)]:aspect-[4/3] overflow-hidden">
          <img loading="lazy" src={images[0]} alt={member.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        </div>
      ) : (
        <div className="aspect-3/4 [@media(orientation:landscape)_and_(max-height:600px)]:aspect-[4/3] overflow-hidden">
          <Avatar name={member.name} size="card" />
        </div>
      )}
      {/* Cinematic gradient */}
      <div className="absolute inset-0 bg-linear-to-t from-gray-950 via-gray-950/40 to-transparent pointer-events-none" />
      {/* Info overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 pointer-events-none">
        {member.beruf && (
          <p className="text-[10px] sm:text-[11px] font-medium tracking-wide text-white/50 mb-0.5">{member.beruf}</p>
        )}
        <h4 className="font-extrabold text-white text-base sm:text-lg leading-tight">{member.name}</h4>
        <p className="text-[10px] font-medium text-white/35 mt-1 tracking-wide">seit {member.seit}</p>
        <span className="inline-flex items-center text-[11px] font-semibold text-white/50 group-hover:text-spd-red transition-colors duration-300 mt-2">Mehr anzeigen →</span>
      </div>
    </motion.div>
  )
}

export default function Fraktion() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const features = useFeatures()
  const {data, error} = useData<FraktionData>('/data/fraktion.json')
  useHttpErrorRedirect(error)
  const [selectedMember, setSelectedMember] = useState<Gemeinderat | null>(null)
  const [selectedFraktionNews, setSelectedFraktionNews] = useState<FraktionNews | null>(null)
  const [visibleRedenCount, setVisibleRedenCount] = useState(5)
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
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative mb-16"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-1 w-12 bg-spd-red rounded-full" />
            <span className="text-spd-red font-semibold text-sm uppercase tracking-wider">Fraktion</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-6 text-left">
            SPD-Fraktion im Gemeinderat
          </h2>
          {data && (
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-3xl leading-relaxed whitespace-pre-line">
              {data.beschreibung}
            </p>
          )}
        </motion.div>

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
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {data?.gemeinderaete.map(m => (
              <MemberCard key={m.name} member={m} onClick={() => setSelectedMember(m)} />
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
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {data?.kreisraete.map(m => (
              <MemberCard key={m.name} member={m} onClick={() => setSelectedMember(m)} />
            ))}
          </motion.div>
        </div>

        {/* Fraktion News */}
        {features.FRAKTION_NEWS && data?.news && data.news.length > 0 && (
          <div className="mb-20">
            <motion.h3
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-8"
            >
              Neues aus der Fraktion
            </motion.h3>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {data.news.map(n => (
                <motion.div
                  key={n.id}
                  variants={itemVariants}
                  onClick={() => setSelectedFraktionNews(n)}
                  className="group rounded-2xl overflow-hidden cursor-pointer
                             bg-white dark:bg-gray-800/50
                             border border-gray-100 dark:border-gray-800/80
                             shadow-sm dark:shadow-black/20
                             hover:shadow-lg
                             hover:-translate-y-1
                             transition-all duration-500"
                >
                  {n.bildUrl && (
                      <div className="aspect-4/3 overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img loading="lazy" src={n.bildUrl} alt={n.titel}
                           className="w-full h-full object-cover"/>
                    </div>
                  )}
                  <div className="p-5 sm:p-6">
                    <time className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-3 block uppercase tracking-wider">{formatDate(n.datum)}</time>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 leading-snug">{n.titel}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">{n.inhalt}</p>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80">
                      <span className="text-[11px] font-semibold text-spd-red flex items-center gap-1">
                        Weiterlesen →
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

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
          {visibleReden.length > 5 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {Math.min(visibleRedenCount, visibleReden.length)} von {visibleReden.length} Haushaltsreden
              </span>
              <div className="flex gap-2">
                {visibleRedenCount > 5 && (
                  <button
                    onClick={() => setVisibleRedenCount(v => Math.max(5, v - 5))}
                    className="text-xs font-semibold text-gray-400 hover:text-spd-red transition-colors px-3 py-1.5 rounded-lg hover:bg-spd-red/5"
                  >
                    ↑ Weniger
                  </button>
                )}
                {hasMoreReden && (
                  <button
                    onClick={() => setVisibleRedenCount(v => v + 5)}
                    className="text-xs font-semibold text-spd-red border border-spd-red/30 hover:bg-spd-red hover:text-white transition-all px-3 py-1.5 rounded-lg"
                  >
                    Mehr laden ↓
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Flyer */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <p className="text-2xl font-black text-gray-900 dark:text-white mb-8">Kommunalwahl 2024 – Flyer</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: 'Gemeinderatsliste 2024', file: 'SPD_Albstadt_Flyer_Kommunalwahl_2024_Gemeinderat.pdf' },
              { label: 'Kreistagsliste 2024',    file: 'SPD_Albstadt_Flyer_Kommunalwahl__2024_Kreistag.pdf' },
            ].map(({ label, file }) => (
              <a
                key={file}
                href={`/documents/fraktion/flyer/${file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-5
                           bg-white dark:bg-gray-800/60 rounded-2xl
                           border border-gray-100 dark:border-gray-800/80
                           shadow-sm dark:shadow-black/20
                           hover:shadow-lg
                           hover:-translate-y-0.5
                           transition-all duration-400"
              >
                <div className="w-12 h-12 bg-spd-red/8 dark:bg-spd-red/12 rounded-xl flex items-center justify-center shrink-0">
                  <FileDown size={20} className="text-spd-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">PDF herunterladen</p>
                </div>
                <ExternalLink size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
              </a>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Fraktion news detail sheet */}
      {features.FRAKTION_NEWS && (
      <Sheet open={!!selectedFraktionNews} onClose={() => setSelectedFraktionNews(null)} size="lg">
        {selectedFraktionNews && (
          <div>
            {selectedFraktionNews.bildUrl && (
              <PhotoGallery
                  images={[selectedFraktionNews.bildUrl]}
                alt={selectedFraktionNews.titel}
              />
            )}
            <div className="px-6 pt-6 pb-8">
              <div className="w-8 h-0.5 bg-spd-red rounded-full mb-4" />
              <time className="text-xs text-gray-400 dark:text-gray-500 mb-3 block">
                {formatDate(selectedFraktionNews.datum)}
              </time>
              <h3 className="text-xl font-black text-gray-900 dark:text-white leading-snug mb-5">
                {selectedFraktionNews.titel}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {selectedFraktionNews.inhalt}
              </p>
            </div>
          </div>
        )}
      </Sheet>
      )}

      {/* Member detail sheet */}
      <Sheet open={!!selectedMember} onClose={() => setSelectedMember(null)}>
        {selectedMember && (
          /* Portrait: stacked. Short landscape: image left, info right */
          <div className="[@media(orientation:landscape)_and_(max-height:600px)]:flex
                          [@media(orientation:landscape)_and_(max-height:600px)]:flex-row
                          [@media(orientation:landscape)_and_(max-height:600px)]:min-h-0
                          [@media(orientation:landscape)_and_(max-height:600px)]:h-full">

            {/* Hero image */}
            <div className="relative overflow-hidden bg-gray-900
                            [@media(orientation:landscape)_and_(max-height:600px)]:w-1/2
                            [@media(orientation:landscape)_and_(max-height:600px)]:shrink-0">
              {selectedMember.bildUrl ? (
                <img
                  src={selectedMember.bildUrl}
                  alt={selectedMember.name}
                  className="w-full block object-cover object-top
                             max-h-[58dvh] sm:max-h-[70dvh]
                             [@media(orientation:landscape)_and_(max-height:600px)]:max-h-none
                             [@media(orientation:landscape)_and_(max-height:600px)]:h-full"
                />
              ) : (
                <div className="w-full aspect-square [@media(orientation:landscape)_and_(max-height:600px)]:aspect-auto [@media(orientation:landscape)_and_(max-height:600px)]:h-full bg-linear-to-br from-spd-red to-spd-red-dark flex items-center justify-center">
                  <span className="text-6xl font-bold text-white/90">
                    {selectedMember.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/50 to-gray-900/10
                              [@media(orientation:landscape)_and_(max-height:600px)]:bg-none" />
              {/* Name overlay — portrait only */}
              <div className="absolute bottom-0 inset-x-0 px-6 pb-7
                              [@media(orientation:landscape)_and_(max-height:600px)]:hidden">
                <h3 className="font-black text-white text-2xl leading-snug">{selectedMember.name}</h3>
                {selectedMember.beruf && (
                  <p className="text-sm text-white/60 mt-1">{selectedMember.beruf}</p>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pt-6 pb-8 space-y-6
                            [@media(orientation:landscape)_and_(max-height:600px)]:flex-1
                            [@media(orientation:landscape)_and_(max-height:600px)]:overflow-y-auto
                            [@media(orientation:landscape)_and_(max-height:600px)]:px-5
                            [@media(orientation:landscape)_and_(max-height:600px)]:py-5">
              {/* Name shown only in landscape */}
              <div className="hidden [@media(orientation:landscape)_and_(max-height:600px)]:block">
                <h3 className="font-black text-gray-900 dark:text-white text-xl leading-snug">{selectedMember.name}</h3>
                {selectedMember.beruf && (
                  <p className="text-sm text-gray-500 dark:text-white/60 mt-0.5">{selectedMember.beruf}</p>
                )}
              </div>

              <div className="w-8 h-0.5 bg-spd-red rounded-full" />

              {selectedMember.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {selectedMember.bio}
                </p>
              )}

              {/* Contact info — elegant list */}
              {(selectedMember.address || selectedMember.email) && (
                <div className="rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800
                                border border-gray-100 dark:border-gray-800">
                  {selectedMember.address && (
                    <div className="flex items-center gap-3.5 px-4 py-3.5">
                      <div className="w-8 h-8 rounded-xl bg-spd-red/8 dark:bg-spd-red/12 flex items-center justify-center shrink-0">
                        <MapPin size={14} className="text-spd-red" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{selectedMember.address}</span>
                    </div>
                  )}
                  {selectedMember.zipCode && (
                    <div className="flex items-center gap-3.5 px-4 py-3.5">
                      <div className="w-8 h-8 rounded-xl bg-spd-red/8 dark:bg-spd-red/12 flex items-center justify-center shrink-0">
                        <Building2 size={14} className="text-spd-red" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{selectedMember.zipCode}</span>
                    </div>
                  )}
                  {selectedMember.email && (
                    <a href={`mailto:${selectedMember.email}`}
                      className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-spd-red/8 dark:bg-spd-red/12 flex items-center justify-center shrink-0">
                        <Mail size={14} className="text-spd-red" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{selectedMember.email}</span>
                    </a>
                  )}
                </div>
              )}

              {/* Ausschüsse */}
              {selectedMember.ausschuesse.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-3">Ausschüsse</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.ausschuesse.map(a => (
                      <span key={a}
                        className="text-xs text-gray-600 dark:text-gray-300
                                   bg-gray-50 dark:bg-gray-800
                                   border border-gray-100 dark:border-gray-700/50
                                   px-3 py-1.5 rounded-xl font-medium">
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

    </section>
  )
}
