import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/areas?includeInactive=true
// Returns areas with direcao → pelouro, sorted by code.
// By default only active areas are returned; pass includeInactive=true to include all.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const areas = await prisma.area.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        direcao: {
          include: { pelouro: true },
        },
      },
      orderBy: { code: 'asc' },
    })

    return NextResponse.json(areas)
  } catch (err) {
    console.error('[GET /api/areas]', err)
    return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 })
  }
}

// POST /api/areas
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, name, direcaoId } = body

    if (!code || !name || !direcaoId) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, direcaoId' },
        { status: 400 }
      )
    }

    const area = await prisma.area.create({
      data: { code, name, direcaoId, isActive: true },
      include: { direcao: { include: { pelouro: true } } },
    })

    return NextResponse.json(area, { status: 201 })
  } catch (err: unknown) {
    if (isUniqueConstraintError(err)) {
      return NextResponse.json({ error: 'An area with this code already exists' }, { status: 409 })
    }
    console.error('[POST /api/areas]', err)
    return NextResponse.json({ error: 'Failed to create area' }, { status: 500 })
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
