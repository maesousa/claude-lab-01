'use client'

import { useState, useRef } from 'react'
import type { ValidatedRow, ImportPreviewResponse, ImportResult } from '@/lib/importUtils'

// ─── Tab definitions ──────────────────────────────────────────────────────────
type ImportType = 'assignments' | 'direct-costs' | 'prices'

const TABS: { id: ImportType; label: string }[] = [
  { id: 'assignments',  label: 'Assignments' },
  { id: 'direct-costs', label: 'Direct Costs' },
  { id: 'prices',       label: 'Annual Prices' },
]

const TEMPLATES: Record<ImportType, { columns: string[]; example: string[] }> = {
  'assignments': {
    columns: ['employeeNumber', 'itItemCode', 'year', 'quantity', 'notes'],
    example: ['E001', 'HW-LAPTOP-STD', '2026', '1', 'Optional note'],
  },
  'direct-costs': {
    columns: ['areaCode', 'itItemCode', 'year', 'totalCost', 'notes'],
    example: ['CC-201', 'APP-RPA-UIPATH', '2026', '12000.00', 'Optional note'],
  },
  'prices': {
    columns: ['itItemCode', 'year', 'unitPrice', 'notes'],
    example: ['HW-LAPTOP-STD', '2026', '450.00', 'Optional note'],
  },
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ImportClient() {
  const [activeTab, setActiveTab] = useState<ImportType>('assignments')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Data Import</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload Excel (.xlsx) or CSV files to bulk-import records
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Active section */}
      {TABS.map((tab) =>
        activeTab === tab.id ? (
          <ImportSection
            key={tab.id}
            type={tab.id}
            title={tab.label}
            template={TEMPLATES[tab.id]}
          />
        ) : null
      )}
    </div>
  )
}

// ─── Import section (one per import type) ─────────────────────────────────────

type SectionPhase = 'idle' | 'validating' | 'preview' | 'importing' | 'done'

interface ImportSectionProps {
  type:     ImportType
  title:    string
  template: { columns: string[]; example: string[] }
}

