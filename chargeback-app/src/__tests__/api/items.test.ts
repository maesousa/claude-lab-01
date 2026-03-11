/**
 * Tests for GET /api/items and POST /api/items.
 *
 * Prisma is mocked — no database required.
 */
import { GET, POST } from '@/app/api/items/route'

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => ({
  prisma: {
    iTItem: {
      findMany:   jest.fn(),
      create:     jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

// Type helper — double cast through unknown because PrismaClient and the mock
// shape are structurally incompatible in strict mode.
const db = prisma as unknown as {
  iTItem: {
    findMany:   jest.Mock
    create:     jest.Mock
    findUnique: jest.Mock
  }
}

// ─── Shared fixture ───────────────────────────────────────────────────────────

const mockCategory = {
  id: 'cat-1', code: 'WORKPLACE_HW', name: 'Workplace Hardware',
  color: '#3B82F6', sortOrder: 1, isActive: true, description: null,
}

const mockItem = {
  id:                'item-1',
  code:              'HW-LAPTOP',
  name:              'Laptop Standard',
  serviceCategoryId: 'cat-1',
  fundingModel:      'CHARGEBACK',
  unit:              'device',
  description:       null,
  dsiResponsibleId:  null,
  isActive:          true,
  serviceCategory:   mockCategory,
  dsiResponsible:    null,
  prices: [
    { id: 'price-1', itItemId: 'item-1', year: 2026, unitPrice: { toString: () => '1200.00' }, notes: null },
  ],
}

// ─── GET /api/items ───────────────────────────────────────────────────────────

describe('GET /api/items', () => {
  beforeEach(() => {
    db.iTItem.findMany.mockResolvedValue([mockItem])
  })

  it('returns 200 with a list of items', async () => {
    const req = new Request('http://localhost/api/items')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].code).toBe('HW-LAPTOP')
  })

  it('serialises Decimal unitPrice to a string', async () => {
    const req = new Request('http://localhost/api/items')
    const res = await GET(req)
    const data = await res.json()

    expect(typeof data[0].prices[0].unitPrice).toBe('string')
    expect(data[0].prices[0].unitPrice).toBe('1200.00')
  })

  it('passes year=2026 by default to the Prisma query', async () => {
    const req = new Request('http://localhost/api/items')
    await GET(req)

    expect(db.iTItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          prices: { where: { year: 2026 } },
        }),
      })
    )
  })

  it('passes fundingModel filter when provided', async () => {
    const req = new Request('http://localhost/api/items?fundingModel=CHARGEBACK')
    await GET(req)

    expect(db.iTItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ fundingModel: 'CHARGEBACK' }),
      })
    )
  })

  it('returns 500 when Prisma throws', async () => {
    db.iTItem.findMany.mockRejectedValue(new Error('DB error'))

    const req = new Request('http://localhost/api/items')
    const res = await GET(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/failed/i)
  })
})

// ─── POST /api/items ──────────────────────────────────────────────────────────

describe('POST /api/items', () => {
  const validBody = {
    code:              'HW-MONITOR',
    name:              'Monitor 27"',
    serviceCategoryId: 'cat-1',
    fundingModel:      'CHARGEBACK',
    unit:              'device',
  }

  beforeEach(() => {
    db.iTItem.create.mockResolvedValue({
      ...validBody,
      id: 'item-new',
      description: null,
      dsiResponsibleId: null,
      isActive: true,
      serviceCategory: mockCategory,
      dsiResponsible: null,
    })
  })

  it('creates an item and returns 201', async () => {
    const req = new Request('http://localhost/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.code).toBe('HW-MONITOR')
  })

  it('returns 400 when required fields are missing', async () => {
    const req = new Request('http://localhost/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'HW-X' }), // missing name, category, fundingModel, unit
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/missing required/i)
  })

  it('returns 400 for invalid fundingModel values', async () => {
    const req = new Request('http://localhost/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, fundingModel: 'INVALID' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/fundingModel/i)
  })

  it('returns 409 on duplicate code (unique constraint)', async () => {
    db.iTItem.create.mockRejectedValue({ code: 'P2002' })

    const req = new Request('http://localhost/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/already exists/i)
  })
})
