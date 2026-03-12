import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  parseUploadedFile,
  COL,
  validateYear,
  validatePositiveNumber,
  isUniqueConstraintError,
  type ValidatedRow,
  type ImportPreviewResponse,
  type ImportResult,
} from '@/lib/importUtils'

// POST /api/import/assignments
// FormData fields:
//   file    — .xlsx or .csv with columns: employeeNumber, itItemCode, year, quantity, notes?
//   dryRun  — 'true' → validate only (no write); omit or 'false' → validate + upsert
//
// Expected columns (case-insensitive, aliases accepted):
//   employeeNumber | itItemCode | year | quantity | notes
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file     = formData.get('file') as File | null
    const dryRun   = formData.get('dryRun') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const rows = await parseUploadedFile(file)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'File is empty or has no data rows' }, { status: 400 })
    }

    // ── Pre-load all reference data in one batch ──────────────────────────
    const [employees, items, existingAssignments] = await Promise.all([
      prisma.employee.findMany({
        select: { id: true, employeeNumber: true, firstName: true, lastName: true },
      }),
      prisma.iTItem.findMany({
        select: { id: true, code: true, name: true, fundingModel: true },
      }),
      prisma.assignment.findMany({
        select: { employeeId: true, itItemId: true, year: true },
      }),
    ])

    const employeeMap = new Map(employees.map((e) => [e.employeeNumber, e]))
    const itemMap     = new Map(items.map((i) => [i.code, i]))

    const existingSet = new Set(
      existingAssignments.map((a) => `${a.employeeId}|${a.itItemId}|${a.year}`)
    )

    // Track batch duplicates: (employeeNumber|itItemCode|year)
    const batchSeen = new Set<string>()

    // ── Validate rows ─────────────────────────────────────────────────────
    const validated: ValidatedRow[] = rows.map((raw, i) => {
      const errors: string[] = []
      const row: ValidatedRow = { rowIndex: i + 1, status: 'valid', errors }

      const employeeNumber = COL.employeeNumber(raw)
      const itItemCode     = COL.itItemCode(raw)
      const yearRaw        = COL.year(raw)
      const quantityRaw    = COL.quantity(raw)
      const notes          = COL.notes(raw) || null

      row.employeeNumber = employeeNumber || undefined
      row.itItemCode     = itItemCode     || undefined
      row.notes          = notes ?? undefined

      // Required field presence
      if (!employeeNumber) errors.push('employeeNumber is required')
      if (!itItemCode)     errors.push('itItemCode is required')
      if (!yearRaw)        errors.push('year is required')
      if (!quantityRaw)    errors.push('quantity is required')

      // Year
      if (yearRaw) {
        const yResult = validateYear(yearRaw)
        if (yResult.ok) row.year = yResult.value
        else errors.push(yResult.error)
      }

      // Quantity
      if (quantityRaw) {
        const qResult = validatePositiveNumber(quantityRaw, 'Quantity')
        if (qResult.ok) row.quantity = qResult.value
        else errors.push(qResult.error)
      }

      // Employee lookup
      if (employeeNumber) {
        const emp = employeeMap.get(employeeNumber)
        if (!emp) {
          errors.push(`Employee "${employeeNumber}" not found`)
        } else {
          row.employeeId   = emp.id
          row.employeeName = `${emp.firstName} ${emp.lastName}`
        }
      }

      // IT Item lookup
      if (itItemCode) {
        const item = itemMap.get(itItemCode)
        if (!item) {
          errors.push(`IT item "${itItemCode}" not found`)
        } else if (item.fundingModel !== 'CHARGEBACK') {
          errors.push(`IT item "${itItemCode}" is not a CHARGEBACK item`)
        } else {
          row.itItemId   = item.id
          row.itItemName = item.name
        }
      }

      if (errors.length > 0) {
        row.status = 'error'
        return row
      }

      // Batch duplicate check
      const batchKey = `${employeeNumber}|${itItemCode}|${row.year}`
      if (batchSeen.has(batchKey)) {
        row.status = 'duplicate'
        row.errors = ['Duplicate row within this import file']
        return row
      }
      batchSeen.add(batchKey)

      // DB duplicate check → mark as 'update' (will be upserted)
      const dbKey = `${row.employeeId}|${row.itItemId}|${row.year}`
      if (existingSet.has(dbKey)) {
        row.status = 'update'
      }

      return row
    })

    const summary = {
      total:      validated.length,
      valid:      validated.filter((r) => r.status === 'valid').length,
      updates:    validated.filter((r) => r.status === 'update').length,
      errors:     validated.filter((r) => r.status === 'error').length,
      duplicates: validated.filter((r) => r.status === 'duplicate').length,
    }

    if (dryRun) {
      const preview: ImportPreviewResponse = { rows: validated, summary }
      return NextResponse.json(preview)
    }

    // ── Perform import ────────────────────────────────────────────────────
    let imported = 0, updated = 0, skipped = 0
    const errors: Array<{ row: number; message: string }> = []

    const importable = validated.filter((r) => r.status === 'valid' || r.status === 'update')

    for (const row of importable) {
      try {
        const result = await prisma.assignment.upsert({
          where: {
            employeeId_itItemId_year: {
              employeeId: row.employeeId!,
              itItemId:   row.itItemId!,
              year:       row.year!,
            },
          },
          create: {
            employeeId: row.employeeId!,
            itItemId:   row.itItemId!,
            year:       row.year!,
            quantity:   row.quantity!,
            notes:      row.notes ?? null,
          },
          update: {
            quantity: row.quantity!,
            notes:    row.notes ?? null,
          },
          select: { id: true },
        })

        if (result) {
          if (row.status === 'update') updated++
          else imported++
        }
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          skipped++
        } else {
          errors.push({ row: row.rowIndex, message: 'Unexpected error during insert' })
        }
      }
    }

    const result: ImportResult = { imported, updated, skipped, errors }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/import/assignments]', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
