/** Parse collaborator JSON ({"id":"usrXXX","name":"John"}) to display name. Falls back to raw string for legacy data. */
export function parseCollaboratorName(val: unknown): string | null {
  if (!val || typeof val !== 'string') return null
  try {
    const parsed = JSON.parse(val)
    if (parsed && typeof parsed === 'object' && parsed.name) return parsed.name
  } catch {
    return val
  }
  return val
}
