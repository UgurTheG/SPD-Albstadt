/**
 * Feature toggles for the SPD Albstadt website.
 *
 * Flip a flag to `true` / `false` to enable or disable a feature
 * without touching any component code.
 */
export const FEATURES = {
  /** Show the Instagram feed carousel on the Aktuelles page */
  INSTAGRAM_FEED: false,
  /** Show the "Neues aus der Fraktion" news section on the Fraktion page */
  FRAKTION_NEWS: false,
} as const

