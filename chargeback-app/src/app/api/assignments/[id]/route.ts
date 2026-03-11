import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/assignments/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { quantity, notes } = body

    const assignment = await prisma.assignment.update({
      where: { id: params.id },
      data: {
        ...(quantity !== undefined && { quantity: String(quantity) }),
        ...(notes    !== undefined && { notes }),
      },
      include: {
        employee: true,
        itItem:   true,
      },
    })

    return NextResponse.json({
      ...assignment,
      quantity: assignment.quantity.toString(),
    })
  } catch (err) {
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }
    console.error('[PATCH /api/assignments/[id]]', err)
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
  }
}

// DELETE /api/assignments/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.assignment.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }
    console.error('[DELETE /api/assignments/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 })
  }
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err &&
    (err as { code: string }).code === 'P2025'
  )
}
