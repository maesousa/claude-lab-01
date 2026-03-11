'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatCurrency, toNumber } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeOption {
  id: string
  firstName: string
  lastName: string
  employeeNumber: string
  area: { id: string; code: string; name: string }
}

interface AreaOption {
  id: string
  code: string
  name: string
  direcao: { id: string; name: string }
}

interface CategoryOption {
  id: string
  code: string
  name: string
  color: string | null
}

interface ITItemOption {
  id: string
  code: string
  name: string
  unit: string
  fundingModel: string
  serviceCategory: { id: string; name: string; color: string | null }
  prices: Array<{ year: number; unitPrice: string }>
}

interface AssignmentRow {
  id: string
  year: number
  quantity: string
  notes: string | null
  cost: string
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeNumber: string
    area: {
      id: string
      code: string
      name: string
      direcao: {
        id: string
        name: string
        pelouro: { id: string; name: string }
      }
    }
  }
  itItem: {
    id: string
    code: string
    name: string
    unit: string
    fundingModel: string
    serviceCategory: { id: string; name: string; color: string | null }
    prices: Array<{ year: number; unitPrice: string }>
  }
}

interface FormState {
  employeeId: string
  itItemId: string
  year: number
  quantity: string
  notes: string
}

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; assignment: AssignmentRow }
  | { mode: 'delete'; assignment: AssignmentRow }
  | null

// ─── Constants ────────────────────────────────────────────────────────────────

const YEARS = [2024, 2025, 2026, 2027]
const DEFAULT_YEAR = 2026

