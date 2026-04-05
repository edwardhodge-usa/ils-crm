// electron/gmail/secure-settings.ts
// Encrypted settings storage using Electron safeStorage.
// Pattern mirrors oauth.ts token encryption.

import { safeStorage } from 'electron'
import { getSetting, setSetting } from '../database/queries/entities'
import { saveDatabase } from '../database/init'

const PREFIX = 'secure_'

export function setSecureSetting(key: string, value: string): void {
  const storageKey = `${PREFIX}${key}`
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value)
    setSetting(storageKey, encrypted.toString('base64'))
  } else {
    console.warn(`[SecureSettings] OS keychain unavailable — storing ${key} with base64 only`)
    setSetting(storageKey, Buffer.from(value).toString('base64'))
  }
  saveDatabase()
}

export function getSecureSetting(key: string): string | null {
  const storageKey = `${PREFIX}${key}`
  const stored = getSetting(storageKey)
  if (!stored) return null

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(stored, 'base64')
      return safeStorage.decryptString(buffer)
    }
    return Buffer.from(stored, 'base64').toString('utf-8')
  } catch {
    console.error(`[SecureSettings] Failed to decrypt ${key}`)
    return null
  }
}
