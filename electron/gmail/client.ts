// electron/gmail/client.ts
// Gmail REST API wrapper — read-only operations for Email Intelligence

import type { EmailHeaders, EmailMessage } from './types'
import { parseFromHeader } from './email-utils'

// ─── Constants ─────────────────────────────────────────────────

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
const MAX_RETRIES = 3
const BASE_RETRY_DELAY_MS = 1000

// ─── Error Types ───────────────────────────────────────────────

export class TokenExpiredError extends Error {
  constructor() {
    super('TOKEN_EXPIRED')
    this.name = 'TokenExpiredError'
  }
}

export class HistoryExpiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HistoryExpiredError'
  }
}

// ─── Types ─────────────────────────────────────────────────────

interface GmailMessageListResponse {
  messages?: Array<{ id: string; threadId: string }>
  nextPageToken?: string
  resultSizeEstimate?: number
}

interface GmailMessageResource {
  id: string
  threadId: string
  historyId: string
  payload: GmailPayloadPart
}

interface GmailPayloadPart {
  mimeType: string
  headers?: Array<{ name: string; value: string }>
  body?: { data?: string; size?: number }
  parts?: GmailPayloadPart[]
}

interface GmailHistoryResponse {
  history?: Array<{
    id: string
    messagesAdded?: Array<{ message: { id: string; threadId: string } }>
  }>
  nextPageToken?: string
  historyId: string
}

interface GmailProfileResponse {
  emailAddress: string
  messagesTotal: number
  threadsTotal: number
  historyId: string
}

// ─── Gmail Client ──────────────────────────────────────────────

