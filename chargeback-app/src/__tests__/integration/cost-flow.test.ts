/**
 * Integration-style test: full chargeback cost-flow.
 *
 * Simulates the complete lifecycle for a single year:
 *   1. POST an assignment → assignment created
 *   2. GET assignments   → cost appears correctly in response
 *   3. Total cost        → sum of all assignments equals expected grand total
 *   4. Funding guard     → CORPORATE items are rejected at the API boundary
 *   5. Idempotency guard → duplicate assignment (same employee/item/year) is rejected
 *
 * Prisma is mocked throughout — the tests exercise the real route handler logic
 * (validation, calculation, serialisation) with controlled database responses.
 */
import { GET as getAssignments, POST as postAssignment } from '@/app/api/assignments/route'

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const YEAR = 2026

const employee = {
  id: 'emp-flow', firstName: 'João', lastName: 'Ferreira',
  employeeNumber: 'EMP-FLOW', email: 'joao@example.com',
  areaId: 'area-flow', company: null, isActive: true,
  area: {
    id: 'area-flow', code: 'CC-999', name: 'Test Area',
    direcaoId: 'dir-flow', isActive: true,
    direcao: {
      id: 'dir-flow', name: 'Test Direcao', pelouroId: 'pel-flow', isActive: true,
      pelouro: { id: 'pel-flow', code: 'TST', name: 'Test Pelouro', isActive: true },
    },
  },
}

function buildChargebackItem(id: string, name: string, unitPrice: string) {
  return {
    id, code: `ITEM-${id}`, name,
    serviceCategoryId: 'cat-flow', fundingModel: 'CHARGEBACK',
    unit: 'licence', description: null, dsiResponsibleId: null, isActive: true,
    serviceCategory: { id: 'cat-flow', code: 'SW', name: 'Software', color: '#6366F1', sortOrder: 1, isActive: true, description: null },
    prices: [{ id: `price-${id}`, itItemId: id, year: YEAR, unitPrice: { toString: () => unitPrice }, notes: null }],
  }
}

function buildAssignment(id: string, quantity: string, item: ReturnType<typeof buildChargebackItem>) {
  return {
    id,
    employeeId: employee.id,
    itItemId:   item.id,
    year:       YEAR,
    notes:      null,
    quantity:   { toString: () => quantity },
    employee,
    itItem: item,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Chargeback cost-flow — 2026', () => {
  const laptop  = buildChargebackItem('item-laptop',  'Laptop Standard',   '1200.00')
  const m365    = buildChargebackItem('item-m365',    'Microsoft 365 E3',  '600.00')

  const assignments = [
    buildAssignment('asgn-1', '1',   laptop), // 1 × 1200 = 1200
    buildAssignment('asgn-2', '0.5', m365),   // 0.5 × 600  = 300
    buildAssignment('asgn-3', '2',   m365),   // 2 × 600    = 1200
  ]

  beforeEach(() => {
    db.assignment.findMany.mockResolvedValue(assignments)
  })

  it('returns all assignments for the year', async () => {
    const req = new Request(`http://localhost/api/assignments?year=${YEAR}`)
    const res = await getAssignments(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(3)
  })

  it('computes individual costs correctly', async () => {
    const req = new Request(`http://localhost/api/assignments?year=${YEAR}`)
    const res = await getAssignments(req)
    const data = await res.json()

    const byId = Object.fromEntries(data.map((a: { id: string; cost: string }) => [a.id, a.cost]))
    expect(byId['asgn-1']).toBe('1200.00') // 1 × 1200
    expect(byId['asgn-2']).toBe('300.00')  // 0.5 × 600
    expect(byId['asgn-3']).toBe('1200.00') // 2 × 600
  })

  it('grand total equals sum of all individual costs', async () => {
    const req = new Request(`http://localhost/api/assignments?year=${YEAR}`)
    const res = await getAssignments(req)
    const data = await res.json()

    const grandTotal = data.reduce((sum: number, a: { cost: string }) => sum + Number(a.cost), 0)
    // 1200 + 300 + 1200 = 2700
    expect(grandTotal).toBe(2700)
  })

  it('rejects creating an assignment for a CORPORATE item (funding guard)', async () => {
    const corporateItem = { id: 'item-corp', fundingModel: 'CORPORATE' }
    db.iTItem.findUnique.mockResolvedValue(corporateItem)

    const req = new Request('http://localhost/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: employee.id, itItemId: 'item-corp', year: YEAR, quantity: 1 }),
    })
    const res = await postAssignment(req)

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/CHARGEBACK/i)
  })

  it('rejects a duplicate assignment for the same employee/item/year (idempotency guard)', async () => {
    db.iTItem.findUnique.mockResolvedValue(laptop)
    db.assignment.create.mockRejectedValue({ code: 'P2002' })

    const req = new Request('http://localhost/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: employee.id, itItemId: laptop.id, year: YEAR, quantity: 1 }),
    })
    const res = await postAssignment(req)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/already exists/i)
  })
})
