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

/** Build display names + name→rawJSON map from a list of records with a collaborator field. */
export function buildCollaboratorMap(
  records: Record<string, unknown>[],
  fieldName: string
): { options: string[]; map: Record<string, string> } {
  const names = new Set<string>()
  const map: Record<string, string> = {}
  for (const row of records) {
    const raw = (row[fieldName] as string | null) ?? null
    const name = parseCollaboratorName(raw)
    if (name && raw) {
      names.add(name)
      if (!map[name]) map[name] = raw
    }
  }
  return { options: Array.from(names).sort(), map }
}

/** Convert a display name back to raw collaborator JSON for saving. */
export function resolveCollaboratorSave(
  key: string,
  val: unknown,
  collaboratorMap: Record<string, string>,
  collaboratorFields: ReadonlySet<string> = COLLABORATOR_FIELD_KEYS
): unknown {
  if (collaboratorFields.has(key) && typeof val === 'string') {
    return collaboratorMap[val] || val
  }
  return val
}

const COLLABORATOR_FIELD_KEYS = new Set(['assigned_to', 'project_lead'])
