/**
 * Tests for GET /api/assignments and POST /api/assignments.
 *
 * The most critical tests here guard the cost calculation:
 *   cost = quantity × unitPrice (serialised with toFixed(2))
 *
 * Prisma is mocked — no database required.
 */
import { GET, POST } from '@/app/api/assignments/route'

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => ({
  prisma: {
    assignment: {
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
  assignment: { findMany: jest.Mock; create: jest.Mock }
  iTItem:     { findUnique: jest.Mock }
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const mockEmployee = {
  id: 'emp-1', firstName: 'Ana', lastName: 'Costa',
  employeeNumber: 'EMP001', email: 'ana@example.com',
  areaId: 'area-1', company: null, isActive: true,
  area: {
    id: 'area-1', code: 'CC-201', name: 'Marketing Digital',
    direcaoId: 'dir-1', isActive: true,
    direcao: {
      id: 'dir-1', name: 'Direção Comercial', pelouroId: 'pel-1', isActive: true,
      pelouro: { id: 'pel-1', code: 'COM', name: 'Comercial', isActive: true },
    },
  },
}

const mockCategory = {
  id: 'cat-1', code: 'WORKPLACE_HW', name: 'Workplace Hardware',
  color: '#3B82F6', sortOrder: 1, isActive: true, description: null,
}

function mockItemWithPrice(unitPrice: string) {
  return {
    id: 'item-1', code: 'HW-LAPTOP', name: 'Laptop Standard',
    serviceCategoryId: 'cat-1', fundingModel: 'CHARGEBACK',
    unit: 'device', description: null, dsiResponsibleId: null, isActive: true,
    serviceCategory: mockCategory,
    prices: [{ id: 'price-1', itItemId: 'item-1', year: 2026, unitPrice: { toString: () => unitPrice }, notes: null }],
  }
}

function mockAssignment(quantity: string, unitPrice: string) {
  return {
    id: 'asgn-1',
    employeeId: 'emp-1',
    itItemId:   'item-1',
    year:       2026,
    notes:      null,
    quantity:   { toString: () => quantity },
    employee:   mockEmployee,
    itItem:     mockItemWithPrice(unitPrice),
  }
}

// ─── GET /api/assignments ─────────────────────────────────────────────────────

describe('GET /api/assignments', () => {
  it('returns 200 with a list of assignments', async () => {
    db.assignment.findMany.mockResolvedValue([mockAssignment('1', '1200.00')])

    const req = new Request('http://localhost/api/assignments?year=2026')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('asgn-1')
  })

  it('computes cost = quantity × unitPrice', async () => {
    // 2 devices × €500/device = €1 000
    db.assignment.findMany.mockResolvedValue([mockAssignment('2', '500.00')])

    const req = new Request('http://localhost/api/assignments?year=2026')
    const res = await GET(req)
    const data = await res.json()

    expect(data[0].cost).toBe('1000.00')
  })

  it('computes cost correctly for a decimal quantity', async () => {
    // 0.5 licences × €1 200/licence = €600
    db.assignment.findMany.mockResolvedValue([mockAssignment('0.5', '1200.00')])

    const req = new Request('http://localhost/api/assignments?year=2026')
    const res = await GET(req)
    const data = await res.json()

    expect(data[0].cost).toBe('600.00')
  })

  it('computes cost = 0 when no price is available for the year', async () => {
    const assignment = {
      ...mockAssignment('1', '0'),
      itItem: { ...mockItemWithPrice('0'), prices: [] }, // no price row
    }
    db.assignment.findMany.mockResolvedValue([assignment])

    const req = new Request('http://localhost/api/assignments?year=2026')
    const res = await GET(req)
    const data = await res.json()

    expect(data[0].cost).toBe('0.00')
  })

  it('serialises quantity as a string', async () => {
    db.assignment.findMany.mockResolvedValue([mockAssignment('2', '500.00')])

    const req = new Request('http://localhost/api/assignments?year=2026')
    const res = await GET(req)
    const data = await res.json()

    expect(typeof data[0].quantity).toBe('string')
    expect(data[0].quantity).toBe('2')
  })

  it('serialises unitPrice as a string', async () => {
    db.assignment.findMany.mockResolvedValue([mockAssignment('1', '999.99')])

    const req = new Request('http://localhost/api/assignments?year=2026')
    const res = await GET(req)
    const data = await res.json()

    expect(typeof data[0].itItem.prices[0].unitPrice).toBe('string')
    expect(data[0].itItem.prices[0].unitPrice).toBe('999.99')
  })

  it('defaults year to 2026 when not specified', async () => {
    db.assignment.findMany.mockResolvedValue([])

    const req = new Request('http://localhost/api/assignments')
    await GET(req)

    expect(db.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ year: 2026 }) })
    )
  })

  it('returns 500 when Prisma throws', async () => {
    db.assignment.findMany.mockRejectedValue(new Error('DB error'))

    const req = new Request('http://localhost/api/assignments?year=2026')
    const res = await GET(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/failed/i)
  })
})

// ─── POST /api/assignments ────────────────────────────────────────────────────

describe('POST /api/assignments', () => {
  const validBody = {
    employeeId: 'emp-1',
    itItemId:   'item-1',
    year:       2026,
    quantity:   1,
  }

  const chargebackItem = {
    id: 'item-1', fundingModel: 'CHARGEBACK',
    name: 'Laptop Standard', code: 'HW-LAPTOP',
  }

  beforeEach(() => {
    db.iTItem.findUnique.mockResolvedValue(chargebackItem)
    db.assignment.create.mockResolvedValue({
      ...validBody,
      id:    'asgn-new',
      notes: null,
      quantity: { toString: () => '1' },
      employee: mockEmployee,
      itItem:   chargebackItem,
    })
  })

  it('creates an assignment and returns 201', async () => {
    const req = new Request('http://localhost/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe('asgn-new')
  })

  it('returns 400 when required fields are missing', async () => {
    const req = new Request('http://localhost/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: 'emp-1' }), // missing itItemId, year, quantity
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/missing required/i)
  })

  it('returns 404 when the IT item does not exist', async () => {
    db.iTItem.findUnique.mockResolvedValue(null)

    const req = new Request('http://localhost/api/assignments', {
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
    db.iTItem.findUnique.mockResolvedValue({ ...chargebackItem, fundingModel: 'CORPORATE' })

    const req = new Request('http://localhost/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/CHARGEBACK/i)
  })

  it('returns 409 on duplicate employee/item/year', async () => {
    db.assignment.create.mockRejectedValue({ code: 'P2002' })

    const req = new Request('http://localhost/api/assignments', {
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
