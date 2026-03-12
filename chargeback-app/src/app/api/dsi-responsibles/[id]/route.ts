import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/dsi-responsibles/[id]
// Supports updating code, name, email, and isActive.
// Deactivating (isActive=false) is always allowed — IT items retain their reference.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { code, name, email, isActive } = body

    const record = await prisma.dSIResponsible.update({
      where: { id: params.id },
      data: {
        ...(code     !== undefined && { code: code.trim().toUpperCase() }),
        ...(name     !== undefined && { name: name.trim() }),
        ...(email    !== undefined && { email: email?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(record)
  } catch (err: unknown) {
    if (isUniqueConstraintError(err)) {
      return NextResponse.json(
        { error: 'A DSI Responsible with this code already exists' },
        { status: 409 }
      )
    }
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: 'DSI Responsible not found' }, { status: 404 })
    }
    console.error('[PATCH /api/dsi-responsibles/[id]]', err)
    return NextResponse.json({ error: 'Failed to update DSI Responsible' }, { status: 500 })
  }
}

// DELETE /api/dsi-responsibles/[id]
// Hard delete — blocked if ANY IT item (active or inactive) references this record.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Reference check: count all IT items pointing to this responsible
    const refCount = await prisma.iTItem.count({
      where: { dsiResponsibleId: params.id },
    })

    if (refCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: this person is still assigned to ${refCount} IT item${refCount === 1 ? '' : 's'}. Deactivate instead.`,
        },
        { status: 409 }
      )
    }

    await prisma.dSIResponsible.delete({ where: { id: params.id } })

    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: 'DSI Responsible not found' }, { status: 404 })
    }
    console.error('[DELETE /api/dsi-responsibles/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete DSI Responsible' }, { status: 500 })
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

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2025'
  )
}
