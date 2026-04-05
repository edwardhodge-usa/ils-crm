// tests/gmail/email-utils.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { normalizeEmail, parseFromHeader, parseDisplayName, stripQuotedContent } from '../../electron/gmail/email-utils'

function loadFixture(name: string): string {
  return readFileSync(resolve(__dirname, '../shared/fixtures', name), 'utf-8')
}

describe('normalizeEmail', () => {
  it('strips plus aliases', () => {
    expect(normalizeEmail('sarah+newsletter@acme.com')).toBe('sarah@acme.com')
  })
  it('ignores Gmail dots', () => {
    expect(normalizeEmail('sarah.chen@gmail.com')).toBe('sarahchen@gmail.com')
  })
  it('does not strip dots for non-Gmail domains', () => {
    expect(normalizeEmail('sarah.chen@acme.com')).toBe('sarah.chen@acme.com')
  })
  it('lowercases', () => {
    expect(normalizeEmail('Sarah@ACME.com')).toBe('sarah@acme.com')
  })
})

describe('parseFromHeader', () => {
  it('extracts name and email from quoted header', () => {
    expect(parseFromHeader('"Sarah Chen" <sarah@acme.com>')).toEqual({
      name: 'Sarah Chen', email: 'sarah@acme.com'
    })
  })
  it('extracts name and email from unquoted header', () => {
    expect(parseFromHeader('Sarah Chen <sarah@acme.com>')).toEqual({
      name: 'Sarah Chen', email: 'sarah@acme.com'
    })
  })
  it('handles email-only (no display name)', () => {
    expect(parseFromHeader('sarah@acme.com')).toEqual({
      name: null, email: 'sarah@acme.com'
    })
  })
  it('handles company-as-name', () => {
    expect(parseFromHeader('"Acme Creative" <sarah@acme.com>')).toEqual({
      name: 'Acme Creative', email: 'sarah@acme.com'
    })
  })
})

describe('parseDisplayName', () => {
  it('splits first and last name', () => {
    expect(parseDisplayName('Sarah Chen')).toEqual({ first: 'Sarah', last: 'Chen' })
  })
  it('handles single name', () => {
    expect(parseDisplayName('Sarah')).toEqual({ first: 'Sarah', last: '' })
  })
  it('handles multi-part last name', () => {
    expect(parseDisplayName('Sarah van der Berg')).toEqual({ first: 'Sarah', last: 'van der Berg' })
  })
  it('returns null for email-like names', () => {
    expect(parseDisplayName('sarah@acme.com')).toEqual({ first: 'sarah', last: '' })
  })
  it('handles "Last, First" format', () => {
    expect(parseDisplayName('Patel, Ajay')).toEqual({ first: 'Ajay', last: 'Patel' })
  })
  it('handles "Last, First Middle" format', () => {
    expect(parseDisplayName('Chen, Sarah May')).toEqual({ first: 'Sarah May', last: 'Chen' })
  })
})

describe('stripQuotedContent', () => {
  it('strips > quoted Gmail thread', () => {
    const result = stripQuotedContent(loadFixture('gmail-thread-quoted.txt'))
    expect(result).toContain('VP of Operations | Acme Corp')
    expect(result).not.toContain('ImagineLab Studios')
    expect(result).not.toContain('sarah@imaginelabstudios.com')
  })

  it('strips Outlook From:/Sent: thread', () => {
    const result = stripQuotedContent(loadFixture('outlook-thread.txt'))
    expect(result).toContain('Director of Business Development')
    expect(result).not.toContain('edward@imaginelabstudios.com')
  })

  it('returns null for bare thanks reply (< 3 lines)', () => {
    const result = stripQuotedContent(loadFixture('bare-thanks-reply.txt'))
    expect(result).toBeNull()
  })

  it('returns full body for standalone message', () => {
    const result = stripQuotedContent(loadFixture('standalone-message.txt'))
    expect(result).toContain('Senior Producer | Great Wolf Resorts')
    expect(result).toContain('maria.lopez@greatwolf.com')
  })

  it('strips forwarded message content', () => {
    const result = stripQuotedContent(loadFixture('forwarded-message.txt'))
    // Only "FYI — see below." remains, which is < 3 lines
    expect(result).toBeNull()
    // result is null so forwarded body is not present
    expect(result ?? '').not.toContain('newsletter@industryconf.com')
  })

  it('strips mobile footer and quoted content below', () => {
    const result = stripQuotedContent(loadFixture('mobile-footer.txt'))
    // "Sounds good..." is 1 line after stripping footer — < 3 lines
    expect(result).toBeNull()
  })

  it('strips HTML blockquote content', () => {
    const result = stripQuotedContent(loadFixture('html-blockquote.html'), true)
    expect(result).toContain('CFO')
    expect(result).toContain('Riverside Entertainment')
    expect(result).not.toContain('ImagineLab Studios')
  })

  it('caps output at 50 lines', () => {
    const longBody = Array(100).fill('Line of text').join('\n')
    const result = stripQuotedContent(longBody)
    expect(result).not.toBeNull()
    expect(result!.split('\n').length).toBeLessThanOrEqual(50)
  })
})
