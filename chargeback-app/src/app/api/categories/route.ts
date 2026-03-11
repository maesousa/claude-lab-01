import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/categories
// Returns all active service categories sorted by sortOrder, then name
export async function GET() {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
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
