/**
 * Tests for GET /api/direct-costs and POST /api/direct-costs.
 *
 * Prisma is mocked — no database required.
 */
import { GET, POST } from '@/app/api/direct-costs/route'

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => ({
  prisma: {
    directCost: {
      findMany: jest.fn(),
      create:   jest.fn(),
    },
    iTItem: {
      findUnique: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

const db = prisma as unknown as {
  directCost: { findMany: jest.Mock; create: jest.Mock }
  iTItem:     { findUnique: jest.Mock }
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const mockDirecao = {
  id: 'dir-1', code: 'DIR-COM-01', name: 'Direção Comercial',
  pelouroId: 'pel-1', isActive: true,
  pelouro: { id: 'pel-1', code: 'COM', name: 'Comercial', isActive: true },
}

const mockArea = {
  id: 'area-1', code: 'CC-201', name: 'Marketing Digital',
  direcaoId: 'dir-1', isActive: true,
  direcao: mockDirecao,
}

const mockCategory = {
  id: 'cat-1', code: 'WORKPLACE_HW', name: 'Workplace Hardware',
  color: '#3B82F6', sortOrder: 1, isActive: true, description: null,
}

const mockItem = {
  id: 'item-1', code: 'HW-PRINTER', name: 'Office Printer',
  serviceCategoryId: 'cat-1', fundingModel: 'CHARGEBACK',
  unit: 'device', description: null, dsiResponsibleId: null, isActive: true,
  serviceCategory: mockCategory,
}

const mockDirectCost = {
  id:        'dc-1',
  areaId:    'area-1',
  itItemId:  'item-1',
  year:      2026,
  notes:     null,
  totalCost: { toString: () => '3500.00' },
  area:      mockArea,
  itItem:    mockItem,
}

// ─── GET /api/direct-costs ────────────────────────────────────────────────────

describe('GET /api/direct-costs', () => {
  it('returns 200 with a list of direct cost records', async () => {
    db.directCost.findMany.mockResolvedValue([mockDirectCost])

    const req = new Request('http://localhost/api/direct-costs?year=2026')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('dc-1')
  })

  it('serialises totalCost as a string', async () => {
    db.directCost.findMany.mockResolvedValue([mockDirectCost])

    const req = new Request('http://localhost/api/direct-costs?year=2026')
    const res = await GET(req)
    const data = await res.json()

    expect(typeof data[0].totalCost).toBe('string')
    expect(data[0].totalCost).toBe('3500.00')
  })

  it('passes year=2026 by default', async () => {
    db.directCost.findMany.mockResolvedValue([])

    const req = new Request('http://localhost/api/direct-costs')
    await GET(req)

    expect(db.directCost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ year: 2026 }) })
    )
  })

  it('passes areaId filter when provided', async () => {
    db.directCost.findMany.mockResolvedValue([])

    const req = new Request('http://localhost/api/direct-costs?year=2026&areaId=area-1')
    await GET(req)

    expect(db.directCost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ areaId: 'area-1' }) })
    )
  })

  it('returns 500 when Prisma throws', async () => {
    db.directCost.findMany.mockRejectedValue(new Error('DB error'))

    const req = new Request('http://localhost/api/direct-costs')
    const res = await GET(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/failed/i)
  })
})

// ─── POST /api/direct-costs ───────────────────────────────────────────────────

describe('POST /api/direct-costs', () => {
  const validBody = {
    areaId:    'area-1',
    itItemId:  'item-1',
    year:      2026,
    totalCost: 3500,
  }

  beforeEach(() => {
    db.iTItem.findUnique.mockResolvedValue(mockItem)
    db.directCost.create.mockResolvedValue({
      ...mockDirectCost,
      id:        'dc-new',
      totalCost: { toString: () => '3500.00' },
    })
  })

  it('creates a direct cost record and returns 201', async () => {
    const req = new Request('http://localhost/api/direct-costs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe('dc-new')
  })

  it('returns 400 when required fields are missing', async () => {
    const req = new Request('http://localhost/api/direct-costs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ areaId: 'area-1' }), // missing itItemId, year, totalCost
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/missing required/i)
  })

  it('returns 404 when the IT item does not exist', async () => {
    db.iTItem.findUnique.mockResolvedValue(null)

    const req = new Request('http://localhost/api/direct-costs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/not found/i)
  })

  it('returns 422 when the item is CORPORATE, not CHARGEBACK', async () => {
    db.iTItem.findUnique.mockResolvedValue({ ...mockItem, fundingModel: 'CORPORATE' })

    const req = new Request('http://localhost/api/direct-costs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/CHARGEBACK/i)
  })

  it('returns 409 on duplicate area/item/year', async () => {
    db.directCost.create.mockRejectedValue({ code: 'P2002' })

    const req = new Request('http://localhost/api/direct-costs', {
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
