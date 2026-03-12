import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/categories/[id]
// Supports updating name, description, color, sortOrder, and isActive.
// Deactivating (isActive=false) is blocked if the category has active IT items.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, description, color, sortOrder, isActive } = body

    // Data integrity: prevent deactivation if active IT items reference this category
    if (isActive === false) {
      const activeItemCount = await prisma.iTItem.count({
        where: { serviceCategoryId: params.id, isActive: true },
      })

      if (activeItemCount > 0) {
        return NextResponse.json(
          {
            error: `Cannot deactivate category: it has ${activeItemCount} active IT item${activeItemCount === 1 ? '' : 's'}`,
          },
          { status: 409 }
        )
      }
    }

    const category = await prisma.serviceCategory.update({
      where: { id: params.id },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color       !== undefined && { color }),
        ...(sortOrder   !== undefined && { sortOrder: parseInt(sortOrder) }),
        ...(isActive    !== undefined && { isActive }),
      },
    })

    return NextResponse.json(category)
  } catch (err) {
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    console.error('[PATCH /api/categories/[id]]', err)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
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
