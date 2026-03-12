import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/direcoes
// Returns all active Direções with their Pelouro, sorted by code.
// Used as a reference dropdown for area create/edit forms.
export async function GET() {
  try {
    const direcoes = await prisma.direcao.findMany({
      where: { isActive: true },
      include: { pelouro: true },
      orderBy: { code: 'asc' },
    })

    return NextResponse.json(direcoes)
  } catch (err) {
    console.error('[GET /api/direcoes]', err)
    return NextResponse.json({ error: 'Failed to fetch direções' }, { status: 500 })
  }
}
