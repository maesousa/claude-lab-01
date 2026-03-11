/**
 * Unit tests for chargeback cost calculation rules.
 *
 * These tests document and guard the core business arithmetic:
 *   assignment cost = quantity × unit price
 *   total chargeback = Σ (assignment costs) + Σ (direct costs)
 *
 * They do NOT depend on the database or the API layer.
 */

// ─── Helpers (inline — same logic used in /api/assignments GET) ────────────────

function computeAssignmentCost(quantity: unknown, unitPrice: unknown): number {
  return Number(quantity) * Number(unitPrice)
}

function computeTotal(items: Array<{ quantity: unknown; unitPrice: unknown }>): number {
  return items.reduce((sum, i) => sum + computeAssignmentCost(i.quantity, i.unitPrice), 0)
}

// ─── Assignment cost ──────────────────────────────────────────────────────────

describe('computeAssignmentCost', () => {
  it('returns quantity × unitPrice for whole numbers', () => {
    expect(computeAssignmentCost(2, 500)).toBe(1000)
  })

  it('returns quantity × unitPrice for decimal quantities', () => {
    // 0.5 licences × €1 200/licence = €600
    expect(computeAssignmentCost(0.5, 1200)).toBe(600)
  })

  it('returns zero when quantity is zero', () => {
    expect(computeAssignmentCost(0, 500)).toBe(0)
  })

  it('returns zero when unit price is zero (no price defined)', () => {
    // The API falls back to unitPrice = 0 when no AnnualPrice row exists
    expect(computeAssignmentCost(3, 0)).toBe(0)
  })

  it('handles string inputs (Prisma Decimal serialized as string)', () => {
    // quantity='1.000', unitPrice='499.99' come out of the DB as strings
    expect(computeAssignmentCost('1.000', '499.99')).toBeCloseTo(499.99)
  })

  it('handles large values without overflow', () => {
    // 100 servers × €12 000/year = €1 200 000
    expect(computeAssignmentCost(100, 12000)).toBe(1_200_000)
  })

  it('returns NaN for non-numeric inputs (guards against bad data)', () => {
    // Non-numeric data should not silently produce wrong results
    expect(Number.isFinite(computeAssignmentCost('bad', 100))).toBe(false)
  })
})

// ─── Total cost aggregation ───────────────────────────────────────────────────

describe('computeTotal', () => {
  it('sums multiple assignment costs correctly', () => {
    const items = [
      { quantity: 1, unitPrice: 500 },
      { quantity: 2, unitPrice: 300 },
      { quantity: 0.5, unitPrice: 1200 },
    ]
    // 500 + 600 + 600 = 1700
    expect(computeTotal(items)).toBe(1700)
  })

  it('returns 0 for an empty list', () => {
    expect(computeTotal([])).toBe(0)
  })

  it('returns 0 when all prices are missing (unitPrice = 0)', () => {
    const items = [
      { quantity: 5, unitPrice: 0 },
      { quantity: 3, unitPrice: 0 },
    ]
    expect(computeTotal(items)).toBe(0)
  })

  it('handles mixed string and number inputs', () => {
    const items = [
      { quantity: '2', unitPrice: '750.00' },
      { quantity: 1, unitPrice: 250 },
    ]
    // 1500 + 250 = 1750
    expect(computeTotal(items)).toBe(1750)
  })
})

// ─── toFixed(2) rounding (used in the API response) ──────────────────────────

describe('cost serialisation — toFixed(2)', () => {
  it('rounds to 2 decimal places', () => {
    const cost = computeAssignmentCost('1', '333.333')
    expect(cost.toFixed(2)).toBe('333.33')
  })

  it('preserves trailing zero for whole costs', () => {
    const cost = computeAssignmentCost(2, 500)
    expect(cost.toFixed(2)).toBe('1000.00')
  })
})
