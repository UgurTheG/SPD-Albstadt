import { useConfig } from './useConfig'

export function useFeatures() {
  useConfig() // reserved for future feature flags
  return {} as const
}
