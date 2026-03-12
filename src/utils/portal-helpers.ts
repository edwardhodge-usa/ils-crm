/** Safely extract a display string from a lookup value (JSON array, string, or native array) */
export function resolveLookup(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'string') {
    if (val.startsWith('[')) {
      try {
        const arr = JSON.parse(val)
        if (Array.isArray(arr) && arr.length > 0) return String(arr[0])
      } catch { /* not JSON, use as-is */ }
    }
    return val
  }
  if (Array.isArray(val) && val.length > 0) return String(val[0])
  return String(val)
}

/** Get the canonical display name for a Portal Access record */
export function resolvedPortalName(row: Record<string, unknown>): string {
  const name = row.name as string | null
  if (name && name !== row.airtable_id) return name
  const contactName = resolveLookup(row.contact_name_lookup)
  if (contactName) return contactName
  const email = row.email as string | null
  if (email) return email
  const contactEmail = resolveLookup(row.contact_email_lookup)
  if (contactEmail) return contactEmail
  return name || 'Unnamed'
}

/** Get the canonical email for a Portal Access record (lowercased + trimmed) */
export function resolvedPortalEmail(row: Record<string, unknown>): string | null {
  const contactEmail = resolveLookup(row.contact_email_lookup)
  if (contactEmail) return contactEmail.toLowerCase().trim()
  const email = row.email as string | null
  return email ? email.toLowerCase().trim() : null
}

/** Get the canonical company for a Portal Access record */
export function resolvedPortalCompany(row: Record<string, unknown>): string | null {
  const contactCompany = resolveLookup(row.contact_company_lookup)
  if (contactCompany && !contactCompany.startsWith('rec')) return contactCompany
  const company = (row.company as string | null) || null
  if (company && !company.startsWith('rec')) return company
  return null
}

/** Extract the page slug from a full portal log URL */
export function extractPageSlug(pageUrl: string | null | undefined): string | null {
  if (!pageUrl) return null
  const segment = pageUrl.split('/ils-clients/')[1]?.split('?')[0]
  return segment || null
}

/** Group portal records by canonical email, sorting each group by date_added desc */
export function groupByPerson(
  records: Record<string, unknown>[]
): Map<string, Record<string, unknown>[]> {
  const map = new Map<string, Record<string, unknown>[]>()

  for (const r of records) {
    const email = resolvedPortalEmail(r)
    const key = email || `__no_email_${r.id ?? Math.random()}`
    const group = map.get(key)
    if (group) {
      group.push(r)
    } else {
      map.set(key, [r])
    }
  }

  // Sort each group by date_added descending
  for (const [, group] of map) {
    group.sort((a, b) => {
      const da = String(a.date_added ?? '')
      const db = String(b.date_added ?? '')
      return db.localeCompare(da)
    })
  }

  return map
}
