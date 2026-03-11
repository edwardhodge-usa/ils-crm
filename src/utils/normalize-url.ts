/** Auto-prepend https:// to URL values that are missing a protocol.
 *  Returns the value unchanged if it already has http(s)://, is an email, or is empty/null. */
export function normalizeUrl(val: string | null | undefined): string | null {
  if (!val) return val as null
  const trimmed = val.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.includes('@')) return trimmed
  return 'https://' + trimmed
}
