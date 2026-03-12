import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/areas/[id]
// Supports updating code, name, direcaoId, and isActive.
// Deactivating (isActive=false) is blocked if the area is referenced by any assignments or direct costs.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { code, name, direcaoId, isActive } = body

    // Data integrity: prevent deactivation if area is referenced
    if (isActive === false) {
      const [assignmentCount, directCostCount] = await Promise.all([
        prisma.assignment.count({ where: { employee: { areaId: params.id } } }),
        prisma.directCost.count({ where: { areaId: params.id } }),
      ])

      if (assignmentCount + directCostCount > 0) {
        return NextResponse.json(
          {
            error:
              'Cannot deactivate area: it is referenced by existing assignments or direct costs',
          },
          { status: 409 }
        )
      }
    }

    const area = await prisma.area.update({
      where: { id: params.id },
      data: {
        ...(code      !== undefined && { code }),
        ...(name      !== undefined && { name }),
        ...(direcaoId !== undefined && { direcaoId }),
        ...(isActive  !== undefined && { isActive }),
      },
      include: { direcao: { include: { pelouro: true } } },
    })

    return NextResponse.json(area)
  } catch (err: unknown) {
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }
    if (isUniqueConstraintError(err)) {
      return NextResponse.json({ error: 'An area with this code already exists' }, { status: 409 })
    }
    console.error('[PATCH /api/areas/[id]]', err)
    return NextResponse.json({ error: 'Failed to update area' }, { status: 500 })
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

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  )
}
