import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/items/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, serviceCategoryId, fundingModel, unit, description, dsiResponsibleId, isActive } = body

    if (fundingModel && !['CORPORATE', 'CHARGEBACK'].includes(fundingModel)) {
      return NextResponse.json({ error: 'fundingModel must be CORPORATE or CHARGEBACK' }, { status: 400 })
    }

    const item = await prisma.iTItem.update({
      where: { id: params.id },
      data: {
        ...(name              !== undefined && { name }),
        ...(serviceCategoryId !== undefined && { serviceCategoryId }),
        ...(fundingModel      !== undefined && { fundingModel }),
        ...(unit              !== undefined && { unit }),
        ...(description       !== undefined && { description }),
        ...(dsiResponsibleId  !== undefined && { dsiResponsibleId }),
        ...(isActive          !== undefined && { isActive }),
      },
      include: { serviceCategory: true, dsiResponsible: true },
    })

    return NextResponse.json(item)
  } catch (err) {
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    console.error('[PATCH /api/items/[id]]', err)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

// DELETE /api/items/[id]  (soft delete)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.iTItem.update({
      where: { id: params.id },
      data: { isActive: false },
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    console.error('[DELETE /api/items/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
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
