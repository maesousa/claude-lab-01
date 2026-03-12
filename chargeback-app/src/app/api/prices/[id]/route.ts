import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/prices/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { unitPrice, notes } = body

    const data: Record<string, unknown> = {}

    if (unitPrice !== undefined) {
      const price = parseFloat(unitPrice)
      if (isNaN(price) || price < 0) {
        return NextResponse.json(
          { error: 'unitPrice must be a non-negative number' },
          { status: 400 }
        )
      }
      data.unitPrice = price
    }

    if (notes !== undefined) {
      data.notes = notes ?? null
    }

    const updated = await prisma.annualPrice.update({
      where: { id: params.id },
      data,
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

    return NextResponse.json({ ...updated, unitPrice: updated.unitPrice.toString() })
  } catch (err) {
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: 'Price record not found' }, { status: 404 })
    }
    console.error('[PATCH /api/prices/[id]]', err)
    return NextResponse.json({ error: 'Failed to update price' }, { status: 500 })
  }
}

// DELETE /api/prices/[id]  (hard delete)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.annualPrice.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: 'Price record not found' }, { status: 404 })
    }
    console.error('[DELETE /api/prices/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete price' }, { status: 500 })
  }
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2025'
  )
}
