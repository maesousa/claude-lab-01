import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/dsi-responsibles
// Returns DSI Responsible records ordered by code.
// By default only active records are returned; pass includeInactive=true to include all.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const records = await prisma.dSIResponsible.findMany({
      where:   includeInactive ? undefined : { isActive: true },
      orderBy: { code: 'asc' },
    })

    return NextResponse.json(records)
  } catch (err) {
    console.error('[GET /api/dsi-responsibles]', err)
    return NextResponse.json({ error: 'Failed to fetch DSI Responsibles' }, { status: 500 })
  }
}

// POST /api/dsi-responsibles
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, name, email } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name' },
        { status: 400 }
      )
    }

    const record = await prisma.dSIResponsible.create({
      data: {
        code:     code.trim().toUpperCase(),
        name:     name.trim(),
        email:    email?.trim() || null,
        isActive: true,
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (err: unknown) {
    if (isUniqueConstraintError(err)) {
      return NextResponse.json(
        { error: 'A DSI Responsible with this code already exists' },
        { status: 409 }
      )
    }
    console.error('[POST /api/dsi-responsibles]', err)
    return NextResponse.json({ error: 'Failed to create DSI Responsible' }, { status: 500 })
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
