// Airtable REST API client for ILS CRM
// Extracted from ContactEnricher's sync.ts with pagination + batch write support

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'
const isDev = !!process.env.VITE_DEV_SERVER_URL

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface AirtableRequestOptions {
  method?: string
  body?: unknown
  apiKey: string
  baseId: string
}

// Retry helper for transient failures (429, 5xx, network errors)
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      const isRetryable = error instanceof Error && (
        error.message.includes('429') ||
        error.message.includes('500') ||
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT')
      )

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error
      }

      const retryDelay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500
      if (isDev) console.log(`[Airtable] Retrying after ${Math.round(retryDelay)}ms (attempt ${attempt + 1}/${maxRetries})`)
      await delay(retryDelay)
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

// Make authenticated Airtable API request
export async function airtableRequest(
  endpoint: string,
  options: AirtableRequestOptions
): Promise<unknown> {
  const { method = 'GET', body, apiKey, baseId } = options

  return withRetry(async () => {
    let url = `${AIRTABLE_API_URL}/${baseId}/${endpoint}`
    if (method !== 'DELETE' && !url.includes('returnFieldsByFieldId')) {
      url += (url.includes('?') ? '&' : '?') + 'returnFieldsByFieldId=true'
    }

    const bodyStr = body ? JSON.stringify(body) : undefined
    if (isDev && (method === 'PATCH' || method === 'POST')) {
      console.log(`[Airtable] ${method} ${url.split('/').slice(-1)[0].split('?')[0]} body:`, bodyStr?.substring(0, 500))
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: bodyStr,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Airtable] ${method} FAILED ${response.status}:`, errorText)
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`)
    }

    return response.json()
  })
}

export interface AirtableRecord {
  id: string
  fields: Record<string, unknown>
  createdTime: string
}

interface AirtableListResponse {
  records: AirtableRecord[]
  offset?: string
}

// Fetch all records from a table, handling pagination automatically
export async function fetchAllRecords(
  tableId: string,
  options: { apiKey: string; baseId: string; filterFormula?: string; fields?: string[] }
): Promise<AirtableRecord[]> {
  const { apiKey, baseId, filterFormula, fields } = options
  const allRecords: AirtableRecord[] = []
  let offset: string | undefined

  do {
    const params = new URLSearchParams()
    if (offset) params.set('offset', offset)
    if (filterFormula) params.set('filterByFormula', filterFormula)
    if (fields) {
      fields.forEach(f => params.append('fields[]', f))
    }
    params.set('pageSize', '100')

    const query = params.toString()
    const endpoint = `${tableId}${query ? '?' + query : ''}`

    const response = await airtableRequest(endpoint, { apiKey, baseId }) as AirtableListResponse
    allRecords.push(...response.records)
    offset = response.offset

    // Rate limiting: brief pause between pages
    if (offset) {
      await delay(200)
    }
  } while (offset)

  return allRecords
}

// Fetch a single record by ID
export async function fetchRecord(
  tableId: string,
  recordId: string,
  options: { apiKey: string; baseId: string }
): Promise<AirtableRecord> {
  const { apiKey, baseId } = options
  const response = await airtableRequest(`${tableId}/${recordId}`, { apiKey, baseId }) as AirtableRecord
  return response
}

// Batch write records (create or update), respecting Airtable's 10-record limit
export async function batchCreate(
  tableId: string,
  records: Array<{ fields: Record<string, unknown> }>,
  options: { apiKey: string; baseId: string }
): Promise<AirtableRecord[]> {
  const { apiKey, baseId } = options
  const created: AirtableRecord[] = []

  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10)
    const response = await airtableRequest(tableId, {
      method: 'POST',
      body: { records: batch },
      apiKey,
      baseId,
    }) as { records: AirtableRecord[] }

    created.push(...response.records)

    // Rate limiting between batches
    if (i + 10 < records.length) {
      await delay(200)
    }
  }

  return created
}

export async function batchUpdate(
  tableId: string,
  records: Array<{ id: string; fields: Record<string, unknown> }>,
  options: { apiKey: string; baseId: string }
): Promise<AirtableRecord[]> {
  const { apiKey, baseId } = options
  const updated: AirtableRecord[] = []

  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10)
    const response = await airtableRequest(tableId, {
      method: 'PATCH',
      body: { records: batch },
      apiKey,
      baseId,
    }) as { records: AirtableRecord[] }

    updated.push(...response.records)

    if (i + 10 < records.length) {
      await delay(200)
    }
  }

  return updated
}

export async function batchDelete(
  tableId: string,
  recordIds: string[],
  options: { apiKey: string; baseId: string }
): Promise<void> {
  const { apiKey, baseId } = options

  for (let i = 0; i < recordIds.length; i += 10) {
    const batch = recordIds.slice(i, i + 10)
    const params = batch.map(id => `records[]=${id}`).join('&')

    await airtableRequest(`${tableId}?${params}`, {
      method: 'DELETE',
      apiKey,
      baseId,
    })

    if (i + 10 < recordIds.length) {
      await delay(200)
    }
  }
}