export class GmailClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  // ─── Messages ──────────────────────────────────────────────

  async listMessages(
    pageToken?: string,
    maxResults = 100,
  ): Promise<{
    messages: Array<{ id: string; threadId: string }>
    nextPageToken?: string
    resultSizeEstimate: number
  }> {
    const params = new URLSearchParams({ maxResults: String(maxResults) })
    if (pageToken) params.set('pageToken', pageToken)

    const data = await this.request<GmailMessageListResponse>(
      `/messages?${params.toString()}`,
    )

    return {
      messages: data.messages ?? [],
      nextPageToken: data.nextPageToken,
      resultSizeEstimate: data.resultSizeEstimate ?? 0,
    }
  }

  async searchMessages(
    query: string,
    maxResults = 100,
  ): Promise<{
    messages: Array<{ id: string; threadId: string }>
    nextPageToken?: string
    resultSizeEstimate: number
  }> {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(maxResults),
    })

    const data = await this.request<GmailMessageListResponse>(
      `/messages?${params.toString()}`,
    )

    return {
      messages: data.messages ?? [],
      nextPageToken: data.nextPageToken,
      resultSizeEstimate: data.resultSizeEstimate ?? 0,
    }
  }

  async getMessageHeaders(messageId: string): Promise<EmailHeaders> {
    const data = await this.request<GmailMessageResource>(
      `/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Date&metadataHeaders=Subject&metadataHeaders=List-Unsubscribe`,
    )

    return parseMessageHeaders(data)
  }

  async getMessageFull(messageId: string): Promise<EmailMessage> {
    const data = await this.request<GmailMessageResource>(
      `/messages/${messageId}?format=full`,
    )

    const headers = parseMessageHeaders(data)
    const bodyPlainText = extractPlainText(data.payload)

    return {
      ...headers,
      id: data.id,
      threadId: data.threadId,
      bodyPlainText,
    }
  }

  // ─── History ───────────────────────────────────────────────

  async listHistory(
    startHistoryId: string,
  ): Promise<{
    messageIds: string[]
    latestHistoryId: string
  }> {
    const messageIds: string[] = []
    let pageToken: string | undefined
    let latestHistoryId = startHistoryId

    do {
      const params = new URLSearchParams({
        startHistoryId,
        historyTypes: 'messageAdded',
      })
      if (pageToken) params.set('pageToken', pageToken)

      let data: GmailHistoryResponse
      try {
        data = await this.request<GmailHistoryResponse>(
          `/history?${params.toString()}`,
        )
      } catch (err) {
        // Gmail returns 404 when historyId is too old
        if (err instanceof Error && err.message.includes('404')) {
          throw new HistoryExpiredError(
            `History ID ${startHistoryId} has expired — full rescan required`,
          )
        }
        throw err
      }

      if (data.history) {
        for (const entry of data.history) {
          if (entry.messagesAdded) {
            for (const added of entry.messagesAdded) {
              messageIds.push(added.message.id)
            }
          }
        }
      }

      latestHistoryId = data.historyId
      pageToken = data.nextPageToken
    } while (pageToken)

    return { messageIds, latestHistoryId }
  }

  // ─── Profile ───────────────────────────────────────────────

  async getProfile(): Promise<{ email: string; historyId: string }> {
    const data = await this.request<GmailProfileResponse>('/profile')
    return {
      email: data.emailAddress,
      historyId: data.historyId,
    }
  }

  // ─── HTTP Request with Retry ───────────────────────────────

  private async request<T>(path: string): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const response = await fetch(`${GMAIL_API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      })

      if (response.ok) {
        return (await response.json()) as T
      }

      // 401 — token expired, caller must refresh
      if (response.status === 401) {
        throw new TokenExpiredError()
      }

      // 429 — rate limited, exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500

        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          continue
        }
      }

      // 404 — pass through for history expired detection
      if (response.status === 404) {
        const errorText = await response.text()
        throw new Error(`Gmail API 404: ${errorText}`)
      }

      // 5xx — retry with backoff
      if (response.status >= 500) {
        lastError = new Error(`Gmail API ${response.status}: ${await response.text()}`)
        if (attempt < MAX_RETRIES - 1) {
          const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          continue
        }
      }

      // Other errors — throw immediately
      const errorText = await response.text()
      throw new Error(`Gmail API error ${response.status}: ${errorText}`)
    }

    throw lastError ?? new Error('Gmail API request failed after retries')
  }
}

// ─── Header Parsing ────────────────────────────────────────────

function getHeader(message: GmailMessageResource, name: string): string {
  const headers = message.payload.headers ?? []
  const header = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  )
  return header?.value ?? ''
}

function parseAddressList(header: string): Array<{ name: string | null; email: string }> {
  if (!header) return []

  // Split on commas that are NOT inside angle brackets or quotes
  const addresses: Array<{ name: string | null; email: string }> = []
  let current = ''
  let inAngle = false
  let inQuote = false

  for (const char of header) {
    if (char === '"' && !inAngle) {
      inQuote = !inQuote
      current += char
    } else if (char === '<' && !inQuote) {
      inAngle = true
      current += char
    } else if (char === '>' && !inQuote) {
      inAngle = false
      current += char
    } else if (char === ',' && !inAngle && !inQuote) {
      const trimmed = current.trim()
      if (trimmed) addresses.push(parseFromHeader(trimmed))
      current = ''
    } else {
      current += char
    }
  }

  const trimmed = current.trim()
  if (trimmed) addresses.push(parseFromHeader(trimmed))

  return addresses
}

function parseMessageHeaders(message: GmailMessageResource): EmailHeaders {
  const fromRaw = getHeader(message, 'From')
  const toRaw = getHeader(message, 'To')
  const ccRaw = getHeader(message, 'Cc')
  const dateRaw = getHeader(message, 'Date')
  const subject = getHeader(message, 'Subject')

  const rawHeaders: Record<string, string> = {}
  for (const header of message.payload.headers ?? []) {
    rawHeaders[header.name] = header.value
  }

  return {
    from: parseFromHeader(fromRaw),
    to: parseAddressList(toRaw),
    cc: parseAddressList(ccRaw),
    date: dateRaw ? new Date(dateRaw) : new Date(),
    subject,
    rawHeaders,
  }
}

// ─── MIME Body Extraction ──────────────────────────────────────

function extractPlainText(part: GmailPayloadPart): string | null {
  // Direct text/plain part
  if (part.mimeType === 'text/plain' && part.body?.data) {
    return decodeBase64Url(part.body.data)
  }

  // Recurse into multipart children
  if (part.parts) {
    // Prefer text/plain over text/html
    for (const child of part.parts) {
      if (child.mimeType === 'text/plain' && child.body?.data) {
        return decodeBase64Url(child.body.data)
      }
    }

    // Deep recurse for nested multipart
    for (const child of part.parts) {
      const found = extractPlainText(child)
      if (found) return found
    }
  }

  return null
}

function decodeBase64Url(encoded: string): string {
  // Gmail uses URL-safe base64 encoding
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64').toString('utf-8')
}
