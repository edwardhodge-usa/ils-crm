// electron/gmail/oauth.ts
// Gmail OAuth 2.0 flow — opens system browser, captures redirect via local HTTP server

import { shell, safeStorage } from 'electron'
import http from 'http'
import { URL } from 'url'
import { getSetting, setSetting } from '../database/queries/entities'

// ─── Types ─────────────────────────────────────────────────────

export interface GmailTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number   // epoch ms
  email: string
}

// ─── Constants ─────────────────────────────────────────────────

const REDIRECT_PORT = 48321
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth/callback`
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'

// Settings keys for encrypted token storage
const SETTINGS_KEY_TOKENS = 'gmail_tokens_encrypted'
const SETTINGS_KEY_EMAIL = 'gmail_connected_email'

// ─── Credential Helpers ────────────────────────────────────────

function getClientId(): string {
  const clientId = getSetting('gmail_client_id')
  if (!clientId) throw new Error('Gmail OAuth client ID not configured — set gmail_client_id in settings')
  return clientId
}

function getClientSecret(): string {
  const clientSecret = getSetting('gmail_client_secret')
  if (!clientSecret) throw new Error('Gmail OAuth client secret not configured — set gmail_client_secret in settings')
  return clientSecret
}

// ─── Token Encryption ──────────────────────────────────────────

function encryptTokens(tokens: GmailTokens): string {
  const json = JSON.stringify(tokens)
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(json)
    return encrypted.toString('base64')
  }
  // Fallback: base64 only (no OS keychain available)
  return Buffer.from(json).toString('base64')
}

function decryptTokens(stored: string): GmailTokens {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = Buffer.from(stored, 'base64')
    const decrypted = safeStorage.decryptString(buffer)
    return JSON.parse(decrypted) as GmailTokens
  }
  // Fallback: base64 only
  const json = Buffer.from(stored, 'base64').toString('utf-8')
  return JSON.parse(json) as GmailTokens
}

// ─── Token Storage ─────────────────────────────────────────────

export function storeTokens(tokens: GmailTokens): void {
  const encrypted = encryptTokens(tokens)
  setSetting(SETTINGS_KEY_TOKENS, encrypted)
  setSetting(SETTINGS_KEY_EMAIL, tokens.email)
}

export function loadTokens(): GmailTokens | null {
  const stored = getSetting(SETTINGS_KEY_TOKENS)
  if (!stored) return null
  try {
    return decryptTokens(stored)
  } catch {
    console.error('[Gmail OAuth] Failed to decrypt stored tokens — clearing')
    disconnectGmail()
    return null
  }
}

// ─── Status Helpers ────────────────────────────────────────────

export function isGmailConnected(): boolean {
  const tokens = loadTokens()
  return tokens !== null && tokens.refreshToken.length > 0
}

export function getConnectedEmail(): string | null {
  return getSetting(SETTINGS_KEY_EMAIL)
}

// ─── Disconnect ────────────────────────────────────────────────

export function disconnectGmail(): void {
  setSetting(SETTINGS_KEY_TOKENS, '')
  setSetting(SETTINGS_KEY_EMAIL, '')
}

// ─── OAuth Flow ────────────────────────────────────────────────

export async function startOAuthFlow(): Promise<GmailTokens> {
  const clientId = getClientId()
  const clientSecret = getClientSecret()

  // Generate state parameter for CSRF protection
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  // Build authorization URL
  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  const authUrl = `${AUTH_ENDPOINT}?${authParams.toString()}`

  // Start local HTTP server, then open browser once it's listening
  const { codePromise, waitForListening } = createCallbackServer(state)
  await waitForListening
  await shell.openExternal(authUrl)
  const authCode = await codePromise

  // Exchange code for tokens
  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: authCode,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    throw new Error(`Token exchange failed: ${tokenResponse.status} — ${errorText}`)
  }

  const data = await tokenResponse.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  if (!data.refresh_token) {
    throw new Error('No refresh token received — try revoking app access at https://myaccount.google.com/permissions and reconnecting')
  }

  // Fetch user email via Gmail profile
  const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  })

  if (!profileResponse.ok) {
    throw new Error('Failed to fetch Gmail profile after auth')
  }

  const profile = await profileResponse.json() as { emailAddress: string }

  const tokens: GmailTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    email: profile.emailAddress,
  }

  storeTokens(tokens)
  return tokens
}

// ─── Local HTTP Server for OAuth Callback ──────────────────────

function createCallbackServer(expectedState: string): {
  codePromise: Promise<string>
  waitForListening: Promise<void>
} {
  let resolveCode: (code: string) => void
  let rejectCode: (err: Error) => void
  let resolveListening: () => void
  let rejectListening: (err: Error) => void

  const codePromise = new Promise<string>((res, rej) => {
    resolveCode = res
    rejectCode = rej
  })

  const waitForListening = new Promise<void>((res, rej) => {
    resolveListening = res
    rejectListening = rej
  })

  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400)
      res.end('Bad Request')
      return
    }

    const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`)

    if (url.pathname !== '/oauth/callback') {
      res.writeHead(404)
      res.end('Not Found')
      return
    }

    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Send response to browser regardless of outcome
    res.writeHead(200, { 'Content-Type': 'text/html' })

    if (error) {
      res.end('<html><body><h2>Authorization failed</h2><p>You can close this tab.</p></body></html>')
      cleanup()
      rejectCode(new Error(`OAuth error: ${error}`))
      return
    }

    if (state !== expectedState) {
      res.end('<html><body><h2>Invalid state parameter</h2><p>You can close this tab.</p></body></html>')
      cleanup()
      rejectCode(new Error('OAuth state mismatch — possible CSRF attack'))
      return
    }

    if (!code) {
      res.end('<html><body><h2>No authorization code received</h2><p>You can close this tab.</p></body></html>')
      cleanup()
      rejectCode(new Error('No authorization code in callback'))
      return
    }

    res.end('<html><body><h2>Gmail connected successfully!</h2><p>You can close this tab and return to ILS CRM.</p></body></html>')
    cleanup()
    resolveCode(code)
  })

  // Timeout after 5 minutes
  const timeout = setTimeout(() => {
    cleanup()
    rejectCode(new Error('OAuth flow timed out — no response within 5 minutes'))
  }, 5 * 60 * 1000)

  function cleanup() {
    clearTimeout(timeout)
    server.close()
  }

  server.on('error', (err) => {
    cleanup()
    rejectListening(err)
    rejectCode(new Error(`OAuth callback server error: ${err.message}`))
  })

  server.listen(REDIRECT_PORT, '127.0.0.1', () => {
    resolveListening()
  })

  return { codePromise, waitForListening }
}

// ─── Token Refresh ─────────────────────────────────────────────

export async function refreshAccessToken(): Promise<GmailTokens> {
  const tokens = loadTokens()
  if (!tokens) throw new Error('No Gmail tokens stored — connect Gmail first')

  const clientId = getClientId()
  const clientSecret = getClientSecret()

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    // If refresh token is revoked/expired, disconnect
    if (response.status === 400 || response.status === 401) {
      disconnectGmail()
      throw new Error('Gmail refresh token expired — please reconnect Gmail')
    }
    throw new Error(`Token refresh failed: ${response.status} — ${errorText}`)
  }

  const data = await response.json() as {
    access_token: string
    expires_in: number
    refresh_token?: string  // sometimes returned on refresh
  }

  const updated: GmailTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokens.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    email: tokens.email,
  }

  storeTokens(updated)
  return updated
}
