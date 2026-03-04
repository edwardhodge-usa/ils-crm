// License check service: validates app license against Airtable licensing base
// Uses a separate PAT + base from the main CRM — config in license-config.ts (gitignored)

import { app } from 'electron'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { LICENSE_CONFIG } from '../license-config'
import { getSetting, setSetting } from '../database/queries/entities'
import { stopPolling } from './sync-engine'

const isDev = !!process.env.VITE_DEV_SERVER_URL

// ─── Types ───────────────────────────────────────────────────

export interface LicenseStatus {
  valid: boolean
  status: 'active' | 'revoked' | 'suspended' | 'not-found' | 'error'
  message?: string
}

// ─── License Check ───────────────────────────────────────────

export async function checkLicense(
  email: string,
  airtableUserId?: string,
): Promise<LicenseStatus> {
  try {
    // Sanitize email to prevent formula injection
    const sanitizedEmail = email.replace(/'/g, "\\'")

    const filterFormula = `AND({${LICENSE_CONFIG.fields.email}} = '${sanitizedEmail}', {${LICENSE_CONFIG.fields.app}} = '${LICENSE_CONFIG.appName}')`
    const url = `https://api.airtable.com/v0/${LICENSE_CONFIG.baseId}/${LICENSE_CONFIG.tableId}?filterByFormula=${encodeURIComponent(filterFormula)}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LICENSE_CONFIG.pat}`,
      },
    })

    if (!response.ok) {
      return { valid: false, status: 'error', message: 'HTTP ' + response.status }
    }

    const data = await response.json()
    const records = data.records as Array<{ id: string; fields: Record<string, unknown> }>

    if (!records || records.length === 0) {
      return { valid: false, status: 'not-found' }
    }

    const record = records[0]
    const statusValue = record.fields[LICENSE_CONFIG.fields.status] as string

    if (statusValue !== 'Active') {
      return {
        valid: false,
        status: statusValue.toLowerCase() as LicenseStatus['status'],
      }
    }

    // Active — fire-and-forget check-in update
    fetch(
      `https://api.airtable.com/v0/${LICENSE_CONFIG.baseId}/${LICENSE_CONFIG.tableId}/${record.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${LICENSE_CONFIG.pat}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            [LICENSE_CONFIG.fields.lastCheckIn]: new Date().toISOString(),
            [LICENSE_CONFIG.fields.airtableUserId]: airtableUserId || '',
            [LICENSE_CONFIG.fields.appVersion]: app.getVersion(),
            [LICENSE_CONFIG.fields.deviceInfo]: `${os.platform()} ${os.release()}`,
          },
        }),
      },
    ).catch((err) => {
      if (isDev) console.log('[License] Check-in PATCH failed:', err.message)
    })

    return { valid: true, status: 'active' }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { valid: false, status: 'error', message }
  }
}

// ─── Grace Period Helpers ────────────────────────────────────

export function getLastVerifiedTime(): number | null {
  const value = getSetting('license_last_verified')
  if (value === null) return null
  return Number(value)
}

export function setLastVerifiedTime(): void {
  setSetting('license_last_verified', Date.now().toString())
}

export function isWithinGracePeriod(): boolean {
  const lastVerified = getLastVerifiedTime()
  if (lastVerified === null) return false
  return Date.now() - lastVerified < 24 * 60 * 60 * 1000
}

// ─── Revocation Handler ──────────────────────────────────────

export async function handleRevocation(): Promise<void> {
  stopPolling()

  try {
    const dbPath = path.join(app.getPath('userData'), 'ils-crm.db')
    fs.unlinkSync(dbPath)
  } catch {
    // File might not exist — that's fine
  }

  console.error('[License] Access revoked — local database deleted')
}
