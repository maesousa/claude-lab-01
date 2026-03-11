import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/employees
// Returns all active employees with area → direcao → pelouro, sorted by last name
export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      include: {
        area: {
          include: {
            direcao: {
              include: { pelouro: true },
            },
          },
        },
      },
      orderBy: [
        { lastName:  'asc' },
        { firstName: 'asc' },
      ],
    })

    return NextResponse.json(employees)
  } catch (err) {
    console.error('[GET /api/employees]', err)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}
