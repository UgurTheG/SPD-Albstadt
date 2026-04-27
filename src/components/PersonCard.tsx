import { motion } from 'framer-motion'
import { personCardItemVariants } from './personCardVariants'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// ── PersonCard ─────────────────────────────────────────────────────────────────

interface PersonCardProps {
  name: string
  /** Portrait image URL — initials shown as fallback */
  bildUrl?: string
  /** Small label above the name (rolle, beruf, …) */
  label?: string
  /** Small secondary line below the name (e.g. "seit 2019") */
  sublabel?: string
  onClick: () => void
}

function Initials({ name }: { name: string }) {
  return (
    <div className="w-full h-full bg-spd-red flex items-center justify-center text-white font-bold text-4xl">
      {getInitials(name)}
    </div>
  )
}

/**
 * Dark cinematic portrait card shared between Partei (Vorstand) and
 * Fraktion (Gemeinderäte / Kreisräte).
 *
 * Must be placed inside a `motion.div` container that provides
 * `personCardContainerVariants` so the stagger animation works correctly.
 */
export default function PersonCard({ name, bildUrl, label, sublabel, onClick }: PersonCardProps) {
  return (
    <motion.div
      variants={personCardItemVariants}
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden cursor-pointer
                 bg-gray-950 transform-gpu
                 shadow-[0_4px_20px_rgba(0,0,0,0.55)]
                 hover:shadow-[0_8px_36px_rgba(0,0,0,0.7)] hover:-translate-y-1
                 transition-all duration-500"
    >
      <div className="aspect-3/4 [@media(orientation:landscape)_and_(max-height:600px)]:aspect-[4/3] overflow-hidden">
        {bildUrl ? (
          <img
            loading="lazy"
            src={bildUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <Initials name={name} />
        )}
      </div>

      {/* Cinematic gradient */}
      <div className="absolute inset-0 bg-linear-to-t from-gray-950 via-gray-950/40 to-transparent pointer-events-none" />

      {/* Info overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 pointer-events-none">
        {label && (
          <p className="text-[10px] sm:text-[11px] font-medium tracking-wide text-white/50 mb-0.5">
            {label}
          </p>
        )}
        <h4 className="font-extrabold text-white text-sm sm:text-base leading-tight">{name}</h4>
        {sublabel && (
          <p className="text-[10px] font-medium text-white/35 mt-1 tracking-wide">{sublabel}</p>
        )}
        <span className="inline-flex items-center text-[11px] font-semibold text-white/50 group-hover:text-spd-red transition-colors duration-300 mt-2">
          Mehr anzeigen →
        </span>
      </div>
    </motion.div>
  )
}
