/** Returns the two-letter uppercase initials for a full name. */
export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const SIZES = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-lg',
  lg: 'w-20 h-20 text-2xl',
} as const

interface AvatarProps {
  name: string
  imageUrl?: string
  size?: keyof typeof SIZES
}

/**
 * Circular avatar — shows the image when available, initials on a red
 * background otherwise.
 */
export default function Avatar({ name, imageUrl, size = 'md' }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        loading="lazy"
        src={imageUrl}
        alt={name}
        className={`${SIZES[size]} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (
    <div
      className={`${SIZES[size]} rounded-full bg-spd-red flex items-center justify-center text-white font-bold shrink-0`}
    >
      {getInitials(name)}
    </div>
  )
}