function ImportSection({ type, title, template }: ImportSectionProps) {
  const fileRef                          = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile]  = useState<File | null>(null)
  const [phase, setPhase]                = useState<SectionPhase>('idle')
  const [preview, setPreview]            = useState<ImportPreviewResponse | null>(null)
  const [result, setResult]              = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg]          = useState('')
  const [dragOver, setDragOver]          = useState(false)

  // ── File selection ──────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (file) acceptFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0] ?? null
    if (file) acceptFile(file)
  }

  function acceptFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'csv') {
      setErrorMsg('Only .xlsx and .csv files are supported.')
      return
    }
    setSelectedFile(file)
    setPreview(null)
    setResult(null)
    setErrorMsg('')
    setPhase('idle')
  }

  function reset() {
    setSelectedFile(null)
    setPreview(null)
    setResult(null)
    setErrorMsg('')
    setPhase('idle')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Upload helpers ──────────────────────────────────────────────────────
  async function uploadFile(file: File, dryRun: boolean): Promise<Response> {
    const fd = new FormData()
    fd.append('file', file)
    if (dryRun) fd.append('dryRun', 'true')
    return fetch(`/api/import/${type}`, { method: 'POST', body: fd })
  }

  // ── Phase: Validate (dry run) ───────────────────────────────────────────
  async function handleValidate() {
    if (!selectedFile) return
    setPhase('validating')
    setErrorMsg('')
    try {
      const res = await uploadFile(selectedFile, true)
      if (!res.ok) {
        const data = await res.json()
        setErrorMsg(data.error ?? 'Validation failed')
        setPhase('idle')
        return
      }
      const data: ImportPreviewResponse = await res.json()
      setPreview(data)
      setPhase('preview')
    } catch {
      setErrorMsg('Network error — please try again.')
      setPhase('idle')
    }
  }

  // ── Phase: Import (actual) ──────────────────────────────────────────────
  async function handleImport() {
    if (!selectedFile) return
    setPhase('importing')
    setErrorMsg('')
    try {
      const res = await uploadFile(selectedFile, false)
      if (!res.ok) {
        const data = await res.json()
        setErrorMsg(data.error ?? 'Import failed')
        setPhase('preview')
        return
      }
      const data: ImportResult = await res.json()
      setResult(data)
      setPhase('done')
    } catch {
      setErrorMsg('Network error — please try again.')
      setPhase('preview')
    }
  }

  // ── Row counts for the Import button label ──────────────────────────────
  const importableCount = preview
    ? preview.rows.filter((r) => r.status === 'valid' || r.status === 'update').length
    : 0

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Template hint */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
        <p className="font-medium text-slate-700 mb-1">Expected columns for {title}:</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {template.columns.map((col) => (
            <code key={col} className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700">
              {col}
            </code>
          ))}
        </div>
        <p className="text-slate-500 text-xs">
          Example row: {template.example.join(' · ')}
        </p>
        <p className="text-slate-400 text-xs mt-1">
          Column names are case-insensitive. Common aliases are accepted (e.g. &quot;Employee No&quot;, &quot;Item Code&quot;).
        </p>
      </div>

      {/* Drop zone */}
      {(phase === 'idle' || phase === 'validating') && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={[
            'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-colors',
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-50',
          ].join(' ')}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-slate-700">📄 {selectedFile.name}</p>
              <p className="text-xs text-slate-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
              <button
                onClick={reset}
                className="text-xs text-red-500 hover:text-red-700 underline mt-1"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-600">
                Drag & drop a file here, or{' '}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-blue-600 hover:underline font-medium"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-slate-400">.xlsx or .csv</p>
            </div>
          )}
        </div>
      )}

      {/* Validate button */}
      {selectedFile && phase === 'idle' && (
        <div className="flex justify-end">
          <button
            onClick={handleValidate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Validate &amp; Preview
          </button>
        </div>
      )}

      {/* Loading states */}
      {phase === 'validating' && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner />
          <span>Parsing and validating…</span>
        </div>
      )}
      {phase === 'importing' && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner />
          <span>Importing records…</span>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Preview table */}
      {phase === 'preview' && preview && (
        <div className="space-y-4">
          {/* Summary pills */}
          <div className="flex flex-wrap gap-3">
            <SummaryPill label="Total" value={preview.summary.total} color="slate" />
            {preview.summary.valid > 0 && (
              <SummaryPill label="New" value={preview.summary.valid} color="green" />
            )}
            {preview.summary.updates > 0 && (
              <SummaryPill label="Update" value={preview.summary.updates} color="blue" />
            )}
            {preview.summary.duplicates > 0 && (
              <SummaryPill label="Skip" value={preview.summary.duplicates} color="amber" />
            )}
            {preview.summary.errors > 0 && (
              <SummaryPill label="Error" value={preview.summary.errors} color="red" />
            )}
          </div>

          {/* Row table */}
          <PreviewTable rows={preview.rows} type={type} />

          {/* Action buttons */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={reset}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Change file
            </button>
            {importableCount > 0 ? (
              <button
                onClick={handleImport}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Import {importableCount} row{importableCount !== 1 ? 's' : ''}
              </button>
            ) : (
              <p className="text-sm text-slate-500 italic">No valid rows to import.</p>
            )}
          </div>
        </div>
      )}

      {/* Done / result */}
      {phase === 'done' && result && (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-4">
            <p className="font-semibold text-green-800 text-sm mb-2">Import complete</p>
            <ul className="text-sm text-green-700 space-y-0.5">
              {result.imported > 0 && <li>✅ {result.imported} record{result.imported !== 1 ? 's' : ''} inserted</li>}
              {result.updated  > 0 && <li>🔄 {result.updated}  record{result.updated  !== 1 ? 's' : ''} updated</li>}
              {result.skipped  > 0 && <li>⏭️ {result.skipped}  record{result.skipped  !== 1 ? 's' : ''} skipped (already existed)</li>}
              {result.errors.length > 0 && (
                <li className="text-red-700">
                  ❌ {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} failed
                </li>
              )}
            </ul>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-xs text-red-600 space-y-0.5">
                {result.errors.map((e) => (
                  <li key={e.row}>Row {e.row}: {e.message}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={reset}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Preview table ─────────────────────────────────────────────────────────────

interface PreviewTableProps {
  rows: ValidatedRow[]
  type: ImportType
}

const STATUS_STYLES: Record<string, string> = {
  valid:     'bg-green-50',
  update:    'bg-blue-50',
  duplicate: 'bg-amber-50',
  error:     'bg-red-50',
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  valid:     { label: 'New',    cls: 'bg-green-100 text-green-700' },
  update:    { label: 'Update', cls: 'bg-blue-100  text-blue-700'  },
  duplicate: { label: 'Skip',   cls: 'bg-amber-100 text-amber-700' },
  error:     { label: 'Error',  cls: 'bg-red-100   text-red-700'   },
}

function PreviewTable({ rows, type }: PreviewTableProps) {
  const isAssignments = type === 'assignments'
  const isDirect      = type === 'direct-costs'
  const isPrices      = type === 'prices'

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm max-h-96 overflow-y-auto">
      <table className="min-w-full divide-y divide-slate-200 text-xs">
        <thead className="bg-slate-50 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">#</th>
            {isAssignments && <>
              <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Employee No</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Employee Name</th>
            </>}
            {isDirect && <>
              <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Area</th>
            </>}
            {(isAssignments || isDirect || isPrices) && (
              <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">IT Item</th>
            )}
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Year</th>
            {isAssignments && <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Quantity</th>}
            {isDirect      && <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Total Cost</th>}
            {isPrices      && <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>}
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => {
            const badge = STATUS_BADGE[row.status]
            return (
              <tr key={row.rowIndex} className={STATUS_STYLES[row.status]}>
                <td className="px-3 py-2 text-slate-400">{row.rowIndex}</td>
                {isAssignments && <>
                  <td className="px-3 py-2 font-mono text-slate-700">{row.employeeNumber ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{row.employeeName ?? <span className="text-red-500 italic">not found</span>}</td>
                </>}
                {isDirect && (
                  <td className="px-3 py-2 text-slate-700">
                    {row.areaName
                      ? <span>{row.areaCode} — {row.areaName}</span>
                      : <span className="text-red-500 italic">{row.areaCode ?? '—'}</span>}
                  </td>
                )}
                {(isAssignments || isDirect || isPrices) && (
                  <td className="px-3 py-2 text-slate-700">
                    {row.itItemName
                      ? <span>{row.itItemCode} — {row.itItemName}</span>
                      : <span className="text-red-500 italic">{row.itItemCode ?? '—'}</span>}
                  </td>
                )}
                <td className="px-3 py-2 text-slate-700">{row.year ?? '—'}</td>
                {isAssignments && <td className="px-3 py-2 text-slate-700">{row.quantity ?? '—'}</td>}
                {isDirect      && <td className="px-3 py-2 text-slate-700">{row.totalCost != null ? `€ ${row.totalCost.toFixed(2)}` : '—'}</td>}
                {isPrices      && <td className="px-3 py-2 text-slate-700">{row.unitPrice != null ? `€ ${row.unitPrice.toFixed(2)}` : '—'}</td>}
                <td className="px-3 py-2 text-slate-500 max-w-[140px] truncate">{row.notes ?? '—'}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                  {row.errors.length > 0 && (
                    <ul className="mt-0.5 space-y-0.5">
                      {row.errors.map((e, i) => (
                        <li key={i} className="text-red-600 text-xs">{e}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function SummaryPill({
  label, value, color,
}: {
  label: string; value: number; color: 'slate' | 'green' | 'blue' | 'amber' | 'red'
}) {
  const styles = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-green-100 text-green-700',
    blue:  'bg-blue-100  text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    red:   'bg-red-100   text-red-700',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${styles[color]}`}>
      <span className="font-bold">{value}</span>
      <span>{label}</span>
    </span>
  )
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-blue-500"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}
