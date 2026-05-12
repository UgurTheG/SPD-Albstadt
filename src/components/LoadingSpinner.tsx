import { cn } from '../utils/cn'

const sizeClasses = {
  xs: 'w-4 h-4 border-2',
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-4',
  lg: 'w-10 h-10 border-4',
} as const

type SpinnerSize = keyof typeof sizeClasses

/** Raw spinner circle — use when the parent already provides centering. */
export function SpinnerRing({
  size = 'lg',
  className,
}: {
  size?: SpinnerSize
  className?: string
}) {
  return (
    <div
      className={cn(
        sizeClasses[size],
        'border-spd-red/30 border-t-spd-red rounded-full animate-spin',
        className,
      )}
    />
  )
}

/** Centered spinner — full-width flex wrapper + SpinnerRing. */
export default function LoadingSpinner({
  size = 'lg',
  className,
}: {
  size?: SpinnerSize
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <SpinnerRing size={size} />
    </div>
  )
}
