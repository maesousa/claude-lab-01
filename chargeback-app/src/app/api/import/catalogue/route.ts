import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  parseUploadedFile,
  slugifyToCode,
  validatePositiveNumber,
  isUniqueConstraintError,
  type CatalogueValidatedRow,
  type CataloguePreviewResponse,
  type ImportResult,
} from '@/lib/importUtils'

// POST /api/import/catalogue
// FormData fields:
//   file    — .xlsx using the "Tabela Preços" sheet template
//   dryRun  — 'true' → validate only (no write); omit/false → validate + upsert
//
// Expected sheet: first sheet (usually "Tabela Preços")
// Columns (after normalisation):
//   "ID"                 → "id"               (item code; may be empty → auto-generated)
//   "Posto de Trabalho"  → "postodetrabalho"   (item name; required)
//   "Valor YYYY"         → "valorYYYY"         (unit price; year auto-detected)
//
// Behaviour:
//   • Year is auto-detected from the column header (e.g., "Valor 2026" → year=2026).
//   • Rows where both id and name are blank are silently skipped (total/separator rows).
//   • Items with no ID get a code generated via slugifyToCode(name).
//   • New ITItems are created with fundingModel=CHARGEBACK, unit="unit".
//   • New ITItems are assigned to the first ServiceCategory (by sortOrder).
//     Existing items keep their current category.
//   • AnnualPrice is upserted for (itItemId, year).
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

    // ── Detect year from column header ────────────────────────────────────
    // After normaliseKey: "Valor 2026" → "valor2026"
    const sampleRow  = rows[0]
    const yearColKey = Object.keys(sampleRow).find((k) => /^valor\d{4}$/.test(k))
    if (!yearColKey) {
      return NextResponse.json(
        { error: 'No "Valor YYYY" price column found. Please use the "Tabela Preços" sheet of the catalogue template.' },
        { status: 400 }
      )
    }
    const year = parseInt(yearColKey.replace('valor', ''), 10)

    // ── Pre-load reference data ───────────────────────────────────────────
    const [categories, existingItems, existingPrices] = await Promise.all([
      prisma.serviceCategory.findMany({
        orderBy: { sortOrder: 'asc' },
        select:  { id: true, name: true },
      }),
      prisma.iTItem.findMany({
        select: {
          id:   true,
          code: true,
          name: true,
          serviceCategory: { select: { name: true } },
        },
      }),
      prisma.annualPrice.findMany({
        where:  { year },
        select: { itItemId: true, unitPrice: true },
      }),
    ])

    if (categories.length === 0) {
      return NextResponse.json(
        { error: 'No service categories found. Please create at least one service category before importing the catalogue.' },
        { status: 400 }
      )
    }

    const defaultCategory = categories[0]
    const itemByCode      = new Map(existingItems.map((i) => [i.code, i]))
    const priceByItemId   = new Map(existingPrices.map((p) => [p.itItemId, Number(p.unitPrice)]))

    // Track batch-level duplicate item codes
    const seenCodes = new Set<string>()

    // ── Validate rows ──────────────────────────────────────────────────────
    const validated: CatalogueValidatedRow[] = []

    for (let i = 0; i < rows.length; i++) {
      const raw    = rows[i]
      const errors: string[] = []
      const row: CatalogueValidatedRow = { rowIndex: i + 1, status: 'valid', errors, year }

      const rawId    = (raw['id']              ?? '').trim()
      const rawName  = (raw['postodetrabalho'] ?? '').trim()
      const rawPrice = (raw[yearColKey]        ?? '').trim()

      // Skip blank separator rows (both id and name empty)
      if (!rawId && !rawName) continue

      if (!rawName) errors.push('Item name ("Posto de Trabalho") is required')

      // Determine code: use ID column if present, else generate from name
      const itemCode = rawId || (rawName ? slugifyToCode(rawName) : '')
      row.itemCode   = itemCode || undefined
      row.itemName   = rawName  || undefined

      if (!itemCode) errors.push('Could not determine item code (no ID and name is empty)')

      if (!rawPrice) {
        errors.push(`Unit price ("Valor ${year}") is required`)
      } else {
        const priceResult = validatePositiveNumber(rawPrice, 'Unit price', true)
        if (priceResult.ok) {
          row.unitPrice = priceResult.value
        } else {
          errors.push(priceResult.error)
        }
      }

      if (errors.length > 0) {
        row.status = 'error'
        validated.push(row)
        continue
      }

      // Batch duplicate check
      if (seenCodes.has(itemCode)) {
        row.status = 'duplicate'
        row.errors = [`Duplicate item code "${itemCode}" within this file`]
        validated.push(row)
        continue
      }
      seenCodes.add(itemCode)

      // Classify row based on existing DB state
      const existingItem = itemByCode.get(itemCode)
      row.isNewItem    = !existingItem
      row.categoryName = existingItem
        ? existingItem.serviceCategory.name
        : defaultCategory.name

      if (existingItem) {
        const existingPrice = priceByItemId.get(existingItem.id)
        if (existingPrice !== undefined) {
          row.existingPrice = existingPrice
          row.status = 'update'  // item + price exist → update price
        } else {
          row.status = 'valid'   // item exists, price for this year is new
        }
      } else {
        row.status = 'valid'     // item is new → create item + price
      }

      validated.push(row)
    }

    const summary = {
      total:      validated.length,
      valid:      validated.filter((r) => r.status === 'valid').length,
      updates:    validated.filter((r) => r.status === 'update').length,
      errors:     validated.filter((r) => r.status === 'error').length,
      duplicates: validated.filter((r) => r.status === 'duplicate').length,
    }

    if (dryRun) {
      const preview: CataloguePreviewResponse = {
        rows: validated,
        summary,
        year,
        defaultCategoryName: defaultCategory.name,
      }
      return NextResponse.json(preview)
    }

    // ── Perform import ─────────────────────────────────────────────────────
    let imported = 0, updated = 0, skipped = 0
    const importErrors: Array<{ row: number; message: string }> = []

    const importable = validated.filter((r) => r.status === 'valid' || r.status === 'update')

    for (const row of importable) {
      try {
        // Upsert the ITItem (create with defaults if new; update name only if exists)
        const item = await prisma.iTItem.upsert({
          where:  { code: row.itemCode! },
          create: {
            code:              row.itemCode!,
            name:              row.itemName!,
            serviceCategoryId: defaultCategory.id,
            fundingModel:      'CHARGEBACK',
            unit:              'unit',
            isActive:          true,
          },
          update: {
            name: row.itemName!,
            // serviceCategoryId intentionally NOT updated for existing items
          },
          select: { id: true },
        })

        // Upsert the AnnualPrice
        await prisma.annualPrice.upsert({
          where:  { itItemId_year: { itItemId: item.id, year: row.year! } },
          create: { itItemId: item.id, year: row.year!, unitPrice: row.unitPrice! },
          update: { unitPrice: row.unitPrice! },
        })

        if (row.status === 'update') updated++
        else imported++
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          skipped++
        } else {
          importErrors.push({ row: row.rowIndex, message: 'Unexpected error during upsert' })
        }
      }
    }

    skipped += validated.filter((r) => r.status === 'duplicate').length
    const result: ImportResult = { imported, updated, skipped, errors: importErrors }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/import/catalogue]', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
