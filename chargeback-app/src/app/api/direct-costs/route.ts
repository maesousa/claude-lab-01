import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/direct-costs?year=2026&areaId=...&direcaoId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year      = parseInt(searchParams.get('year') ?? '2026')
    const areaId    = searchParams.get('areaId')    ?? undefined
    const direcaoId = searchParams.get('direcaoId') ?? undefined

    const records = await prisma.directCost.findMany({
      where: {
        year,
        ...(areaId    ? { areaId } : {}),
        ...(direcaoId ? { area: { direcaoId } } : {}),
      },
      include: {
        area: {
          include: {
            direcao: { include: { pelouro: true } },
          },
        },
        itItem: { include: { serviceCategory: true } },
      },
      orderBy: [
        { area: { name: 'asc' } },
        { itItem: { name: 'asc' } },
      ],
    })

    const serialized = records.map((dc) => ({
      ...dc,
      totalCost: dc.totalCost.toString(),
    }))

    return NextResponse.json(serialized)
  } catch (err) {
    console.error('[GET /api/direct-costs]', err)
    return NextResponse.json({ error: 'Failed to fetch direct costs' }, { status: 500 })
  }
}

// POST /api/direct-costs
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { areaId, itItemId, year, totalCost, notes } = body

    if (!areaId || !itItemId || !year || totalCost == null) {
      return NextResponse.json(
        { error: 'Missing required fields: areaId, itItemId, year, totalCost' },
        { status: 400 }
      )
    }

    // Validate item is CHARGEBACK
    const item = await prisma.iTItem.findUnique({ where: { id: itItemId } })
    if (!item) {
      return NextResponse.json({ error: 'IT item not found' }, { status: 404 })
    }
    if (item.fundingModel !== 'CHARGEBACK') {
      return NextResponse.json({ error: 'Only CHARGEBACK items can have direct area costs' }, { status: 422 })
    }

    const record = await prisma.directCost.create({
      data: {
        areaId,
        itItemId,
        year:      Number(year),
        totalCost: String(totalCost),
        notes:     notes ?? null,
      },
      include: {
        area:   { include: { direcao: { include: { pelouro: true } } } },
        itItem: { include: { serviceCategory: true } },
      },
    })

    return NextResponse.json({
      ...record,
      totalCost: record.totalCost.toString(),
    }, { status: 201 })
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return NextResponse.json({ error: 'Direct cost record already exists for this area/item/year' }, { status: 409 })
    }
    console.error('[POST /api/direct-costs]', err)
    return NextResponse.json({ error: 'Failed to create direct cost' }, { status: 500 })
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err &&
    (err as { code: string }).code === 'P2002'
  )
}
