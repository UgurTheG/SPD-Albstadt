import { motion } from 'framer-motion'
import { personCardContainerVariants } from './personCardVariants'
import PersonCard from './PersonCard'
import { SkeletonGrid } from './SkeletonGrid'

interface PersonBase {
  name: string
  bildUrl?: string
}

interface PersonGridProps<T extends PersonBase> {
  label: string
  countLabel?: string
  /** undefined = still loading (shows skeleton); empty array = no members (hidden) */
  members: T[] | undefined
  isInView: boolean
  animationDelay: number
  onSelect: (m: T, i: number) => void
  /** Extra PersonCard props per member. Use for label, sublabel, priority, etc. */
  renderCardProps?: (
    member: T,
    index: number,
  ) => { label?: string; sublabel?: string; priority?: boolean }
  skeletonCount?: number
  skeletonClassName?: string
}

export function PersonGrid<T extends PersonBase>({
  label,
  countLabel,
  members,
  isInView,
  animationDelay,
  onSelect,
  renderCardProps,
  skeletonCount = 6,
  skeletonClassName = 'h-64',
}: PersonGridProps<T>) {
  if (members !== undefined && members.length === 0) return null

  return (
    <div className="mb-20">
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: animationDelay }}
        className="flex items-center gap-4 mb-8"
      >
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {label}
          </h3>
          {countLabel && (
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{countLabel}</p>
          )}
        </div>
      </motion.div>

      <motion.div
        variants={personCardContainerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {members?.map((m, i) => (
          <PersonCard
            key={m.name}
            name={m.name}
            bildUrl={m.bildUrl}
            onClick={() => onSelect(m, i)}
            {...renderCardProps?.(m, i)}
          />
        ))}
        {!members && <SkeletonGrid count={skeletonCount} itemClassName={skeletonClassName} />}
      </motion.div>
    </div>
  )
}
