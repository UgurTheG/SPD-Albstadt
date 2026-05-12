/** Deep-clones a JSON-serialisable value. */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}
