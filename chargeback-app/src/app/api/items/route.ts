import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/items?year=2026&fundingModel=CHARGEBACK&categoryId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year         = parseInt(searchParams.get('year') ?? '2026')
    const fundingModel = searchParams.get('fundingModel') ?? undefined
    const categoryId   = searchParams.get('categoryId')  ?? undefined

    const items = await prisma.iTItem.findMany({
      where: {
        isActive: true,
        ...(fundingModel ? { fundingModel } : {}),
        ...(categoryId   ? { serviceCategoryId: categoryId } : {}),
      },
      include: {
        serviceCategory: true,
        dsiResponsible:  true,
        prices: { where: { year } },
      },
      orderBy: [
        { serviceCategory: { sortOrder: 'asc' } },
        { name: 'asc' },
      ],
    })

    // Serialize Decimal → string
    const serialized = items.map((item) => ({
      ...item,
      prices: item.prices.map((p) => ({
        ...p,
        unitPrice: p.unitPrice.toString(),
      })),
    }))

    return NextResponse.json(serialized)
  } catch (err) {
    console.error('[GET /api/items]', err)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}

// POST /api/items
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, name, serviceCategoryId, fundingModel, unit, description, dsiResponsibleId } = body

    if (!code || !name || !serviceCategoryId || !fundingModel || !unit) {
      return NextResponse.json({ error: 'Missing required fields: code, name, serviceCategoryId, fundingModel, unit' }, { status: 400 })
    }
    if (!['CORPORATE', 'CHARGEBACK'].includes(fundingModel)) {
      return NextResponse.json({ error: 'fundingModel must be CORPORATE or CHARGEBACK' }, { status: 400 })
    }

    const item = await prisma.iTItem.create({
      data: {
        code,
        name,
        serviceCategoryId,
        fundingModel,
        unit,
        description: description ?? null,
        dsiResponsibleId: dsiResponsibleId ?? null,
        isActive: true,
      },
      include: { serviceCategory: true, dsiResponsible: true },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (err: unknown) {
    if (isUniqueConstraintError(err)) {
      return NextResponse.json({ error: 'An item with this code already exists' }, { status: 409 })
    }
    console.error('[POST /api/items]', err)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  )
}
