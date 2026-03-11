'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatCurrency, toNumber } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

interface DirectCostRow {
  id: string
  year: number
  totalCost: string
  notes: string | null
  area: {
    id: string
    code: string
    name: string
    direcao: { id: string; name: string }
  }
  itItem: {
    id: string
    code: string
    name: string
    unit: string
    fundingModel: string
    serviceCategory: { id: string; name: string; color: string | null }
  }
}

interface FormState {
  areaId: string
  itItemId: string
  year: number
  totalCost: string
  notes: string
}

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; cost: DirectCostRow }
  | { mode: 'delete'; cost: DirectCostRow }
  | null

// ─── Constants ────────────────────────────────────────────────────────────────

const YEARS = [2024, 2025, 2026, 2027]
const DEFAULT_YEAR = 2026

const emptyForm: FormState = {
  areaId: '',
  itItemId: '',
  year: DEFAULT_YEAR,
  totalCost: '',
  notes: '',
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DirectCostsClient() {
  // Reference data (loaded once on mount)
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [directItems, setDirectItems] = useState<ITItemOption[]>([])

  // Year-dependent data
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [costs, setCosts] = useState<DirectCostRow[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [filterAreaId, setFilterAreaId] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')

  // Dialog state
  const [dialog, setDialog] = useState<DialogState>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchCosts = useCallback(async (y: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/direct-costs?year=${y}`)
      if (!res.ok) throw new Error('Failed to fetch direct costs')
      setCosts(await res.json())
    } catch (err) {
      console.error('[DirectCostsClient] fetch costs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load static reference data once on mount
  useEffect(() => {
    async function bootstrap() {
      const [areaRes, catRes, itemRes] = await Promise.all([
        fetch('/api/areas'),
        fetch('/api/categories'),
        fetch('/api/items?fundingModel=CHARGEBACK'),
      ])
      const [areasData, catsData, itemsData] = await Promise.all([
        areaRes.json(),
        catRes.json(),
        itemRes.json(),
      ])
      setAreas(areasData)
      setCategories(catsData)
      setDirectItems(itemsData)
    }
    bootstrap()
  }, [])

  // Reload direct costs whenever year changes (also fires on mount)
  useEffect(() => {
    fetchCosts(year)
  }, [year, fetchCosts])

  // ─── Derived / filtered data ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return costs.filter((c) => {
      if (filterAreaId && c.area.id !== filterAreaId) return false
      if (filterCategoryId && c.itItem.serviceCategory.id !== filterCategoryId) return false
      return true
    })
  }, [costs, filterAreaId, filterCategoryId])

  const totalCost = useMemo(
    () => filtered.reduce((sum, c) => sum + toNumber(c.totalCost), 0),
    [filtered]
  )

  const hasFilters = filterAreaId || filterCategoryId

  // ─── Dialog helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ ...emptyForm, year })
    setFormError(null)
    setDialog({ mode: 'create' })
  }

  function openEdit(c: DirectCostRow) {
    setForm({
      areaId:    c.area.id,
      itItemId:  c.itItem.id,
      year:      c.year,
      totalCost: c.totalCost,
      notes:     c.notes ?? '',
    })
    setFormError(null)
    setDialog({ mode: 'edit', cost: c })
  }

  function openDelete(c: DirectCostRow) {
    setDialog({ mode: 'delete', cost: c })
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
    if (!form.areaId || !form.itItemId || !form.totalCost) {
      setFormError('Please fill in all required fields.')
      return
    }
    const cost = parseFloat(form.totalCost)
    if (isNaN(cost) || cost < 0) {
      setFormError('Total cost must be a non-negative number.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/direct-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaId:    form.areaId,
          itItemId:  form.itItemId,
          year:      form.year,
          totalCost: cost,
          notes:     form.notes || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error ?? 'Failed to create direct cost.')
        return
      }
      await fetchCosts(year)
      closeDialog()
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!form.totalCost) {
      setFormError('Total cost is required.')
      return
    }
    const cost = parseFloat(form.totalCost)
    if (isNaN(cost) || cost < 0) {
      setFormError('Total cost must be a non-negative number.')
      return
    }
    if (dialog?.mode !== 'edit') return
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/direct-costs/${dialog.cost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalCost: cost,
          notes:     form.notes || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error ?? 'Failed to update direct cost.')
        return
      }
      await fetchCosts(year)
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
      await fetch(`/api/direct-costs/${dialog.cost.id}`, { method: 'DELETE' })
      await fetchCosts(year)
      closeDialog()
    } catch {
      console.error('[DirectCostsClient] delete failed')
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
          <h1 className="text-2xl font-bold text-gray-900">Direct Costs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Area-level IT cost contracts charged directly</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          <span className="text-base leading-none">＋</span>
          New Direct Cost
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

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => {
              setFilterAreaId('')
              setFilterCategoryId('')
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 shadow-sm"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-3.5 shadow-sm min-w-[160px]">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contracts</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{filtered.length}</p>
          {hasFilters && filtered.length !== costs.length && (
            <p className="text-xs text-gray-400 mt-0.5">of {costs.length} total</p>
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
          <div className="p-10 text-center text-sm text-gray-400">Loading direct costs…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            {costs.length === 0
              ? `No direct costs recorded for ${year}.`
              : 'No results match the current filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Area</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">IT Item</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Category</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Year</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Total Cost</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Notes</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => {
                  const catColor = c.itItem.serviceCategory.color
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${
                        idx % 2 === 1 ? 'bg-gray-50/50' : ''
                      }`}
                    >
                      {/* Area */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{c.area.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5 font-mono">{c.area.code}</div>
                      </td>

                      {/* IT Item */}
                      <td className="px-4 py-3">
                        <div className="text-gray-800">{c.itItem.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5 font-mono">{c.itItem.code}</div>
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
                          {c.itItem.serviceCategory.name}
                        </span>
                      </td>

                      {/* Year */}
                      <td className="px-4 py-3 text-gray-700 tabular-nums">{c.year}</td>

                      {/* Total Cost */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(c.totalCost)}
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3 max-w-[200px]">
                        {c.notes ? (
                          <span className="text-gray-600 text-xs line-clamp-2" title={c.notes}>
                            {c.notes}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => openEdit(c)}
                            className="rounded px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDelete(c)}
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
                areas={areas}
                directItems={directItems}
                formError={formError}
                submitting={submitting}
                onFieldChange={setField}
                onSubmit={handleCreate}
                onClose={closeDialog}
              />
            )}
            {dialog.mode === 'edit' && (
              <EditDialog
                cost={dialog.cost}
                form={form}
                formError={formError}
                submitting={submitting}
                onFieldChange={setField}
                onSubmit={handleEdit}
                onClose={closeDialog}
              />
            )}
            {dialog.mode === 'delete' && (
              <DeleteDialog
                cost={dialog.cost}
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
  areas: AreaOption[]
  directItems: ITItemOption[]
  formError: string | null
  submitting: boolean
  onFieldChange: (field: keyof FormState, value: string | number) => void
  onSubmit: () => void
  onClose: () => void
}

function CreateDialog({
  form,
  areas,
  directItems,
  formError,
  submitting,
  onFieldChange,
  onSubmit,
  onClose,
}: CreateDialogProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">New Direct Cost</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="space-y-4">
        {/* Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Area <span className="text-red-500">*</span>
          </label>
          <select
            value={form.areaId}
            onChange={(e) => onFieldChange('areaId', e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select an area…</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
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
            {directItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {item.serviceCategory.name} ({item.unit})
              </option>
            ))}
          </select>
        </div>

        {/* Year + Total Cost */}
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
              Total Cost (€) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.totalCost}
              onChange={(e) => onFieldChange('totalCost', e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

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
          {submitting ? 'Saving…' : 'Create Direct Cost'}
        </button>
      </div>
    </div>
  )
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
  cost: DirectCostRow
  form: FormState
  formError: string | null
  submitting: boolean
  onFieldChange: (field: keyof FormState, value: string | number) => void
  onSubmit: () => void
  onClose: () => void
}

function EditDialog({
  cost,
  form,
  formError,
  submitting,
  onFieldChange,
  onSubmit,
  onClose,
}: EditDialogProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Edit Direct Cost</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      {/* Read-only summary */}
      <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 mb-5 text-sm space-y-1">
        <div className="flex gap-2">
          <span className="text-gray-500 w-16 shrink-0">Area</span>
          <span className="font-medium text-gray-900">
            {cost.area.name}
            <span className="text-gray-400 ml-2 font-normal font-mono text-xs">{cost.area.code}</span>
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-500 w-16 shrink-0">IT Item</span>
          <span className="font-medium text-gray-900">
            {cost.itItem.name}
            <span className="text-gray-400 ml-2 font-normal font-mono text-xs">{cost.itItem.code}</span>
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-500 w-16 shrink-0">Year</span>
          <span className="font-medium text-gray-900">{cost.year}</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Total Cost */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Cost (€) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.totalCost}
            onChange={(e) => onFieldChange('totalCost', e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        </div>

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
  cost: DirectCostRow
  submitting: boolean
  onConfirm: () => void
  onClose: () => void
}

function DeleteDialog({ cost, submitting, onConfirm, onClose }: DeleteDialogProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Delete Direct Cost</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Are you sure you want to delete this direct cost record? This action cannot be undone.
      </p>

      <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm space-y-1">
        <div className="font-medium text-red-800">{cost.area.name}</div>
        <div className="text-red-700">
          {cost.itItem.name} — {cost.year}
        </div>
        <div className="text-red-600 text-xs mt-1">
          Total Cost: {formatCurrency(cost.totalCost)}
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
          {submitting ? 'Deleting…' : 'Delete Direct Cost'}
        </button>
      </div>
    </div>
  )
}
