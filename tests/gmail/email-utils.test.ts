// tests/gmail/email-utils.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeEmail, parseFromHeader, parseDisplayName } from '../../electron/gmail/email-utils'

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
