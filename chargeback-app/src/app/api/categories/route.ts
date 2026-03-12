import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/categories?includeInactive=true
// Returns service categories sorted by sortOrder, then name.
// By default only active categories are returned; pass includeInactive=true to include all.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const categories = await prisma.serviceCategory.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [
        { sortOrder: 'asc' },
        { name:      'asc' },
      ],
    })

    return NextResponse.json(categories)
  } catch (err) {
    console.error('[GET /api/categories]', err)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST /api/categories
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, name, description, color, sortOrder } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name' },
        { status: 400 }
      )
    }

    const category = await prisma.serviceCategory.create({
      data: {
        code,
        name,
        description: description ?? null,
        color:       color       ?? null,
        sortOrder:   sortOrder   ?? 0,
        isActive:    true,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (err: unknown) {
    if (isUniqueConstraintError(err)) {
      return NextResponse.json(
        { error: 'A category with this code already exists' },
        { status: 409 }
      )
    }
    console.error('[POST /api/categories]', err)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
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
