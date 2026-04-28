/** Derive a human-readable preview label from common field names. */
export function getPreviewText(item: Record<string, unknown>, index: number): string {
  return (item.name ||
    item.titel ||
    item.title ||
    item.tage ||
    item.jahr ||
    `#${index + 1}`) as string
}
