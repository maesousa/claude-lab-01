import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/direct-costs/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { totalCost, notes } = body

    const record = await prisma.directCost.update({
      where: { id: params.id },
      data: {
        ...(totalCost !== undefined && { totalCost: String(totalCost) }),
        ...(notes     !== undefined && { notes }),
      },
      include: {
        area:   { include: { direcao: true } },
        itItem: true,
      },
    })

    return NextResponse.json({
      ...record,
      totalCost: record.totalCost.toString(),
    })
  } catch (err) {
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: 'Direct cost not found' }, { status: 404 })
    }
    console.error('[PATCH /api/direct-costs/[id]]', err)
    return NextResponse.json({ error: 'Failed to update direct cost' }, { status: 500 })
  }
}

// DELETE /api/direct-costs/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.directCost.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: 'Direct cost not found' }, { status: 404 })
    }
    console.error('[DELETE /api/direct-costs/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete direct cost' }, { status: 500 })
  }
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err &&
    (err as { code: string }).code === 'P2025'
  )
}
