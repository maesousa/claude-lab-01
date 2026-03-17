'use client'

import { useState, useRef } from 'react'
import type {
  ValidatedRow,
  ImportPreviewResponse,
  ImportResult,
  OrgValidatedRow,
  OrgPreviewResponse,
  CatalogueValidatedRow,
  CataloguePreviewResponse,
  EmployeeValidatedRow,
  EmployeePreviewResponse,
} from '@/lib/importUtils'

// ─── Tab definitions ──────────────────────────────────────────────────────────

type MasterImportType    = 'organisation' | 'catalogue' | 'employees'
type OperationalImportType = 'assignments' | 'direct-costs' | 'prices'
type ImportType          = MasterImportType | OperationalImportType

interface TabDef { id: ImportType; label: string; group: 'master' | 'operational' }

const TABS: TabDef[] = [
  { id: 'organisation',  label: 'Organisation',  group: 'master' },
  { id: 'catalogue',     label: 'IT Catalogue',  group: 'master' },
  { id: 'employees',     label: 'Employees',     group: 'master' },
  { id: 'assignments',   label: 'Assignments',   group: 'operational' },
  { id: 'direct-costs',  label: 'Direct Costs',  group: 'operational' },
  { id: 'prices',        label: 'Annual Prices', group: 'operational' },
]

// ─── Template hints ────────────────────────────────────────────────────────────

interface TemplateHint {
  columns:  string[]
  example:  string[]
  notes?:   string
}

const TEMPLATES: Record<ImportType, TemplateHint> = {
  organisation: {
    columns: ['Pelouro', 'Direcção', 'Centro Custo', 'Area'],
    example: ['Comercial', 'On-Trade', 'G0TJ1201F', 'Customer Develop Sul'],
    notes:   'Upserts the full Pelouro → Direcção → Area hierarchy. Column names are matched after stripping accents and spaces.',
  },
  catalogue: {
    columns: ['ID', 'Posto de Trabalho', 'Valor YYYY'],
    example: ['L1', 'Portátil Standard', '357'],
    notes:   'Year is auto-detected from the price column header (e.g. "Valor 2026"). Items without an ID get a code generated from their name. Only the first sheet is read.',
  },
  employees: {
    columns: ['numero', 'nome', 'email', 'centro custo'],
    example: ['21644', 'SUSANA MATEUS', 'susana.mateus@company.com', 'G0TJ1201F'],
    notes:   'Area codes must already exist — run the Organisation import first. Employee number is the unique key.',
  },
  assignments: {
    columns: ['employeeNumber', 'itItemCode', 'year', 'quantity', 'notes'],
    example: ['E001', 'HW-LAPTOP-STD', '2026', '1', 'Optional note'],
  },
  'direct-costs': {
    columns: ['areaCode', 'itItemCode', 'year', 'totalCost', 'notes'],
    example: ['CC-201', 'APP-RPA-UIPATH', '2026', '12000.00', 'Optional note'],
  },
  prices: {
    columns: ['itItemCode', 'year', 'unitPrice', 'notes'],
    example: ['HW-LAPTOP-STD', '2026', '450.00', 'Optional note'],
  },
}

// ─── Union of all preview response shapes ─────────────────────────────────────

type AnyPreviewResponse =
  | ImportPreviewResponse
  | OrgPreviewResponse
  | CataloguePreviewResponse
  | EmployeePreviewResponse

function getImportableCount(preview: AnyPreviewResponse | null): number {
  if (!preview) return 0
  return preview.rows.filter(
    (r) => (r as { status: string }).status === 'valid' ||
           (r as { status: string }).status === 'update'
  ).length
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImportClient() {
  const [activeTab, setActiveTab] = useState<ImportType>('organisation')

  const masterTabs      = TABS.filter((t) => t.group === 'master')
  const operationalTabs = TABS.filter((t) => t.group === 'operational')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Data Import</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload Excel (.xlsx) or CSV files to bulk-import records
        </p>
      </div>

      {/* Tabs — two visual groups */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex items-center gap-1 flex-wrap">
          {/* Master data group */}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-2">
            Master Data
          </span>
          {masterTabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={setActiveTab} />
          ))}

          {/* Divider */}
          <span className="mx-3 h-5 w-px bg-slate-300 self-center" />

          {/* Operational data group */}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-2">
            Operational
          </span>
          {operationalTabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={setActiveTab} />
          ))}
        </nav>
      </div>

      {/* Active section */}
      {TABS.map((tab) =>
        activeTab === tab.id ? (
          <ImportSection key={tab.id} type={tab.id} title={tab.label} hint={TEMPLATES[tab.id]} />
        ) : null
      )}
    </div>
  )
}

