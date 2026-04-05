import { describe, it, expect } from 'vitest'
import { parseClaudeResponse, buildExtractionPrompt, buildMetadataOnlyPrompt } from '../../electron/gmail/claude-client'

describe('parseClaudeResponse', () => {
  it('parses clean JSON response', () => {
    const raw = '{"first_name": "Sarah", "last_name": "Chen", "job_title": "VP Marketing", "company_name": "Acme Corp", "phone": "+1-555-867-5309", "relationship_type": "Client", "confidence": 78, "reasoning": "Frequent correspondent."}'
    const result = parseClaudeResponse(raw)
    expect(result).not.toBeNull()
    expect(result!.first_name).toBe('Sarah')
    expect(result!.confidence).toBe(78)
    expect(result!.relationship_type).toBe('Client')
  })

  it('strips ```json fences', () => {
    const raw = '```json\n{"first_name": null, "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Prospect", "confidence": 42, "reasoning": "Test."}\n```'
    const result = parseClaudeResponse(raw)
    expect(result).not.toBeNull()
    expect(result!.relationship_type).toBe('Prospect')
  })

  it('strips ``` fences without json tag', () => {
    const raw = '```\n{"first_name": "James", "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Other", "confidence": 20, "reasoning": "Low signal."}\n```'
    const result = parseClaudeResponse(raw)
    expect(result).not.toBeNull()
    expect(result!.first_name).toBe('James')
  })

  it('rejects invalid confidence (> 100)', () => {
    const raw = '{"first_name": null, "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Other", "confidence": 150, "reasoning": "Test."}'
    expect(parseClaudeResponse(raw)).toBeNull()
  })

  it('rejects invalid relationship_type', () => {
    const raw = '{"first_name": null, "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "BestFriend", "confidence": 50, "reasoning": "Test."}'
    expect(parseClaudeResponse(raw)).toBeNull()
  })

  it('returns null for garbage input', () => {
    expect(parseClaudeResponse('not json at all')).toBeNull()
    expect(parseClaudeResponse('')).toBeNull()
  })

  it('handles null fields correctly', () => {
    const raw = '{"first_name": null, "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Other", "confidence": 10, "reasoning": "Unknown."}'
    const result = parseClaudeResponse(raw)
    expect(result).not.toBeNull()
    expect(result!.first_name).toBeNull()
    expect(result!.job_title).toBeNull()
  })
})

describe('buildExtractionPrompt', () => {
  it('includes email body and metadata', () => {
    const prompt = buildExtractionPrompt('Hello\nSignature here', {
      email: 'test@acme.com', threadCount: 5, fromCount: 3,
      toCount: 2, ccCount: 0, firstSeen: '2025-06-01', lastSeen: '2026-04-01',
    })
    expect(prompt).toContain('Signature here')
    expect(prompt).toContain('test@acme.com')
    expect(prompt).toContain('Thread count: 5')
    expect(prompt).toContain('relationship_type must be one of')
  })
})

describe('buildMetadataOnlyPrompt', () => {
  it('includes metadata but no body section', () => {
    const prompt = buildMetadataOnlyPrompt({
      email: 'test@acme.com', threadCount: 5, fromCount: 3,
      toCount: 2, ccCount: 0, firstSeen: '2025-06-01', lastSeen: '2026-04-01',
    })
    expect(prompt).toContain('test@acme.com')
    expect(prompt).toContain('No email body is available')
    expect(prompt).toContain('relationship_type must be one of')
  })
})
