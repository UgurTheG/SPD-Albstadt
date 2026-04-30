/**
 * Small stacked-avatar row showing which other users are active on a given tab.
 * Renders up to `max` avatars, then an overflow badge ("+N").
 */
import Avatar from '../../components/Avatar'
import type { PresenceUser } from '../store/presenceSlice'

interface Props {
  users: PresenceUser[]
  max?: number
  size?: 'xs' | 'sm'
}

export default function PresenceBadge({ users, max = 3, size = 'xs' }: Props) {
  if (users.length === 0) return null

  const visible = users.slice(0, max)
  const overflow = users.length - visible.length

  return (
    <span
      className="flex items-center -space-x-1.5"
      aria-label={`${users.length} weitere Benutzer`}
    >
      {visible.map(u => (
        <span
          key={u.login}
          title={u.login}
          className="ring-2 ring-white dark:ring-gray-900 rounded-full"
        >
          <Avatar name={u.login} imageUrl={u.avatar_url || undefined} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300">
          +{overflow}
        </span>
      )}
    </span>
  )
}