function TabButton({
  tab, active, onClick,
}: {
  tab:    TabDef
  active: boolean
  onClick: (id: ImportType) => void
}) {
  return (
    <button
      onClick={() => onClick(tab.id)}
      className={[
        'pb-3 px-1 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
      ].join(' ')}
    >
      {tab.label}
    </button>
  )
}

// ─── Import section (one per import type) ─────────────────────────────────────

type SectionPhase = 'idle' | 'validating' | 'preview' | 'importing' | 'done'

interface ImportSectionProps {
  type:  ImportType
  title: string
  hint:  TemplateHint
}

function ImportSection({ type, title, hint }: ImportSectionProps) {
  const fileRef                          = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile]  = useState<File | null>(null)
  const [phase, setPhase]                = useState<SectionPhase>('idle')
  const [preview, setPreview]            = useState<AnyPreviewResponse | null>(null)
  const [result, setResult]              = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg]          = useState('')
  const [dragOver, setDragOver]          = useState(false)

  // ── File selection ────────────────────────────────────────────────────
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

  // ── Upload helpers ────────────────────────────────────────────────────
  async function uploadFile(file: File, dryRun: boolean): Promise<Response> {
    const fd = new FormData()
    fd.append('file', file)
    if (dryRun) fd.append('dryRun', 'true')
    return fetch(`/api/import/${type}`, { method: 'POST', body: fd })
  }

  // ── Phase: Validate (dry run) ─────────────────────────────────────────
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
      const data: AnyPreviewResponse = await res.json()
      setPreview(data)
      setPhase('preview')
    } catch {
      setErrorMsg('Network error — please try again.')
      setPhase('idle')
    }
  }

  // ── Phase: Import (actual) ────────────────────────────────────────────
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

  const importableCount = getImportableCount(preview)

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Template hint */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
        <p className="font-medium text-slate-700 mb-1">Expected columns for {title}:</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {hint.columns.map((col) => (
            <code key={col} className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700">
              {col}
            </code>
          ))}
        </div>
        <p className="text-slate-500 text-xs">Example row: {hint.example.join(' · ')}</p>
        {hint.notes && (
          <p className="text-slate-500 text-xs mt-1">{hint.notes}</p>
        )}
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
              <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              <button onClick={reset} className="text-xs text-red-500 hover:text-red-700 underline mt-1">
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
          <Spinner /> <span>Parsing and validating…</span>
        </div>
      )}
      {phase === 'importing' && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner /> <span>Importing records…</span>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Preview */}
      {phase === 'preview' && preview && (
        <div className="space-y-4">
          {/* Summary pills */}
          <SummaryPillGroup summary={preview.summary} />

          {/* Catalogue-specific notice */}
          {type === 'catalogue' && 'defaultCategoryName' in preview &&
            (preview as CataloguePreviewResponse).defaultCategoryName && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                ℹ️ New IT items will be assigned to category:{' '}
                <strong>{(preview as CataloguePreviewResponse).defaultCategoryName}</strong>.
                You can update each item&apos;s category on the IT Items page after import.
              </div>
            )}

          {/* Row preview table — dispatched by type */}
          {(type === 'assignments' || type === 'direct-costs' || type === 'prices') && (
            <LegacyPreviewTable
              rows={(preview as ImportPreviewResponse).rows}
              type={type as OperationalImportType}
            />
          )}
          {type === 'organisation' && (
            <OrgPreviewTable rows={(preview as OrgPreviewResponse).rows} />
          )}
          {type === 'catalogue' && (
            <CataloguePreviewTable
              rows={(preview as CataloguePreviewResponse).rows}
              year={(preview as CataloguePreviewResponse).year}
            />
          )}
          {type === 'employees' && (
            <EmployeePreviewTable rows={(preview as EmployeePreviewResponse).rows} />
          )}

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
              {result.imported > 0 && (
                <li>✅ {result.imported} record{result.imported !== 1 ? 's' : ''} inserted</li>
              )}
              {result.updated  > 0 && (
                <li>🔄 {result.updated}  record{result.updated  !== 1 ? 's' : ''} updated</li>
              )}
              {result.skipped  > 0 && (
                <li>⏭️ {result.skipped}  record{result.skipped  !== 1 ? 's' : ''} skipped</li>
              )}
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

// ─── Summary pill group ────────────────────────────────────────────────────────

function SummaryPillGroup({
  summary,
}: {
  summary: { total: number; valid: number; updates: number; errors: number; duplicates: number }
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <SummaryPill label="Total"  value={summary.total}      color="slate" />
      {summary.valid      > 0 && <SummaryPill label="New"    value={summary.valid}      color="green" />}
      {summary.updates    > 0 && <SummaryPill label="Update" value={summary.updates}    color="blue" />}
      {summary.duplicates > 0 && <SummaryPill label="Skip"   value={summary.duplicates} color="amber" />}
      {summary.errors     > 0 && <SummaryPill label="Error"  value={summary.errors}     color="red" />}
    </div>
  )
}

// ─── Shared table styles ───────────────────────────────────────────────────────

const STATUS_ROW: Record<string, string> = {
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

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm max-h-96 overflow-y-auto">
      <table className="min-w-full divide-y divide-slate-200 text-xs">
        {children}
      </table>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide text-[10px]">
      {children}
    </th>
  )
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={['px-3 py-2 text-slate-700', mono ? 'font-mono' : ''].join(' ')}>
      {children}
    </td>
  )
}

