/** Parse a value (null, array, or JSON string) into an array of ID strings */
export function parseIds(val: unknown): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val as string[]
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

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
