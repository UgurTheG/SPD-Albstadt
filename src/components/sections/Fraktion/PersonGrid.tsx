import { motion } from 'framer-motion'
import { personCardContainerVariants } from '@/components/personCardVariants'
import PersonCard from '@/components/PersonCard'
import { SkeletonGrid } from '@/components/SkeletonGrid'
import type { Gemeinderat } from './types'

export function PersonGrid({
  label,
  countLabel,
  members,
  isInView,
  animationDelay,
  onSelect,
}: {
  label: string
  countLabel?: string
  members: Gemeinderat[] | undefined
  isInView: boolean
  animationDelay: number
  onSelect: (m: Gemeinderat) => void
}) {
  // Data loaded but section is empty — hide entirely rather than showing an empty heading
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
        {members?.map(m => (
          <PersonCard
            key={m.name}
            name={m.name}
            bildUrl={m.bildUrl}
            label={m.beruf}
            sublabel={`seit ${m.seit}`}
            onClick={() => onSelect(m)}
          />
        ))}
        {!members && <SkeletonGrid count={6} itemClassName="h-64" />}
      </motion.div>
    </div>
  )
}