function RowStatus({ row }: { row: { status: string; errors: string[] } }) {
  const badge = STATUS_BADGE[row.status] ?? { label: row.status, cls: 'bg-slate-100 text-slate-600' }
  return (
    <td className="px-3 py-2">
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
        {badge.label}
      </span>
      {row.errors.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {row.errors.map((e, i) => (
            <li key={i} className="text-red-600 text-[10px]">{e}</li>
          ))}
        </ul>
      )}
    </td>
  )
}

// ─── Organisation preview table ────────────────────────────────────────────────

function OrgPreviewTable({ rows }: { rows: OrgValidatedRow[] }) {
  return (
    <TableWrapper>
      <thead className="bg-slate-50 sticky top-0">
        <tr>
          <Th>#</Th>
          <Th>Pelouro</Th>
          <Th>Direcção</Th>
          <Th>Area Code</Th>
          <Th>Area Name</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {rows.map((row) => (
          <tr key={row.rowIndex} className={STATUS_ROW[row.status]}>
            <Td mono>{row.rowIndex}</Td>
            <Td>
              <span>{row.pelouroName ?? <em className="text-red-400">missing</em>}</span>
              {row.isNewPelouro && (
                <span className="ml-1 text-[9px] rounded bg-green-100 text-green-700 px-1">new</span>
              )}
            </Td>
            <Td>
              <span>{row.direcaoName ?? <em className="text-red-400">missing</em>}</span>
              {row.isNewDirecao && (
                <span className="ml-1 text-[9px] rounded bg-green-100 text-green-700 px-1">new</span>
              )}
            </Td>
            <Td mono>{row.areaCode ?? '—'}</Td>
            <Td>{row.areaName ?? '—'}</Td>
            <RowStatus row={row} />
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  )
}

// ─── Catalogue preview table ───────────────────────────────────────────────────

function CataloguePreviewTable({ rows, year }: { rows: CatalogueValidatedRow[]; year: number }) {
  return (
    <TableWrapper>
      <thead className="bg-slate-50 sticky top-0">
        <tr>
          <Th>#</Th>
          <Th>Code</Th>
          <Th>Item Name</Th>
          <Th>Year</Th>
          <Th>Unit Price</Th>
          <Th>Existing Price</Th>
          <Th>Category</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {rows.map((row) => (
          <tr key={row.rowIndex} className={STATUS_ROW[row.status]}>
            <Td mono>{row.rowIndex}</Td>
            <Td mono>{row.itemCode ?? '—'}</Td>
            <Td>
              {row.itemName ?? <em className="text-red-400">missing</em>}
              {row.isNewItem && (
                <span className="ml-1 text-[9px] rounded bg-green-100 text-green-700 px-1">new item</span>
              )}
            </Td>
            <Td>{row.year ?? year}</Td>
            <Td mono>{row.unitPrice != null ? `€ ${row.unitPrice.toFixed(2)}` : '—'}</Td>
            <Td mono>
              {row.existingPrice != null ? (
                <span className="text-slate-500">{`€ ${row.existingPrice.toFixed(2)}`}</span>
              ) : '—'}
            </Td>
            <Td>{row.categoryName ?? '—'}</Td>
            <RowStatus row={row} />
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  )
}

// ─── Employee preview table ────────────────────────────────────────────────────

function EmployeePreviewTable({ rows }: { rows: EmployeeValidatedRow[] }) {
  return (
    <TableWrapper>
      <thead className="bg-slate-50 sticky top-0">
        <tr>
          <Th>#</Th>
          <Th>Emp No</Th>
          <Th>First Name</Th>
          <Th>Last Name</Th>
          <Th>Email</Th>
          <Th>Area Code</Th>
          <Th>Area Name</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {rows.map((row) => (
          <tr key={row.rowIndex} className={STATUS_ROW[row.status]}>
            <Td mono>{row.rowIndex}</Td>
            <Td mono>{row.employeeNumber ?? <em className="text-red-400">missing</em>}</Td>
            <Td>{row.firstName ?? '—'}</Td>
            <Td>{row.lastName ?? '—'}</Td>
            <Td>{row.email ?? <em className="text-red-400">missing</em>}</Td>
            <Td mono>{row.areaCode ?? '—'}</Td>
            <Td>
              {row.areaName
                ? row.areaName
                : row.areaCode
                  ? <span className="text-red-500 italic">not found</span>
                  : '—'}
            </Td>
            <RowStatus row={row} />
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  )
}

// ─── Legacy preview table (Assignments / Direct Costs / Prices) ────────────────

function LegacyPreviewTable({
  rows, type,
}: {
  rows: ValidatedRow[]
  type: OperationalImportType
}) {
  const isAssignments = type === 'assignments'
  const isDirect      = type === 'direct-costs'
  const isPrices      = type === 'prices'

  return (
    <TableWrapper>
      <thead className="bg-slate-50 sticky top-0">
        <tr>
          <Th>#</Th>
          {isAssignments && <><Th>Employee No</Th><Th>Employee Name</Th></>}
          {isDirect      && <Th>Area</Th>}
          {(isAssignments || isDirect || isPrices) && <Th>IT Item</Th>}
          <Th>Year</Th>
          {isAssignments && <Th>Qty</Th>}
          {isDirect      && <Th>Total Cost</Th>}
          {isPrices      && <Th>Unit Price</Th>}
          <Th>Notes</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {rows.map((row) => (
          <tr key={row.rowIndex} className={STATUS_ROW[row.status]}>
            <Td mono>{row.rowIndex}</Td>
            {isAssignments && (
              <>
                <Td mono>{row.employeeNumber ?? '—'}</Td>
                <Td>{row.employeeName ?? <span className="text-red-500 italic">not found</span>}</Td>
              </>
            )}
            {isDirect && (
              <Td>
                {row.areaName
                  ? `${row.areaCode} — ${row.areaName}`
                  : <span className="text-red-500 italic">{row.areaCode ?? '—'}</span>}
              </Td>
            )}
            {(isAssignments || isDirect || isPrices) && (
              <Td>
                {row.itItemName
                  ? `${row.itItemCode} — ${row.itItemName}`
                  : <span className="text-red-500 italic">{row.itItemCode ?? '—'}</span>}
              </Td>
            )}
            <Td>{row.year ?? '—'}</Td>
            {isAssignments && <Td>{row.quantity ?? '—'}</Td>}
            {isDirect      && <Td>{row.totalCost != null ? `€ ${row.totalCost.toFixed(2)}` : '—'}</Td>}
            {isPrices      && <Td>{row.unitPrice != null ? `€ ${row.unitPrice.toFixed(2)}` : '—'}</Td>}
            <Td>{row.notes ?? '—'}</Td>
            <RowStatus row={row} />
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    <svg className="h-4 w-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}
