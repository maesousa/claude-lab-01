import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  parseUploadedFile,
  COL,
  validateYear,
  validatePositiveNumber,
  type ValidatedRow,
  type ImportPreviewResponse,
  type ImportResult,
} from '@/lib/importUtils'

// POST /api/import/prices
// FormData fields:
//   file    — .xlsx or .csv with columns: itItemCode, year, unitPrice, notes?
//   dryRun  — 'true' → validate only; omit → validate + insert (no update; duplicates skipped)
//
// Expected columns (case-insensitive, aliases accepted):
//   itItemCode | year | unitPrice | notes
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
    const [items, existingPrices] = await Promise.all([
      prisma.iTItem.findMany({
        select: { id: true, code: true, name: true },
      }),
      prisma.annualPrice.findMany({
        select: { itItemId: true, year: true },
      }),
    ])

    const itemMap = new Map(items.map((i) => [i.code, i]))

    const existingSet = new Set(
      existingPrices.map((p) => `${p.itItemId}|${p.year}`)
    )

    const batchSeen = new Set<string>()

    // ── Validate rows ─────────────────────────────────────────────────────
    const validated: ValidatedRow[] = rows.map((raw, i) => {
      const errors: string[] = []
      const row: ValidatedRow = { rowIndex: i + 1, status: 'valid', errors }

      const itItemCode  = COL.itItemCode(raw)
      const yearRaw     = COL.year(raw)
      const priceRaw    = COL.unitPrice(raw)
      const notes       = COL.notes(raw) || null

      row.itItemCode = itItemCode || undefined
      row.notes      = notes ?? undefined

      if (!itItemCode) errors.push('itItemCode is required')
      if (!yearRaw)    errors.push('year is required')
      if (!priceRaw && priceRaw !== '0') errors.push('unitPrice is required')

      // Year
      if (yearRaw) {
        const yResult = validateYear(yearRaw)
        if (yResult.ok) row.year = yResult.value
        else errors.push(yResult.error)
      }

      // Unit price (zero is allowed — e.g., corporate item at no chargeback cost)
      if (priceRaw !== undefined && priceRaw !== '') {
        const pResult = validatePositiveNumber(priceRaw, 'Unit Price', /* allowZero */ true)
        if (pResult.ok) row.unitPrice = pResult.value
        else errors.push(pResult.error)
      }

      // IT Item lookup
      if (itItemCode) {
        const item = itemMap.get(itItemCode)
        if (!item) {
          errors.push(`IT item "${itItemCode}" not found`)
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
      const batchKey = `${itItemCode}|${row.year}`
      if (batchSeen.has(batchKey)) {
        row.status = 'duplicate'
        row.errors = ['Duplicate row within this import file']
        return row
      }
      batchSeen.add(batchKey)

      // DB duplicate → prices are insert-only; mark as duplicate (will be skipped)
      const dbKey = `${row.itItemId}|${row.year}`
      if (existingSet.has(dbKey)) {
        row.status = 'duplicate'
        row.errors = [`Price for ${itItemCode} / ${row.year} already exists`]
      }

      return row
    })

    const summary = {
      total:      validated.length,
      valid:      validated.filter((r) => r.status === 'valid').length,
      updates:    0,   // prices are never updated via import
      errors:     validated.filter((r) => r.status === 'error').length,
      duplicates: validated.filter((r) => r.status === 'duplicate').length,
    }

    if (dryRun) {
      const preview: ImportPreviewResponse = { rows: validated, summary }
      return NextResponse.json(preview)
    }

    // ── Perform import ────────────────────────────────────────────────────
    let imported = 0, skipped = 0
    const errors: Array<{ row: number; message: string }> = []

    const importable = validated.filter((r) => r.status === 'valid')

    for (const row of importable) {
      try {
        await prisma.annualPrice.create({
          data: {
            itItemId:  row.itItemId!,
            year:      row.year!,
            unitPrice: row.unitPrice!,
            notes:     row.notes ?? null,
          },
          select: { id: true },
        })
        imported++
      } catch (err: unknown) {
        if (
          typeof err === 'object' && err !== null && 'code' in err &&
          (err as { code: string }).code === 'P2002'
        ) {
          skipped++
        } else {
          errors.push({ row: row.rowIndex, message: 'Unexpected error during insert' })
        }
      }
    }

    const result: ImportResult = { imported, updated: 0, skipped, errors }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/import/prices]', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