const emptyForm: FormState = {
  employeeId: '',
  itItemId: '',
  year: DEFAULT_YEAR,
  quantity: '1',
  notes: '',
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AssignmentsClient() {
  // Reference data (loaded once)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [chargebackItems, setChargebackItems] = useState<ITItemOption[]>([])

  // Assignments for selected year
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [search, setSearch] = useState('')
  const [filterAreaId, setFilterAreaId] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterFundingModel, setFilterFundingModel] = useState('')

  // Dialog state
  const [dialog, setDialog] = useState<DialogState>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchAssignments = useCallback(async (y: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/assignments?year=${y}`)
      if (!res.ok) throw new Error('Failed to fetch assignments')
      setAssignments(await res.json())
    } catch (err) {
      console.error('[AssignmentsClient] fetch assignments:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load static reference data once on mount
  useEffect(() => {
    async function bootstrap() {
      const [empRes, areaRes, catRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/areas'),
        fetch('/api/categories'),
      ])
      const [emps, areasData, cats] = await Promise.all([
        empRes.json(),
        areaRes.json(),
        catRes.json(),
      ])
      setEmployees(emps)
      setAreas(areasData)
      setCategories(cats)
    }
    bootstrap()
  }, [])

  // Reload assignments + chargeback items whenever year changes (also fires on mount)
  useEffect(() => {
    fetchAssignments(year)
    fetch(`/api/items?fundingModel=CHARGEBACK&year=${year}`)
      .then((r) => r.json())
      .then(setChargebackItems)
      .catch((err) => console.error('[AssignmentsClient] fetch items:', err))
  }, [year, fetchAssignments])

  // ─── Derived / filtered data ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      if (search) {
        const q = search.toLowerCase()
        const empFull = `${a.employee.firstName} ${a.employee.lastName}`.toLowerCase()
        const empRev = `${a.employee.lastName} ${a.employee.firstName}`.toLowerCase()
        if (
          !empFull.includes(q) &&
          !empRev.includes(q) &&
          !a.itItem.name.toLowerCase().includes(q) &&
          !a.employee.employeeNumber.includes(q)
        ) {
          return false
        }
      }
      if (filterAreaId && a.employee.area.id !== filterAreaId) return false
      if (filterCategoryId && a.itItem.serviceCategory.id !== filterCategoryId) return false
      if (filterFundingModel && a.itItem.fundingModel !== filterFundingModel) return false
      return true
    })
  }, [assignments, search, filterAreaId, filterCategoryId, filterFundingModel])

  const totalCost = useMemo(
    () => filtered.reduce((sum, a) => sum + toNumber(a.cost), 0),
    [filtered]
  )

  const hasFilters = search || filterAreaId || filterCategoryId || filterFundingModel

  // ─── Cost preview (create form) ─────────────────────────────────────────────

  const selectedCreateItem = chargebackItems.find((i) => i.id === form.itItemId) ?? null
  const selectedCreatePrice =
    selectedCreateItem?.prices.find((p) => p.year === form.year) ?? null
  const createPreviewCost =
    selectedCreatePrice != null
      ? toNumber(form.quantity || '0') * toNumber(selectedCreatePrice.unitPrice)
      : null
  const createNoPriceWarning = selectedCreateItem != null && selectedCreatePrice == null

  // ─── Dialog helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ ...emptyForm, year })
    setFormError(null)
    setDialog({ mode: 'create' })
  }

  function openEdit(a: AssignmentRow) {
    setForm({
      employeeId: a.employee.id,
      itItemId:   a.itItem.id,
      year:       a.year,
      quantity:   a.quantity,
      notes:      a.notes ?? '',
    })
    setFormError(null)
    setDialog({ mode: 'edit', assignment: a })
  }

  function openDelete(a: AssignmentRow) {
    setDialog({ mode: 'delete', assignment: a })
  }

  function closeDialog() {
    setDialog(null)
    setFormError(null)
  }

  function setField(field: keyof FormState, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ─── CRUD handlers ──────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!form.employeeId || !form.itItemId || !form.quantity) {
      setFormError('Please fill in all required fields.')
      return
    }
    const qty = parseFloat(form.quantity)
    if (isNaN(qty) || qty <= 0) {
      setFormError('Quantity must be a positive number.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: form.employeeId,
          itItemId:   form.itItemId,
          year:       form.year,
          quantity:   qty,
          notes:      form.notes || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error ?? 'Failed to create assignment.')
        return
      }
      await fetchAssignments(year)
      closeDialog()
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!form.quantity) {
      setFormError('Quantity is required.')
      return
    }
    const qty = parseFloat(form.quantity)
    if (isNaN(qty) || qty <= 0) {
      setFormError('Quantity must be a positive number.')
      return
    }
    if (dialog?.mode !== 'edit') return
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/assignments/${dialog.assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty, notes: form.notes || null }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error ?? 'Failed to update assignment.')
        return
      }
      await fetchAssignments(year)
      closeDialog()
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (dialog?.mode !== 'delete') return
    setSubmitting(true)
    try {
      await fetch(`/api/assignments/${dialog.assignment.id}`, { method: 'DELETE' })
      await fetchAssignments(year)
      closeDialog()
    } catch {
      console.error('[AssignmentsClient] delete failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Per-employee IT cost allocations</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          <span className="text-base leading-none">＋</span>
          New Assignment
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Year selector */}
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Full-text search */}
        <input
          type="search"
          placeholder="Search employee or item…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {/* Area filter */}
        <select
          value={filterAreaId}
          onChange={(e) => setFilterAreaId(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All areas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
          ))}
        </select>

        {/* Category filter */}
        <select
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Funding model filter */}
        <select
          value={filterFundingModel}
          onChange={(e) => setFilterFundingModel(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All funding</option>
          <option value="CHARGEBACK">Chargeback</option>
          <option value="CORPORATE">Corporate</option>
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => {
              setSearch('')
              setFilterAreaId('')
              setFilterCategoryId('')
              setFilterFundingModel('')
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 shadow-sm"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-3.5 shadow-sm min-w-[140px]">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assignments</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{filtered.length}</p>
          {hasFilters && filtered.length !== assignments.length && (
            <p className="text-xs text-gray-400 mt-0.5">of {assignments.length} total</p>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-3.5 shadow-sm min-w-[200px]">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Total Cost {hasFilters ? '(filtered)' : `(${year})`}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">
            {formatCurrency(totalCost)}
          </p>
          {hasFilters && (
            <p className="text-xs text-gray-400 mt-0.5">filtered subtotal</p>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading assignments…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            {assignments.length === 0
              ? `No assignments recorded for ${year}.`
              : 'No results match the current filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Employee</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Area / CC</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">IT Item</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Category</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Qty</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Unit Price</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Cost</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Funding</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, idx) => {
                  const unitPrice = a.itItem.prices[0]?.unitPrice ?? null
                  const catColor = a.itItem.serviceCategory.color
                  return (
                    <tr
                      key={a.id}
                      className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${
                        idx % 2 === 1 ? 'bg-gray-50/50' : ''
                      }`}
                    >
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {a.employee.lastName}, {a.employee.firstName}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{a.employee.employeeNumber}</div>
                      </td>

                      {/* Area */}
                      <td className="px-4 py-3">
                        <div className="text-gray-800">{a.employee.area.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5 font-mono">{a.employee.area.code}</div>
                      </td>

                      {/* IT Item */}
                      <td className="px-4 py-3">
                        <div className="text-gray-800">{a.itItem.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5 font-mono">{a.itItem.code}</div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: catColor ? `${catColor}25` : '#f3f4f6',
                            color: catColor ?? '#374151',
                          }}
                        >
                          {a.itItem.serviceCategory.name}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                        {toNumber(a.quantity).toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                        <span className="text-xs text-gray-400 ml-1">{a.itItem.unit}</span>
                      </td>

                      {/* Unit Price */}
                      <td className="px-4 py-3 text-right tabular-nums">
                        {unitPrice != null ? (
                          <span className="text-gray-700">{formatCurrency(unitPrice)}</span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700 border border-amber-200">
                            No price
                          </span>
                        )}
                      </td>

                      {/* Calculated cost */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                        {toNumber(a.cost) > 0 ? formatCurrency(a.cost) : '—'}
                      </td>

                      {/* Funding model */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                            a.itItem.fundingModel === 'CHARGEBACK'
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {a.itItem.fundingModel === 'CHARGEBACK' ? 'Chargeback' : 'Corporate'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => openEdit(a)}
                            className="rounded px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDelete(a)}
                            className="rounded px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeDialog}
          />
          {/* Panel */}
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl">
            {dialog.mode === 'create' && (
              <CreateDialog
                form={form}
                employees={employees}
                chargebackItems={chargebackItems}
                previewCost={createPreviewCost}
                noPriceWarning={createNoPriceWarning}
                formError={formError}
                submitting={submitting}
                onFieldChange={setField}
                onSubmit={handleCreate}
                onClose={closeDialog}
              />
            )}
            {dialog.mode === 'edit' && (
              <EditDialog
                assignment={dialog.assignment}
                form={form}
                chargebackItems={chargebackItems}
                formError={formError}
                submitting={submitting}
                onFieldChange={setField}
                onSubmit={handleEdit}
                onClose={closeDialog}
              />
            )}
            {dialog.mode === 'delete' && (
              <DeleteDialog
                assignment={dialog.assignment}
                submitting={submitting}
                onConfirm={handleDelete}
                onClose={closeDialog}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Create Dialog ────────────────────────────────────────────────────────────

interface CreateDialogProps {
  form: FormState
  employees: EmployeeOption[]
  chargebackItems: ITItemOption[]
  previewCost: number | null
  noPriceWarning: boolean
  formError: string | null
  submitting: boolean
  onFieldChange: (field: keyof FormState, value: string | number) => void
  onSubmit: () => void
  onClose: () => void
}

function CreateDialog({
  form,
  employees,
  chargebackItems,
  previewCost,
  noPriceWarning,
  formError,
  submitting,
  onFieldChange,
  onSubmit,
  onClose,
}: CreateDialogProps) {
  const selectedItem = chargebackItems.find((i) => i.id === form.itItemId) ?? null

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">New Assignment</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="space-y-4">
        {/* Employee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee <span className="text-red-500">*</span>
          </label>
          <select
            value={form.employeeId}
            onChange={(e) => onFieldChange('employeeId', e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select an employee…</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.lastName}, {emp.firstName} — {emp.area.name} ({emp.employeeNumber})
              </option>
            ))}
          </select>
        </div>

        {/* IT Item */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IT Item <span className="text-red-500">*</span>
            <span className="ml-1 text-xs font-normal text-gray-400">(Chargeback items only)</span>
          </label>
          <select
            value={form.itItemId}
            onChange={(e) => onFieldChange('itItemId', e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select an item…</option>
            {chargebackItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {item.serviceCategory.name} ({item.unit})
              </option>
            ))}
          </select>
        </div>

        {/* Year + Quantity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={form.year}
              onChange={(e) => onFieldChange('year', Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
              {selectedItem && (
                <span className="ml-1 text-xs font-normal text-gray-400">({selectedItem.unit})</span>
              )}
            </label>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={form.quantity}
              onChange={(e) => onFieldChange('quantity', e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Cost preview */}
        {form.itItemId && (
          <div className={`rounded-md px-4 py-3 text-sm ${
            noPriceWarning
              ? 'bg-amber-50 border border-amber-200 text-amber-700'
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            {noPriceWarning ? (
              <>⚠ No price defined for {form.year}. Assignment will be saved with zero cost.</>
            ) : previewCost != null ? (
              <>
                Estimated cost: <strong>{formatCurrency(previewCost)}</strong>
                {selectedItem?.prices[0] && (
                  <span className="text-green-600 ml-1">
                    (@ {formatCurrency(selectedItem.prices[0].unitPrice)} / {selectedItem.unit})
                  </span>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => onFieldChange('notes', e.target.value)}
            rows={2}
            placeholder="Optional notes…"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Error */}
        {formError && (
          <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={onClose}
          disabled={submitting}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : 'Create Assignment'}
        </button>
      </div>
    </div>
  )
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
  assignment: AssignmentRow
  form: FormState
  chargebackItems: ITItemOption[]
  formError: string | null
  submitting: boolean
  onFieldChange: (field: keyof FormState, value: string | number) => void
  onSubmit: () => void
  onClose: () => void
}

function EditDialog({
  assignment,
  form,
  chargebackItems,
  formError,
  submitting,
  onFieldChange,
  onSubmit,
  onClose,
}: EditDialogProps) {
  const a = assignment
  const editItem = chargebackItems.find((i) => i.id === a.itItem.id) ?? null
  const editPrice = editItem?.prices.find((p) => p.year === a.year) ?? null
  const previewCost =
    editPrice != null
      ? toNumber(form.quantity || '0') * toNumber(editPrice.unitPrice)
      : null

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Edit Assignment</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      {/* Read-only summary */}
      <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 mb-5 text-sm space-y-1">
        <div className="flex gap-2">
          <span className="text-gray-500 w-20 shrink-0">Employee</span>
          <span className="font-medium text-gray-900">
            {a.employee.lastName}, {a.employee.firstName}
            <span className="text-gray-400 ml-2 font-normal">({a.employee.area.name})</span>
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-500 w-20 shrink-0">IT Item</span>
          <span className="font-medium text-gray-900">
            {a.itItem.name}
            <span className="text-gray-400 ml-2 font-normal font-mono text-xs">{a.itItem.code}</span>
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-500 w-20 shrink-0">Year</span>
          <span className="font-medium text-gray-900">{a.year}</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity <span className="text-red-500">*</span>
            <span className="ml-1 text-xs font-normal text-gray-400">({a.itItem.unit})</span>
          </label>
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={form.quantity}
            onChange={(e) => onFieldChange('quantity', e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Cost preview */}
        {previewCost != null && (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-800">
            Estimated cost: <strong>{formatCurrency(previewCost)}</strong>
            {editPrice && (
              <span className="text-green-600 ml-1">
                (@ {formatCurrency(editPrice.unitPrice)} / {a.itItem.unit})
              </span>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => onFieldChange('notes', e.target.value)}
            rows={2}
            placeholder="Optional notes…"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Error */}
        {formError && (
          <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={onClose}
          disabled={submitting}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  assignment: AssignmentRow
  submitting: boolean
  onConfirm: () => void
  onClose: () => void
}

function DeleteDialog({ assignment, submitting, onConfirm, onClose }: DeleteDialogProps) {
  const a = assignment
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Delete Assignment</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Are you sure you want to delete this assignment? This action cannot be undone.
      </p>

      <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm space-y-1">
        <div className="font-medium text-red-800">
          {a.employee.lastName}, {a.employee.firstName}
        </div>
        <div className="text-red-700">
          {a.itItem.name} — {a.year}
        </div>
        <div className="text-red-600 text-xs mt-1">
          Cost: {formatCurrency(a.cost)} · Qty: {toNumber(a.quantity).toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {a.itItem.unit}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={onClose}
          disabled={submitting}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Deleting…' : 'Delete Assignment'}
        </button>
      </div>
    </div>
  )
}
