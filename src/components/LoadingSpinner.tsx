import { cn } from '../utils/cn'

export default function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="w-10 h-10 border-4 border-spd-red/30 border-t-spd-red rounded-full animate-spin" />
    </div>
  )
}
