import type { ElementType } from 'react'
import { Briefcase, Bus, GraduationCap, Home, Leaf, Users } from 'lucide-react'

/** Maps icon name strings from party.json to Lucide icon components. */
export const ICONS: Record<string, ElementType> = {
  GraduationCap,
  Home,
  Leaf,
  Bus,
  Briefcase,
  Users,
}
