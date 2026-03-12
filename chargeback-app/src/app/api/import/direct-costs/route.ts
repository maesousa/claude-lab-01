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

// POST /api/import/direct-costs
// FormData fields:
//   file    — .xlsx or .csv with columns: areaCode, itItemCode, year, totalCost, notes?
//   dryRun  — 'true' → validate only; omit → validate + upsert
//
// Expected columns (case-insensitive, aliases accepted):
//   areaCode | itItemCode | year | totalCost | notes
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

    // ── Pre-load all reference data ───────────────────────────────────────
    const [areas, items, existingCosts] = await Promise.all([
      prisma.area.findMany({
        select: { id: true, code: true, name: true, isActive: true },
      }),
      prisma.iTItem.findMany({
        select: { id: true, code: true, name: true, fundingModel: true },
      }),
      prisma.directCost.findMany({
        select: { areaId: true, itItemId: true, year: true },
      }),
    ])

    const areaMap = new Map(areas.map((a) => [a.code, a]))
    const itemMap = new Map(items.map((i) => [i.code, i]))

    const existingSet = new Set(
      existingCosts.map((c) => `${c.areaId}|${c.itItemId}|${c.year}`)
    )

    const batchSeen = new Set<string>()

    // ── Validate rows ─────────────────────────────────────────────────────
    const validated: ValidatedRow[] = rows.map((raw, i) => {
      const errors: string[] = []
      const row: ValidatedRow = { rowIndex: i + 1, status: 'valid', errors }

      const areaCode    = COL.areaCode(raw)
      const itItemCode  = COL.itItemCode(raw)
      const yearRaw     = COL.year(raw)
      const costRaw     = COL.totalCost(raw)
      const notes       = COL.notes(raw) || null

      row.areaCode   = areaCode   || undefined
      row.itItemCode = itItemCode || undefined
      row.notes      = notes ?? undefined

      if (!areaCode)   errors.push('areaCode is required')
      if (!itItemCode) errors.push('itItemCode is required')
      if (!yearRaw)    errors.push('year is required')
      if (!costRaw)    errors.push('totalCost is required')

      // Year
      if (yearRaw) {
        const yResult = validateYear(yearRaw)
        if (yResult.ok) row.year = yResult.value
        else errors.push(yResult.error)
      }

      // Total cost (zero is allowed — e.g. planned but not yet invoiced)
      if (costRaw) {
        const cResult = validatePositiveNumber(costRaw, 'Total Cost', /* allowZero */ true)
        if (cResult.ok) row.totalCost = cResult.value
        else errors.push(cResult.error)
      }

      // Area lookup
      if (areaCode) {
        const area = areaMap.get(areaCode)
        if (!area) {
          errors.push(`Area "${areaCode}" not found`)
        } else if (!area.isActive) {
          errors.push(`Area "${areaCode}" is inactive`)
        } else {
          row.areaId   = area.id
          row.areaName = area.name
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
      const batchKey = `${areaCode}|${itItemCode}|${row.year}`
      if (batchSeen.has(batchKey)) {
        row.status = 'duplicate'
        row.errors = ['Duplicate row within this import file']
        return row
      }
      batchSeen.add(batchKey)

      // DB duplicate → mark as update
      const dbKey = `${row.areaId}|${row.itItemId}|${row.year}`
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
        await prisma.directCost.upsert({
          where: {
            areaId_itItemId_year: {
              areaId:   row.areaId!,
              itItemId: row.itItemId!,
              year:     row.year!,
            },
          },
          create: {
            areaId:    row.areaId!,
            itItemId:  row.itItemId!,
            year:      row.year!,
            totalCost: String(row.totalCost!),
            notes:     row.notes ?? null,
          },
          update: {
            totalCost: String(row.totalCost!),
            notes:     row.notes ?? null,
          },
          select: { id: true },
        })

        if (row.status === 'update') updated++
        else imported++
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
    console.error('[POST /api/import/direct-costs]', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
