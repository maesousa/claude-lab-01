import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/prices/copy
// Copies all annual prices from fromYear to toYear, skipping items that already have a price for toYear.
// Returns { created: number, skipped: number }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fromYear, toYear } = body

    if (!fromYear || !toYear) {
      return NextResponse.json(
        { error: 'Missing required fields: fromYear, toYear' },
        { status: 400 }
      )
    }

    const from = parseInt(fromYear)
    const to   = parseInt(toYear)

    if (isNaN(from) || isNaN(to)) {
      return NextResponse.json({ error: 'fromYear and toYear must be integers' }, { status: 400 })
    }

    if (from === to) {
      return NextResponse.json(
        { error: 'fromYear and toYear must be different' },
        { status: 400 }
      )
    }

    // Fetch source prices and already-existing target-year prices in parallel
    const [sourcePrices, existingPrices] = await Promise.all([
      prisma.annualPrice.findMany({ where: { year: from } }),
      prisma.annualPrice.findMany({ where: { year: to }, select: { itItemId: true } }),
    ])

    if (sourcePrices.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0 })
    }

    // Filter to only items that don't yet have a price for toYear
    const existingItemIds = new Set(existingPrices.map((p) => p.itItemId))
    const toCreate = sourcePrices.filter((p) => !existingItemIds.has(p.itItemId))
    const skipped  = sourcePrices.length - toCreate.length

    if (toCreate.length > 0) {
      await prisma.annualPrice.createMany({
        data: toCreate.map((p) => ({
          itItemId:  p.itItemId,
          year:      to,
          unitPrice: p.unitPrice,
          notes:     p.notes,
        })),
      })
    }

    return NextResponse.json({ created: toCreate.length, skipped })
  } catch (err) {
    console.error('[POST /api/prices/copy]', err)
    return NextResponse.json({ error: 'Failed to copy prices' }, { status: 500 })
  }
}
