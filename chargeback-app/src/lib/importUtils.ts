/**
 * Server-side utilities for Excel/CSV import routes.
 * Only import this file from API route handlers (never from client components).
 */
import * as XLSX from 'xlsx'

// ─── File parsing ─────────────────────────────────────────────────────────────

/**
 * Parse an uploaded File (xlsx or csv) into an array of row objects.
 * Column headers from the first row are used as keys.
 * All values are returned as strings.
 */
export async function parseUploadedFile(
  file: File
): Promise<Record<string, string>[]> {
  const buffer   = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet    = workbook.Sheets[sheetName]

  // sheet_to_json with raw:false converts all values to strings
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw:    false,
  })

  // Normalise headers: lowercase, strip non-alphanumeric chars
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        normaliseKey(k),
        String(v ?? '').trim(),
      ])
    )
  )
}

/**
 * Normalise a spreadsheet column header to a plain lowercase key.
 * e.g. "Employee Number" → "employeenumber", "IT Item Code" → "ititemcode"
 */
export function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// ─── Column aliases ───────────────────────────────────────────────────────────
// Accept common variations of column names so templates are forgiving.

const EMPLOYEE_NUMBER_ALIASES = ['employeenumber', 'employeeno', 'empno', 'employee']
const ITEM_CODE_ALIASES        = ['ititemcode', 'itemcode', 'code', 'ititem', 'item']
const AREA_CODE_ALIASES        = ['areacode', 'area', 'costcenter', 'cc']
const YEAR_ALIASES             = ['year', 'ano']
const QUANTITY_ALIASES         = ['quantity', 'qty', 'quantidade']
const TOTAL_COST_ALIASES       = ['totalcost', 'total', 'cost', 'custo']
const UNIT_PRICE_ALIASES       = ['unitprice', 'price', 'preco', 'ppu']
const NOTES_ALIASES            = ['notes', 'notas', 'note', 'obs', 'observacoes']

export function getCol(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    if (row[alias] !== undefined) return row[alias]
  }
  return ''
}

export const COL = {
  employeeNumber: (r: Record<string, string>) => getCol(r, EMPLOYEE_NUMBER_ALIASES),
  itItemCode:     (r: Record<string, string>) => getCol(r, ITEM_CODE_ALIASES),
  areaCode:       (r: Record<string, string>) => getCol(r, AREA_CODE_ALIASES),
  year:           (r: Record<string, string>) => getCol(r, YEAR_ALIASES),
  quantity:       (r: Record<string, string>) => getCol(r, QUANTITY_ALIASES),
  totalCost:      (r: Record<string, string>) => getCol(r, TOTAL_COST_ALIASES),
  unitPrice:      (r: Record<string, string>) => getCol(r, UNIT_PRICE_ALIASES),
  notes:          (r: Record<string, string>) => getCol(r, NOTES_ALIASES),
}

// ─── Shared validators ────────────────────────────────────────────────────────

export function validateYear(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const n = parseInt(raw)
  if (isNaN(n))         return { ok: false, error: `Year "${raw}" is not a number` }
  if (n < 2020 || n > 2030) return { ok: false, error: `Year ${n} is out of range (2020–2030)` }
  return { ok: true, value: n }
}

export function validatePositiveNumber(
  raw: string,
  field: string,
  allowZero = false
): { ok: true; value: number } | { ok: false; error: string } {
  const n = parseFloat(raw.replace(',', '.'))   // accept comma decimal separator
  if (isNaN(n))             return { ok: false, error: `${field} "${raw}" is not a number` }
  if (!allowZero && n <= 0) return { ok: false, error: `${field} must be greater than 0` }
  if (n < 0)                return { ok: false, error: `${field} must be non-negative` }
  return { ok: true, value: n }
}

// ─── Row status types ─────────────────────────────────────────────────────────

export type RowStatus = 'valid' | 'update' | 'error' | 'duplicate'

export interface ValidatedRow {
  rowIndex:       number
  status:         RowStatus
  errors:         string[]
  // Raw display values (for preview table)
  employeeNumber?: string
  itItemCode?:     string
  areaCode?:       string
  year?:           number
  quantity?:       number
  totalCost?:      number
  unitPrice?:      number
  notes?:          string
  // Resolved display names
  employeeName?:   string
  itItemName?:     string
  areaName?:       string
  // Resolved IDs (used server-side for the actual import)
  employeeId?:     string
  itItemId?:       string
  areaId?:         string
}

export interface ImportPreviewResponse {
  rows:    ValidatedRow[]
  summary: { total: number; valid: number; updates: number; errors: number; duplicates: number }
}

export interface ImportResult {
  imported: number
  updated:  number
  skipped:  number
  errors:   Array<{ row: number; message: string }>
}

// ─── Prisma error helpers ─────────────────────────────────────────────────────

export function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err &&
    (err as { code: string }).code === 'P2002'
  )
}
