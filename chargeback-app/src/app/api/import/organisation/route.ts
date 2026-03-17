import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  parseUploadedFile,
  slugifyToCode,
  type OrgValidatedRow,
  type OrgPreviewResponse,
  type ImportResult,
} from '@/lib/importUtils'

// POST /api/import/organisation
// FormData fields:
//   file    — .xlsx with columns: Pelouro | Direcção | Centro Custo | Area
//   dryRun  — 'true' → validate only (no write); omit/false → validate + upsert
//
// Column headers (after normalisation by parseUploadedFile):
//   "Pelouro"      → "pelouro"
//   "Direcção"     → "direco"    (ç and ã are stripped by normaliseKey)
//   "Centro Custo" → "centrocusto"
//   "Area"         → "area"
//
// Import order: Pelouro → Direcao → Area (parent entities first).
// All three entity types are upserted — idempotent on re-run.
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

    // ── Pre-load existing reference data ──────────────────────────────────
    const [existingPelouros, existingDirecoes, existingAreas] = await Promise.all([
      prisma.pelouro.findMany({ select: { id: true, code: true, name: true } }),
      prisma.direcao.findMany({ select: { id: true, code: true, name: true, pelouroId: true } }),
      prisma.area.findMany({ select: { id: true, code: true, name: true } }),
    ])

    const pelouroByCode = new Map(existingPelouros.map((p) => [p.code, p]))
    const direcaoByCode = new Map(existingDirecoes.map((d) => [d.code, d]))
    const areaByCode    = new Map(existingAreas.map((a) => [a.code, a]))

    // Track batch-level duplicate area codes
    const seenAreaCodes = new Set<string>()

    // ── Validate rows ──────────────────────────────────────────────────────
    const validated: OrgValidatedRow[] = rows.map((raw, i) => {
      const errors: string[] = []
      const row: OrgValidatedRow = { rowIndex: i + 1, status: 'valid', errors }

      // Extract columns. normaliseKey strips all non-[a-z0-9], including
      // diacritics and spaces, so Portuguese headers map predictably:
      //   "Pelouro"      → raw['pelouro']
      //   "Direcção"     → raw['direco']
      //   "Centro Custo" → raw['centrocusto']
      //   "Area"         → raw['area']
      const pelouroName = (raw['pelouro']      ?? '').trim()
      const direcaoName = (raw['direco']       ?? '').trim()
      const areaCode    = (raw['centrocusto']  ?? '').trim()
      const areaName    = (raw['area']         ?? '').trim()

      row.pelouroName = pelouroName || undefined
      row.direcaoName = direcaoName || undefined
      row.areaCode    = areaCode    || undefined
      row.areaName    = areaName    || undefined

      if (!pelouroName) errors.push('Pelouro is required')
      if (!direcaoName) errors.push('Direcção is required')
      if (!areaCode)    errors.push('Centro Custo (area code) is required')
      if (!areaName)    errors.push('Area name is required')

      if (errors.length > 0) {
        row.status = 'error'
        return row
      }

      // Derive codes from names (stable, deterministic)
      row.pelouroCode = slugifyToCode(pelouroName)
      row.direcaoCode = slugifyToCode(direcaoName)

      // Batch duplicate check on area code
      if (seenAreaCodes.has(areaCode)) {
        row.status = 'duplicate'
        row.errors = [`Duplicate area code "${areaCode}" within this file`]
        return row
      }
      seenAreaCodes.add(areaCode)

      // Flag whether pelouro / direcao are new (informational for preview)
      row.isNewPelouro = !pelouroByCode.has(row.pelouroCode)
      row.isNewDirecao = !direcaoByCode.has(row.direcaoCode)

      // Classify area: New vs Update
      row.status = areaByCode.has(areaCode) ? 'update' : 'valid'
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
      const preview: OrgPreviewResponse = { rows: validated, summary }
      return NextResponse.json(preview)
    }

    // ── Perform import ─────────────────────────────────────────────────────
    let imported = 0, updated = 0, skipped = 0
    const importErrors: Array<{ row: number; message: string }> = []

    const importable = validated.filter((r) => r.status === 'valid' || r.status === 'update')

    // Step 1: upsert unique Pelouros
    const pelouroIdMap = new Map<string, string>()
    const uniquePelouros = new Map<string, string>() // code → name
    for (const row of importable) {
      if (row.pelouroCode && row.pelouroName) {
        uniquePelouros.set(row.pelouroCode, row.pelouroName)
      }
    }
    for (const [code, name] of uniquePelouros) {
      const p = await prisma.pelouro.upsert({
        where:  { code },
        create: { code, name },
        update: { name },
        select: { id: true },
      })
      pelouroIdMap.set(code, p.id)
    }

    // Step 2: upsert unique Direções
    const direcaoIdMap = new Map<string, string>()
    const uniqueDirecoes = new Map<string, { name: string; pelouroCode: string }>()
    for (const row of importable) {
      if (row.direcaoCode && row.direcaoName && row.pelouroCode) {
        uniqueDirecoes.set(row.direcaoCode, {
          name:        row.direcaoName,
          pelouroCode: row.pelouroCode,
        })
      }
    }
    for (const [code, { name, pelouroCode }] of uniqueDirecoes) {
      const pelouroId = pelouroIdMap.get(pelouroCode)
      if (!pelouroId) {
        importErrors.push({ row: 0, message: `Could not resolve Pelouro for Direcção "${name}"` })
        continue
      }
      const d = await prisma.direcao.upsert({
        where:  { code },
        create: { code, name, pelouroId },
        update: { name, pelouroId },
        select: { id: true },
      })
      direcaoIdMap.set(code, d.id)
    }

    // Step 3: upsert Areas
    for (const row of importable) {
      try {
        const direcaoId = direcaoIdMap.get(row.direcaoCode!)
        if (!direcaoId) {
          importErrors.push({
            row:     row.rowIndex,
            message: `Could not resolve Direcção for area "${row.areaCode}"`,
          })
          continue
        }
        await prisma.area.upsert({
          where:  { code: row.areaCode! },
          create: { code: row.areaCode!, name: row.areaName!, direcaoId },
          update: { name: row.areaName!, direcaoId },
          select: { id: true },
        })
        if (row.status === 'update') updated++
        else imported++
      } catch {
        importErrors.push({ row: row.rowIndex, message: 'Unexpected error during area upsert' })
      }
    }

    skipped = validated.filter((r) => r.status === 'duplicate').length
    const result: ImportResult = { imported, updated, skipped, errors: importErrors }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/import/organisation]', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
