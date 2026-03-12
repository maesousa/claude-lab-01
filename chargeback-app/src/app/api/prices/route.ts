import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// GET /api/prices?year=2026&categoryId=xxx&search=laptop
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year       = parseInt(searchParams.get('year') ?? '2026')
    const categoryId = searchParams.get('categoryId') ?? undefined
    const search     = searchParams.get('search')     ?? undefined

    // Build itItem filter as a typed variable to satisfy Prisma's relation-filter types
    const itItemFilter: Prisma.ITItemWhereInput = {}
    if (categoryId) itItemFilter.serviceCategoryId = categoryId
    if (search) {
      // SQLite does not support mode:'insensitive'; case-sensitive contains is used here.
      // Client-side filtering in AnnualPricesClient handles case-insensitive UX.
      itItemFilter.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ]
    }

    const prices = await prisma.annualPrice.findMany({
      where: {
        year,
        ...(Object.keys(itItemFilter).length > 0 ? { itItem: itItemFilter } : {}),
      },
      include: {
        itItem: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true,
            serviceCategory: {
              select: { id: true, code: true, name: true, color: true, sortOrder: true },
            },
          },
        },
      },
      orderBy: [
        { itItem: { serviceCategory: { sortOrder: 'asc' } } },
        { itItem: { name: 'asc' } },
      ],
    })

    const serialized = prices.map((p) => ({
      ...p,
      unitPrice: p.unitPrice.toString(),
    }))

    return NextResponse.json(serialized)
  } catch (err) {
    console.error('[GET /api/prices]', err)
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}

// POST /api/prices
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { itItemId, year, unitPrice, notes } = body

    if (!itItemId || !year || unitPrice === undefined || unitPrice === null || unitPrice === '') {
      return NextResponse.json(
        { error: 'Missing required fields: itItemId, year, unitPrice' },
        { status: 400 }
      )
    }

    const price = parseFloat(unitPrice)
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'unitPrice must be a non-negative number' }, { status: 400 })
    }

    const created = await prisma.annualPrice.create({
      data: {
        itItemId,
        year: parseInt(year),
        unitPrice: price,
        notes: notes ?? null,
      },
      include: {
        itItem: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true,
            serviceCategory: {
              select: { id: true, code: true, name: true, color: true, sortOrder: true },
            },
          },
        },
      },
    })

    return NextResponse.json(
      { ...created, unitPrice: created.unitPrice.toString() },
      { status: 201 }
    )
  } catch (err: unknown) {
    if (isUniqueConstraintError(err)) {
      return NextResponse.json(
        { error: 'A price already exists for this item and year' },
        { status: 409 }
      )
    }
    console.error('[POST /api/prices]', err)
    return NextResponse.json({ error: 'Failed to create price' }, { status: 500 })
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
