import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/assignments?year=2026&employeeId=...&areaId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year       = parseInt(searchParams.get('year') ?? '2026')
    const employeeId = searchParams.get('employeeId') ?? undefined
    const areaId     = searchParams.get('areaId')     ?? undefined

    const assignments = await prisma.assignment.findMany({
      where: {
        year,
        ...(employeeId ? { employeeId } : {}),
        ...(areaId     ? { employee: { areaId } } : {}),
      },
      include: {
        employee: {
          include: {
            area: {
              include: {
                direcao: { include: { pelouro: true } },
              },
            },
          },
        },
        itItem: {
          include: {
            serviceCategory: true,
            prices: { where: { year } },
          },
        },
      },
      orderBy: [
        { employee: { lastName: 'asc' } },
        { itItem:   { name: 'asc' } },
      ],
    })

    // Compute cost per assignment and serialize Decimals
    const serialized = assignments.map((a) => {
      const unitPrice = Number(a.itItem.prices[0]?.unitPrice ?? 0)
      const quantity  = Number(a.quantity)
      const cost      = quantity * unitPrice

      return {
        ...a,
        quantity: a.quantity.toString(),
        cost:     cost.toFixed(2),
        itItem: {
          ...a.itItem,
          prices: a.itItem.prices.map((p) => ({
            ...p,
            unitPrice: p.unitPrice.toString(),
          })),
        },
      }
    })

    return NextResponse.json(serialized)
  } catch (err) {
    console.error('[GET /api/assignments]', err)
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
  }
}

// POST /api/assignments
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, itItemId, year, quantity, notes } = body

    if (!employeeId || !itItemId || !year || quantity == null) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeId, itItemId, year, quantity' },
        { status: 400 }
      )
    }

    // Validate item is CHARGEBACK
    const item = await prisma.iTItem.findUnique({ where: { id: itItemId } })
    if (!item) {
      return NextResponse.json({ error: 'IT item not found' }, { status: 404 })
    }
    if (item.fundingModel !== 'CHARGEBACK') {
      return NextResponse.json({ error: 'Only CHARGEBACK items can be assigned to employees' }, { status: 422 })
    }

    const assignment = await prisma.assignment.create({
      data: {
        employeeId,
        itItemId,
        year: Number(year),
        quantity: String(quantity),
        notes: notes ?? null,
      },
      include: {
        employee: true,
        itItem:   { include: { serviceCategory: true, prices: { where: { year: Number(year) } } } },
      },
    })

    return NextResponse.json({
      ...assignment,
      quantity: assignment.quantity.toString(),
    }, { status: 201 })
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return NextResponse.json({ error: 'Assignment already exists for this employee/item/year' }, { status: 409 })
    }
    console.error('[POST /api/assignments]', err)
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err &&
    (err as { code: string }).code === 'P2002'
  )
}
