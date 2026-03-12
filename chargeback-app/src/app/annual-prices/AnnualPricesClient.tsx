'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatCurrency, toNumber } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────
const YEARS = [2024, 2025, 2026, 2027]
const DEFAULT_YEAR = 2026

// ─── Types ────────────────────────────────────────────────────────────────────
interface CategoryRef {
  id: string
  code: string
  name: string
  color: string | null
  sortOrder: number
}

interface ItemRef {
  id: string
  code: string
  name: string
  unit: string
  serviceCategory: CategoryRef
}

interface PriceRow {
  id: string
  itItemId: string
  year: number
  unitPrice: string
  notes: string | null
  itItem: ItemRef
}

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; price: PriceRow }
  | { mode: 'delete'; price: PriceRow }
  | null

interface FormState {
  itItemId: string
  year: number
  unitPrice: string
  notes: string
}

const EMPTY_FORM: FormState = {
  itItemId:  '',
  year:      DEFAULT_YEAR,
  unitPrice: '',
  notes:     '',
}

// ─── Copy result banner ───────────────────────────────────────────────────────
interface CopyResult { created: number; skipped: number }

// ─── Main component ───────────────────────────────────────────────────────────
export default function AnnualPricesClient() {
  const [year, setYear]                         = useState(DEFAULT_YEAR)
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [search, setSearch]                     = useState('')

  const [prices,     setPrices]     = useState<PriceRow[]>([])
  const [items,      setItems]      = useState<ItemRef[]>([])
  const [categories, setCategories] = useState<CategoryRef[]>([])
  const [loading,    setLoading]    = useState(true)

  const [dialog,      setDialog]      = useState<DialogState>(null)
  const [form,        setForm]        = useState<FormState>(EMPTY_FORM)
  const [formError,   setFormError]   = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  const [copyResult,  setCopyResult]  = useState<CopyResult | null>(null)
  const [copying,     setCopying]     = useState(false)

  // ── Fetch reference data once ────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/items').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ])
      .then(([its, cats]) => {
        setItems(its)
        setCategories(cats)
      })
      .catch((err) => console.error('[AnnualPricesClient] bootstrap:', err))
  }, [])

  // ── Fetch prices when year changes ───────────────────────────────────────
  const fetchPrices = useCallback(async (y: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/prices?year=${y}`)
      if (!res.ok) throw new Error('Failed to fetch prices')
      setPrices(await res.json())
    } catch (err) {
      console.error('[AnnualPricesClient] fetch prices:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPrices(year) }, [year, fetchPrices])

  // ── Dismiss copy result after 5s ─────────────────────────────────────────
  useEffect(() => {
    if (!copyResult) return
    const t = setTimeout(() => setCopyResult(null), 5000)
    return () => clearTimeout(t)
  }, [copyResult])

  // ── Client-side filtering ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return prices.filter((p) => {
      if (filterCategoryId && p.itItem.serviceCategory.id !== filterCategoryId) return false
      if (q && !p.itItem.name.toLowerCase().includes(q) && !p.itItem.code.toLowerCase().includes(q)) return false
      return true
    })
  }, [prices, filterCategoryId, search])

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalSpend = useMemo(
    () => filtered.reduce((sum, p) => sum + toNumber(p.unitPrice), 0),
    [filtered]
  )

  // ── Dialog helpers ───────────────────────────────────────────────────────
  function openCreate() {
    setForm({ ...EMPTY_FORM, year })
    setFormError('')
    setDialog({ mode: 'create' })
  }

  function openEdit(price: PriceRow) {
    setForm({
      itItemId:  price.itItemId,
      year:      price.year,
      unitPrice: toNumber(price.unitPrice).toFixed(2),
      notes:     price.notes ?? '',
    })
    setFormError('')
    setDialog({ mode: 'edit', price })
  }

  function openDelete(price: PriceRow) {
    setDialog({ mode: 'delete', price })
  }

  function closeDialog() {
    setDialog(null)
    setFormError('')
  }

  // ── CRUD handlers ────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!form.itItemId || !form.unitPrice) {
      setFormError('IT Item and Unit Price are required.')
      return
    }
    const price = parseFloat(form.unitPrice)
    if (isNaN(price) || price < 0) {
      setFormError('Unit Price must be a non-negative number.')
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/prices', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          itItemId:  form.itItemId,
          year:      form.year,
          unitPrice: price,
          notes:     form.notes || null,
        }),
      })
      if (res.status === 409) {
        setFormError('A price already exists for this item and year.')
        return
      }
      if (!res.ok) throw new Error('Create failed')
      await fetchPrices(year)
      closeDialog()
    } catch {
      setFormError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!form.unitPrice) {
      setFormError('Unit Price is required.')
      return
    }
    const price = parseFloat(form.unitPrice)
    if (isNaN(price) || price < 0) {
      setFormError('Unit Price must be a non-negative number.')
      return
    }

    if (dialog?.mode !== 'edit') return
    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch(`/api/prices/${dialog.price.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ unitPrice: price, notes: form.notes || null }),
      })
      if (!res.ok) throw new Error('Update failed')
      await fetchPrices(year)
      closeDialog()
    } catch {
      setFormError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (dialog?.mode !== 'delete') return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/prices/${dialog.price.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      await fetchPrices(year)
      closeDialog()
    } catch {
      setFormError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopyFromPreviousYear() {
    setCopying(true)
    setCopyResult(null)
    try {
      const res = await fetch('/api/prices/copy', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fromYear: year - 1, toYear: year }),
      })
      if (!res.ok) throw new Error('Copy failed')
      const data = await res.json()
      setCopyResult(data)
      await fetchPrices(year)
    } catch {
      setCopyResult(null)
    } finally {
      setCopying(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Annual Prices</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage unit prices for IT items per year</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyFromPreviousYear}
            disabled={copying}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {copying ? 'Copying…' : `Copy from ${year - 1} → ${year}`}
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Price
          </button>
        </div>
      </div>

      {/* Copy result banner */}
      {copyResult && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Copy complete: <strong>{copyResult.created}</strong> price{copyResult.created !== 1 ? 's' : ''} created,{' '}
          <strong>{copyResult.skipped}</strong> skipped (already existed).
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryCard label="Year" value={String(year)} />
        <SummaryCard label="Items with Prices" value={String(filtered.length)} />
        <SummaryCard label="Total Unit Spend" value={formatCurrency(totalSpend)} highlight />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Category</label>
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-slate-600">Search IT Item</label>
          <input
            type="text"
            placeholder="Name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-slate-500">Loading prices…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No prices found for the selected filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Code', 'IT Item', 'Category', 'Unit', 'Unit Price', 'Notes', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{p.itItem.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{p.itItem.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <CategoryBadge category={p.itItem.serviceCategory} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.itItem.unit}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap tabular-nums">
                    {formatCurrency(p.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{p.notes ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDelete(p)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs */}
      {dialog?.mode === 'create' && (
        <PriceDialog
          title="Add Price"
          form={form}
          setForm={setForm}
          items={items}
          categories={categories}
          formError={formError}
          submitting={submitting}
          onSubmit={handleCreate}
          onClose={closeDialog}
          editMode={false}
        />
      )}
      {dialog?.mode === 'edit' && (
        <PriceDialog
          title="Edit Price"
          form={form}
          setForm={setForm}
          items={items}
          categories={categories}
          formError={formError}
          submitting={submitting}
          onSubmit={handleEdit}
          onClose={closeDialog}
          editMode={true}
          existingPrice={dialog.price}
        />
      )}
      {dialog?.mode === 'delete' && (
        <DeleteDialog
          itemName={dialog.price.itItem.name}
          year={dialog.price.year}
          formError={formError}
          submitting={submitting}
          onConfirm={handleDelete}
          onClose={closeDialog}
        />
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? 'text-blue-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

function CategoryBadge({ category }: { category: CategoryRef }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: category.color ? `${category.color}20` : '#f1f5f9',
        color:           category.color ?? '#475569',
        border:          `1px solid ${category.color ? `${category.color}40` : '#e2e8f0'}`,
      }}
    >
      {category.name}
    </span>
  )
}

interface PriceDialogProps {
  title: string
  form: FormState
  setForm: (f: FormState) => void
  items: ItemRef[]
  categories: CategoryRef[]
  formError: string
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
  editMode: boolean
  existingPrice?: PriceRow
}

function PriceDialog({
  title, form, setForm, items, categories,
  formError, submitting, onSubmit, onClose, editMode, existingPrice,
}: PriceDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* IT Item */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">IT Item <span className="text-red-500">*</span></label>
            {editMode && existingPrice ? (
              <p className="text-sm text-slate-900 font-medium">
                {existingPrice.itItem.code} — {existingPrice.itItem.name}
              </p>
            ) : (
              <>
                <div className="flex gap-2 mb-1">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm({ ...form, itItemId: '' })}
                      className="text-xs px-2 py-0.5 rounded-full border"
                      style={{ borderColor: c.color ?? '#cbd5e1', color: c.color ?? '#475569' }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <select
                  value={form.itItemId}
                  onChange={(e) => setForm({ ...form, itItemId: e.target.value })}
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">Select an IT item…</option>
                  {categories.map((c) => {
                    const catItems = items.filter((i) => i.serviceCategory.id === c.id)
                    if (catItems.length === 0) return null
                    return (
                      <optgroup key={c.id} label={c.name}>
                        {catItems.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.code} — {i.name}
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
              </>
            )}
          </div>

          {/* Year */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Year <span className="text-red-500">*</span></label>
            {editMode ? (
              <p className="text-sm text-slate-900 font-medium">{existingPrice?.year}</p>
            ) : (
              <select
                value={form.year}
                onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>

          {/* Unit Price */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Unit Price (€) <span className="text-red-500">*</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              placeholder="0.00"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              placeholder="Optional notes…"
            />
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : editMode ? 'Save Changes' : 'Add Price'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface DeleteDialogProps {
  itemName: string
  year: number
  formError: string
  submitting: boolean
  onConfirm: () => void
  onClose: () => void
}

function DeleteDialog({ itemName, year, formError, submitting, onConfirm, onClose }: DeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h2 className="text-base font-semibold text-slate-900 mb-2">Delete Price</h2>
          <p className="text-sm text-slate-600">
            Delete the <strong>{year}</strong> price for <strong>{itemName}</strong>? This cannot be undone.
          </p>
          {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
