import { twMerge } from 'tailwind-merge'

/** Class-name joiner with Tailwind conflict resolution. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return twMerge(classes.filter(Boolean).join(' '))
}
