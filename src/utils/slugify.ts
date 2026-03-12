/** Convert a string to a URL-friendly slug */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

/** Return a unique slug by appending -2, -3, etc. if the base slug already exists */
export function uniqueSlug(base: string, existing: string[]): string {
  const slug = slugify(base)
  if (!existing.includes(slug)) return slug

  let counter = 2
  while (existing.includes(`${slug}-${counter}`)) {
    counter++
  }
  return `${slug}-${counter}`
}
