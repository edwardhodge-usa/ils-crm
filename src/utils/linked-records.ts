/** Check if a JSON-encoded array of IDs contains a specific ID */
export function containsId(idsJson: unknown, targetId: string): boolean {
  if (!idsJson) return false
  try {
    const arr = JSON.parse(idsJson as string)
    return Array.isArray(arr) && arr.includes(targetId)
  } catch {
    return false
  }
}

/** Get the first ID from a JSON-encoded array of IDs */
export function firstId(idsJson: unknown): string | null {
  if (!idsJson) return null
  try {
    const arr = JSON.parse(idsJson as string)
    return Array.isArray(arr) && arr.length > 0 ? (arr[0] as string) : null
  } catch {
    return null
  }
}
