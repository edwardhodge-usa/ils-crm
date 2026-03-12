import { useState, useEffect } from 'react'
import { parseIds } from '../utils/linked-records'

/** Resolve the first linked contact's photo and company logo */
export function useLinkedImages(record: Record<string, unknown> | null) {
  const [contactPhotoUrl, setContactPhotoUrl] = useState<string | null>(null)
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    setContactPhotoUrl(null)
    setCompanyLogoUrl(null)
    if (!record) return

    let cancelled = false

    async function load() {
      // 1. Get linked contact photo
      const contactIds = parseIds(record!.contact_ids)

      if (contactIds.length > 0) {
        const res = await window.electronAPI.contacts.getById(contactIds[0])
        if (!cancelled && res.success && res.data) {
          const contact = res.data as Record<string, unknown>
          if (contact.contact_photo_url) setContactPhotoUrl(contact.contact_photo_url as string)

          // 2. Get company logo from the contact's company link
          const companyIds = parseIds(contact.company_ids ?? contact.companies_ids)

          if (companyIds.length > 0) {
            const compRes = await window.electronAPI.companies.getById(companyIds[0])
            if (!cancelled && compRes.success && compRes.data) {
              const company = compRes.data as Record<string, unknown>
              if (company.logo_url) setCompanyLogoUrl(company.logo_url as string)
            }
          }
        }
      }

      // Fallback: try company name text field to look up company by name
      if (!cancelled && contactIds.length === 0) {
        const companyName = record!.company as string | null
        if (companyName) {
          const allRes = await window.electronAPI.companies.getAll()
          if (!cancelled && allRes.success && allRes.data) {
            const match = (allRes.data as Record<string, unknown>[]).find(
              c => (c.company_name as string)?.toLowerCase() === companyName.toLowerCase()
            )
            if (match?.logo_url) setCompanyLogoUrl(match.logo_url as string)
          }
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [record?.id])

  return { contactPhotoUrl, companyLogoUrl }
}
