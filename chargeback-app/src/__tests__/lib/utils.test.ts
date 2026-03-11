import { formatCurrency, toNumber } from '@/lib/utils'

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats a plain integer', () => {
    expect(formatCurrency(1000)).toBe('€ 1 000,00')
  })

  it('formats a decimal number', () => {
    expect(formatCurrency(1234.5)).toBe('€ 1 234,50')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('€ 0,00')
  })

  it('formats a string number (Prisma Decimal serialized form)', () => {
    expect(formatCurrency('500.00')).toBe('€ 500,00')
  })

  it('formats negative values', () => {
    expect(formatCurrency(-99.99)).toBe('€ -99,99')
  })

  it('returns — for NaN inputs', () => {
    expect(formatCurrency('not-a-number')).toBe('—')
  })

  it('returns — for null', () => {
    expect(formatCurrency(null)).toBe('—')
  })

  it('returns — for undefined', () => {
    expect(formatCurrency(undefined)).toBe('—')
  })

  it('uses a custom currency symbol', () => {
    const result = formatCurrency(100, '$')
    expect(result).toContain('$')
    expect(result).toContain('100')
  })
})

// ─── toNumber ─────────────────────────────────────────────────────────────────

describe('toNumber', () => {
  it('converts a number string', () => {
    expect(toNumber('42')).toBe(42)
  })

  it('converts a decimal string (Prisma Decimal serialized form)', () => {
    expect(toNumber('3.14')).toBe(3.14)
  })

  it('converts a plain number', () => {
    expect(toNumber(7)).toBe(7)
  })

  it('converts zero string', () => {
    expect(toNumber('0')).toBe(0)
  })

  it('returns 0 for an empty string', () => {
    expect(toNumber('')).toBe(0)
  })

  it('returns 0 for null', () => {
    expect(toNumber(null)).toBe(0)
  })

  it('returns 0 for undefined', () => {
    expect(toNumber(undefined)).toBe(0)
  })

  it('returns 0 for a non-numeric string', () => {
    expect(toNumber('abc')).toBe(0)
  })

  it('handles a Decimal-like object with valueOf', () => {
    // Mimics how Prisma Decimal objects behave when coerced
    const decimalLike = { valueOf: () => 1500.5, toString: () => '1500.50' }
    expect(toNumber(decimalLike)).toBe(1500.5)
  })
})
