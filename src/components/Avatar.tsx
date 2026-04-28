/** Returns the two-letter uppercase initials for a full name. */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const SIZES = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-lg',
  lg: 'w-20 h-20 text-2xl',
} as const

interface AvatarProps {
  name: string
  imageUrl?: string
  size?: keyof typeof SIZES
  /** Extra classes forwarded to the root element (e.g. ring styles). */
  className?: string
}

/**
 * Circular avatar — shows the image when available, initials on a red
 * background otherwise.
 */
export default function Avatar({ name, imageUrl, size = 'md', className }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        loading="lazy"
        src={imageUrl}
        alt={name}
        className={`${SIZES[size]} rounded-full object-cover shrink-0${
          className ? ` ${className}` : ''
        }`}
      />
    )
  }
  return (
    <div
      className={`${SIZES[size]} rounded-full bg-spd-red flex items-center justify-center text-white font-bold shrink-0${
        className ? ` ${className}` : ''
      }`}
    >
      {getInitials(name)}
    </div>
  )
}
