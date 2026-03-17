import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  parseUploadedFile,
  isUniqueConstraintError,
  type EmployeeValidatedRow,
  type EmployeePreviewResponse,
  type ImportResult,
} from '@/lib/importUtils'

// POST /api/import/employees
// FormData fields:
//   file    — .xlsx with columns: numero | nome | email | centro custo
//   dryRun  — 'true' → validate only (no write); omit/false → validate + upsert
//
// Columns (after normalisation):
//   "numero"       → "numero"       (employee number; unique key)
//   "nome"         → "nome"         (full name; split: first word = firstName, rest = lastName)
//   "email"        → "email"
//   "centro custo" → "centrocusto"  (Area.code; Area must already exist)
//
// Behaviour:
//   • Employees are upserted by employeeNumber.
//   • Area is looked up by centrocusto code. If the area does not exist, the row
//     is marked as Error — run the Organisation import first.
//   • Email is stored lowercase.
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

    // ── Pre-load reference data ───────────────────────────────────────────
    const [existingEmployees, areas] = await Promise.all([
      prisma.employee.findMany({
        select: { id: true, employeeNumber: true, firstName: true, lastName: true, email: true },
      }),
      prisma.area.findMany({ select: { id: true, code: true, name: true } }),
    ])

    const employeeByNumber = new Map(existingEmployees.map((e) => [e.employeeNumber, e]))
    const areaByCode       = new Map(areas.map((a) => [a.code, a]))

    // Track batch-level duplicate employee numbers
    const seenNumbers = new Set<string>()

    // ── Validate rows ──────────────────────────────────────────────────────
    const validated: EmployeeValidatedRow[] = rows.map((raw, i) => {
      const errors: string[] = []
      const row: EmployeeValidatedRow = { rowIndex: i + 1, status: 'valid', errors }

      const employeeNumber = (raw['numero']      ?? '').trim()
      const nome           = (raw['nome']        ?? '').trim()
      const email          = (raw['email']       ?? '').trim()
      const areaCode       = (raw['centrocusto'] ?? '').trim()

      // Split nome: first word = firstName, everything else = lastName
      const nameParts = nome.split(/\s+/).filter(Boolean)
      const firstName = nameParts[0]             ?? ''
      const lastName  = nameParts.slice(1).join(' ')

      row.employeeNumber = employeeNumber || undefined
      row.firstName      = firstName      || undefined
      row.lastName       = lastName       || undefined
      row.email          = email          || undefined
      row.areaCode       = areaCode       || undefined

      // Required field checks
      if (!employeeNumber) errors.push('Employee number (numero) is required')
      if (!nome)           errors.push('Name (nome) is required')
      if (!email)          errors.push('Email is required')
      if (!areaCode)       errors.push('Area code (centro custo) is required')

      // Basic email format
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Email "${email}" does not look valid`)
      }

      // Area lookup — must exist (organisation import must run first)
      if (areaCode) {
        const area = areaByCode.get(areaCode)
        if (!area) {
          errors.push(`Area code "${areaCode}" not found — run the Organisation import first`)
        } else {
          row.areaName = area.name
        }
      }

      if (errors.length > 0) {
        row.status = 'error'
        return row
      }

      // Batch duplicate check
      if (seenNumbers.has(employeeNumber)) {
        row.status = 'duplicate'
        row.errors = [`Duplicate employee number "${employeeNumber}" within this file`]
        return row
      }
      seenNumbers.add(employeeNumber)

      // DB duplicate check → classify as Update or New
      row.status = employeeByNumber.has(employeeNumber) ? 'update' : 'valid'
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
      const preview: EmployeePreviewResponse = { rows: validated, summary }
      return NextResponse.json(preview)
    }

    // ── Perform import ─────────────────────────────────────────────────────
    let imported = 0, updated = 0, skipped = 0
    const importErrors: Array<{ row: number; message: string }> = []

    const importable = validated.filter((r) => r.status === 'valid' || r.status === 'update')

    for (const row of importable) {
      try {
        const area = areaByCode.get(row.areaCode!)!

        await prisma.employee.upsert({
          where:  { employeeNumber: row.employeeNumber! },
          create: {
            employeeNumber: row.employeeNumber!,
            firstName:      row.firstName  ?? '',
            lastName:       row.lastName   ?? '',
            email:          row.email!.toLowerCase(),
            areaId:         area.id,
            isActive:       true,
          },
          update: {
            firstName: row.firstName ?? '',
            lastName:  row.lastName  ?? '',
            email:     row.email!.toLowerCase(),
            areaId:    area.id,
          },
          select: { id: true },
        })

        if (row.status === 'update') updated++
        else imported++
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          // e.g. email already used by a different employee number
          importErrors.push({
            row:     row.rowIndex,
            message: `Unique constraint violation — email "${row.email}" may already be in use`,
          })
        } else {
          importErrors.push({ row: row.rowIndex, message: 'Unexpected error during upsert' })
        }
      }
    }

    skipped += validated.filter((r) => r.status === 'duplicate').length
    const result: ImportResult = { imported, updated, skipped, errors: importErrors }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/import/employees]', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
