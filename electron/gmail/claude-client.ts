// electron/gmail/claude-client.ts
// Claude Haiku API client for email contact classification + extraction.
// Prompt defined in: docs/superpowers/specs/2026-04-05-email-intelligence-cleanup-design.md

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

const VALID_RELATIONSHIP_TYPES = new Set([
  'Client', 'Prospect', 'Partner', 'Consultant', 'Vendor Contact',
  'Talent', 'Employee', 'Investor', 'Advisor', 'Industry Peer', 'Other',
])

export interface ClaudeClassification {
  first_name: string | null
  last_name: string | null
  job_title: string | null
  company_name: string | null
  phone: string | null
  relationship_type: string
  confidence: number
  reasoning: string
}

export interface CandidateMetadata {
  email: string
  threadCount: number
  fromCount: number
  toCount: number
  ccCount: number
  firstSeen: string
  lastSeen: string
}

// ─── Prompt Builders ──────────────────────────────────────────

export function buildExtractionPrompt(bodies: string | string[], meta: CandidateMetadata): string {
  const bodyArray = Array.isArray(bodies) ? bodies : [bodies]
  const bodySection = bodyArray.length === 1
    ? `Email body:\n---\n${bodyArray[0]}\n---`
    : bodyArray.map((b, i) => `Email ${i + 1}${i === 0 ? ' (most recent)' : ''}:\n---\n${b}\n---`).join('\n\n')

  return `You are extracting contact information from email${bodyArray.length > 1 ? 's' : ''}. The email bod${bodyArray.length > 1 ? 'ies below are from the same person, ordered newest to oldest. Extract their most current details' : 'y below belongs to a single person. Extract their details'}.

${bodySection}

Candidate metadata:
- Email: ${meta.email}
- Thread count: ${meta.threadCount}
- From/To/CC: ${meta.fromCount}/${meta.toCount}/${meta.ccCount}
- Time span: ${meta.firstSeen} to ${meta.lastSeen}

Respond with ONLY a JSON object, no markdown fences, no explanation. Use JSON null for unknown fields.

Example response:
{"first_name": "Sarah", "last_name": "Chen", "job_title": "VP Marketing", "company_name": "Acme Corp", "phone": "+1-555-867-5309", "relationship_type": "Client", "confidence": 78, "reasoning": "Frequent direct correspondent over 6 months with professional signature."}

Example with missing fields:
{"first_name": "James", "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Prospect", "confidence": 35, "reasoning": "Appeared in 2 threads as CC, no signature data available."}

relationship_type must be one of: Client, Prospect, Partner, Consultant, Vendor Contact, Talent, Employee, Investor, Advisor, Industry Peer, Other
confidence is 0-100 reflecting how confident you are this person is a real business contact worth adding to a CRM.
reasoning is one sentence explaining your classification.`
}

export function buildMetadataOnlyPrompt(meta: CandidateMetadata): string {
  return `You are classifying an email contact for a CRM. No email body is available — classify based on email patterns only.

Candidate metadata:
- Email: ${meta.email}
- Thread count: ${meta.threadCount}
- From/To/CC: ${meta.fromCount}/${meta.toCount}/${meta.ccCount}
- Time span: ${meta.firstSeen} to ${meta.lastSeen}

Respond with ONLY a JSON object, no markdown fences, no explanation. Use JSON null for unknown fields.

Example response:
{"first_name": null, "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Prospect", "confidence": 42, "reasoning": "Direct correspondent in 5 threads over 3 months, likely business contact."}

relationship_type must be one of: Client, Prospect, Partner, Consultant, Vendor Contact, Talent, Employee, Investor, Advisor, Industry Peer, Other
confidence is 0-100 reflecting how confident you are this person is a real business contact worth adding to a CRM.
reasoning is one sentence explaining your classification.`
}

// ─── Response Parsing ─────────────────────────────────────────

export function parseClaudeResponse(raw: string): ClaudeClassification | null {
  try {
    let text = raw.trim()
    if (!text) return null

    // Strip ```json or ``` fences
    const lines = text.split('\n')
    if (lines[0].trim().startsWith('```')) {
      lines.shift()
    }
    if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
      lines.pop()
    }
    text = lines.join('\n').trim()

    if (!text) return null

    const parsed = JSON.parse(text)

    // Validate confidence
    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
      return null
    }

    // Validate relationship_type
    if (!VALID_RELATIONSHIP_TYPES.has(parsed.relationship_type)) {
      return null
    }

    // Validate reasoning exists
    if (typeof parsed.reasoning !== 'string' || !parsed.reasoning) {
      return null
    }

    return {
      first_name: parsed.first_name ?? null,
      last_name: parsed.last_name ?? null,
      job_title: parsed.job_title ?? null,
      company_name: parsed.company_name ?? null,
      phone: parsed.phone ?? null,
      relationship_type: parsed.relationship_type,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    }
  } catch {
    return null
  }
}

// ─── API Call ─────────────────────────────────────────────────

export async function classifyWithClaude(prompt: string, apiKey: string): Promise<ClaudeClassification | null> {
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Claude] API error ${response.status}: ${errText}`)
      return null
    }

    const data = await response.json() as { content: Array<{ text: string }> }
    const text = data.content?.[0]?.text
    if (!text) return null

    return parseClaudeResponse(text)
  } catch (err) {
    console.error('[Claude] Request failed:', String(err))
    return null
  }
}

// ─── API Key Validation ───────────────────────────────────────

export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    })
    return response.status === 200
  } catch {
    return false
  }
}
