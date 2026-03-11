import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/areas
// Returns all active areas with direcao → pelouro, sorted by code
export async function GET() {
  try {
    const areas = await prisma.area.findMany({
      where: { isActive: true },
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
