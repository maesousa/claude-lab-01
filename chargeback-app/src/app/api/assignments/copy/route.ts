import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/assignments/copy
// Copies all assignments from fromYear to toYear, skipping rows where the same
// (employeeId, itItemId, year) already exists.
// Returns { created: number, skipped: number }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fromYear, toYear } = body

    if (!fromYear || !toYear) {
      return NextResponse.json(
        { error: 'Missing required fields: fromYear, toYear' },
        { status: 400 }
      )
    }

    const from = parseInt(fromYear)
    const to   = parseInt(toYear)

    if (isNaN(from) || isNaN(to)) {
      return NextResponse.json(
        { error: 'fromYear and toYear must be integers' },
        { status: 400 }
      )
    }

    if (from === to) {
      return NextResponse.json(
        { error: 'Cannot copy assignments into the same year.' },
        { status: 400 }
      )
    }

    // Fetch source assignments and existing target-year rows in parallel
    const [sourceAssignments, existingAssignments] = await Promise.all([
      prisma.assignment.findMany({ where: { year: from } }),
      prisma.assignment.findMany({
        where: { year: to },
        select: { employeeId: true, itItemId: true },
      }),
    ])

    if (sourceAssignments.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0 })
    }

    // Build a Set of existing (employeeId, itItemId) pairs for the target year
    const existingKeys = new Set(
      existingAssignments.map((a) => `${a.employeeId}::${a.itItemId}`)
    )

    const toCreate = sourceAssignments.filter(
      (a) => !existingKeys.has(`${a.employeeId}::${a.itItemId}`)
    )
    const skipped = sourceAssignments.length - toCreate.length

    if (toCreate.length > 0) {
      await prisma.assignment.createMany({
        data: toCreate.map((a) => ({
          employeeId: a.employeeId,
          itItemId:   a.itItemId,
          year:       to,
          quantity:   a.quantity,
          notes:      a.notes,
        })),
      })
    }

    return NextResponse.json({ created: toCreate.length, skipped })
  } catch (err) {
    console.error('[POST /api/assignments/copy]', err)
    return NextResponse.json({ error: 'Failed to copy assignments' }, { status: 500 })
  }
}
