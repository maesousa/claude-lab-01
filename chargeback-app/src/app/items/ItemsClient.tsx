'use client'

import { useState, useCallback, useMemo } from 'react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryOption {
  id: string
  code: string
  name: string
  color: string | null
  sortOrder: number
  isActive: boolean
}

interface DSIResponsibleOption {
  id: string
  code: string
  name: string
  email: string | null
  isActive: boolean
}

interface ITItemRow {
  id: string
  code: string
  name: string
  serviceCategoryId: string
  fundingModel: string
  unit: string
  description: string | null
  dsiResponsibleId: string | null
  isActive: boolean
  serviceCategory: { id: string; name: string; color: string | null; sortOrder: number }
  dsiResponsible: { id: string; code: string; name: string } | null
  prices: Array<{ id: string; year: number; unitPrice: string }>
}

interface FormState {
  code: string
  name: string
  serviceCategoryId: string
  fundingModel: string
  unit: string
  description: string
  dsiResponsibleId: string
}

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; item: ITItemRow }
  | { mode: 'deactivate'; item: ITItemRow }
  | null

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialItems: ITItemRow[]
  categories: CategoryOption[]
  dsiResponsibles: DSIResponsibleOption[]
  year: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const emptyForm: FormState = {
  code: '',
  name: '',
  serviceCategoryId: '',
  fundingModel: 'CHARGEBACK',
  unit: '',
  description: '',
  dsiResponsibleId: '',
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ItemsClient({ initialItems, categories, dsiResponsibles, year }: Props) {
  const [items, setItems] = useState<ITItemRow[]>(initialItems)
  const [loading, setLoading] = useState(false)

  // Filter state
  const [filterFunding, setFilterFunding] = useState<'ALL' | 'CHARGEBACK' | 'CORPORATE'>('ALL')
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [search, setSearch] = useState('')

  // Dialog state
  const [dialog, setDialog] = useState<DialogState>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/items?year=${year}`)
      if (!res.ok) throw new Error('Failed to fetch items')
      setItems(await res.json())
    } catch (err) {
      console.error('[ItemsClient] fetchItems:', err)
    } finally {
      setLoading(false)
    }
  }, [year])

  // ─── Derived / filtered data ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterFunding !== 'ALL' && item.fundingModel !== filterFunding) return false
      if (filterCategoryId && item.serviceCategoryId !== filterCategoryId) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !item.name.toLowerCase().includes(q) &&
          !item.code.toLowerCase().includes(q) &&
          !(item.description ?? '').toLowerCase().includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [items, filterFunding, filterCategoryId, search])

  const hasFilters = filterFunding !== 'ALL' || filterCategoryId !== '' || search !== ''

  // ─── Dialog helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setForm(emptyForm)
    setFormError(null)
    setDialog({ mode: 'create' })
  }

  function openEdit(item: ITItemRow) {
    setForm({
      code:              item.code,
      name:              item.name,
      serviceCategoryId: item.serviceCategoryId,
      fundingModel:      item.fundingModel,
      unit:              item.unit,
      description:       item.description ?? '',
      dsiResponsibleId:  item.dsiResponsibleId ?? '',
    })
    setFormError(null)
    setDialog({ mode: 'edit', item })
  }

  function openDeactivate(item: ITItemRow) {
    setFormError(null)
    setDialog({ mode: 'deactivate', item })
  }

  function closeDialog() {
    setDialog(null)
    setFormError(null)
  }

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ─── CRUD handlers ──────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!form.code.trim() || !form.name.trim() || !form.serviceCategoryId || !form.unit.trim()) {
      setFormError('Please fill in all required fields: Code, Name, Category, and Unit.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code:              form.code.trim().toUpperCase(),
          name:              form.name.trim(),
          serviceCategoryId: form.serviceCategoryId,
          fundingModel:      form.fundingModel,
          unit:              form.unit.trim(),
          description:       form.description.trim() || null,
          dsiResponsibleId:  form.dsiResponsibleId || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error ?? 'Failed to create item.')
        return
      }
      await fetchItems()
      closeDialog()
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!form.name.trim() || !form.serviceCategoryId || !form.unit.trim()) {
      setFormError('Please fill in all required fields: Name, Category, and Unit.')
      return
    }
    if (dialog?.mode !== 'edit') return
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/items/${dialog.item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:              form.name.trim(),
          serviceCategoryId: form.serviceCategoryId,
          fundingModel:      form.fundingModel,
          unit:              form.unit.trim(),
          description:       form.description.trim() || null,
          dsiResponsibleId:  form.dsiResponsibleId || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error ?? 'Failed to update item.')
        return
      }
      await fetchItems()
      closeDialog()
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate() {
    if (dialog?.mode !== 'deactivate') return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/items/${dialog.item.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error ?? 'Failed to deactivate item.')
        return
      }
      await fetchItems()
      closeDialog()
    } catch {
      setFormError('Network error. Please try again.')
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
          <h1 className="text-2xl font-bold text-gray-900">IT Catalogue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            IT Service Catalogue · {filtered.length}
            {hasFilters && filtered.length !== items.length ? ` of ${items.length}` : ''}{' '}
            item{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          <span className="text-base leading-none">＋</span>
          New item
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Funding model pill filter */}
        <div className="flex rounded-md border border-gray-200 bg-white overflow-hidden text-sm shadow-sm">
          {(['ALL', 'CHARGEBACK', 'CORPORATE'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterFunding(f)}
              className={`px-3 py-1.5 border-r border-gray-200 last:border-0 transition-colors ${
                filterFunding === f
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'CHARGEBACK' ? 'Chargeback' : 'Corporate'}
            </button>
          ))}
        </div>

        {/* Category select */}
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

        {/* Full-text search */}
        <input
          type="search"
          placeholder="Search name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => { setFilterFunding('ALL'); setFilterCategoryId(''); setSearch('') }}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 shadow-sm"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            {items.length === 0
              ? 'No items in catalogue yet.'
              : 'No results match the current filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Code</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Category</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Funding</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Unit</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Responsible</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">{year} Price</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const price = item.prices[0]?.unitPrice ?? null
                  const catColor = item.serviceCategory.color
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${
                        idx % 2 === 1 ? 'bg-gray-50/50' : ''
                      }`}
                    >
                      {/* Code */}
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                        {item.code}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{item.description}</div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: catColor ? `${catColor}25` : '#f1f5f9',
                            color: catColor ?? '#475569',
                            border: `1px solid ${catColor ? `${catColor}40` : '#e2e8f0'}`,
                          }}
                        >
                          {item.serviceCategory.name}
                        </span>
                      </td>

                      {/* Funding model */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                            item.fundingModel === 'CHARGEBACK'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {item.fundingModel === 'CHARGEBACK' ? 'Chargeback' : 'Corporate'}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.unit}</td>

                      {/* Responsible */}
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {item.dsiResponsible
                          ? `${item.dsiResponsible.code} — ${item.dsiResponsible.name}`
                          : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                        {price != null
                          ? <span className="text-gray-700">{formatCurrency(price)}</span>
                          : <span className="text-gray-300 text-xs">n/a</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => openEdit(item)}
                            className="rounded px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeactivate(item)}
                            className="rounded px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 border border-amber-200 transition-colors"
                          >
                            Deactivate
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
              <ItemFormDialog
                title="New IT Item"
                form={form}
                categories={categories}
                dsiResponsibles={dsiResponsibles}
                codeEditable
                formError={formError}
                submitting={submitting}
                onFieldChange={setField}
                onSubmit={handleCreate}
                onClose={closeDialog}
                submitLabel="Create Item"
              />
            )}
            {dialog.mode === 'edit' && (
              <ItemFormDialog
                title="Edit IT Item"
                form={form}
                categories={categories}
                dsiResponsibles={dsiResponsibles}
                codeEditable={false}
                formError={formError}
                submitting={submitting}
                onFieldChange={setField}
                onSubmit={handleEdit}
                onClose={closeDialog}
                submitLabel="Save Changes"
              />
            )}
            {dialog.mode === 'deactivate' && (
              <DeactivateDialog
                item={dialog.item}
                formError={formError}
                submitting={submitting}
                onConfirm={handleDeactivate}
                onClose={closeDialog}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Item Form Dialog (Create + Edit) ─────────────────────────────────────────

interface ItemFormDialogProps {
  title: string
  form: FormState
  categories: CategoryOption[]
  dsiResponsibles: DSIResponsibleOption[]
  codeEditable: boolean
  formError: string | null
  submitting: boolean
  submitLabel: string
  onFieldChange: (field: keyof FormState, value: string) => void
  onSubmit: () => void
  onClose: () => void
}

function ItemFormDialog({
  title,
  form,
  categories,
  dsiResponsibles,
  codeEditable,
  formError,
  submitting,
  submitLabel,
  onFieldChange,
  onSubmit,
  onClose,
}: ItemFormDialogProps) {
  return (
    <div className="p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="space-y-4">
        {/* Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Code <span className="text-red-500">*</span>
            <span className="ml-1 text-xs font-normal text-gray-400">(unique identifier, e.g. HW-LAPTOP)</span>
          </label>
          {codeEditable ? (
            <input
              type="text"
              value={form.code}
              onChange={(e) => onFieldChange('code', e.target.value)}
              placeholder="e.g. SW-M365-E3"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-500">
              {form.code}
            </div>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            placeholder="e.g. Microsoft 365 E3"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus={!codeEditable}
          />
        </div>

        {/* Category + Funding model */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={form.serviceCategoryId}
              onChange={(e) => onFieldChange('serviceCategoryId', e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Funding model <span className="text-red-500">*</span>
            </label>
            <select
              value={form.fundingModel}
              onChange={(e) => onFieldChange('fundingModel', e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="CHARGEBACK">Chargeback</option>
              <option value="CORPORATE">Corporate</option>
            </select>
          </div>
        </div>

        {/* Unit + DSI responsible */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit <span className="text-red-500">*</span>
              <span className="ml-1 text-xs font-normal text-gray-400">(e.g. device, licence)</span>
            </label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => onFieldChange('unit', e.target.value)}
              placeholder="device"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DSI Responsible
            </label>
            <select
              value={form.dsiResponsibleId}
              onChange={(e) => onFieldChange('dsiResponsibleId', e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">None</option>
              {dsiResponsibles.map((r) => (
                <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            rows={2}
            placeholder="Optional description…"
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
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </div>
  )
}

// ─── Deactivate Dialog ────────────────────────────────────────────────────────

interface DeactivateDialogProps {
  item: ITItemRow
  formError: string | null
  submitting: boolean
  onConfirm: () => void
  onClose: () => void
}

function DeactivateDialog({ item, formError, submitting, onConfirm, onClose }: DeactivateDialogProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Deactivate IT Item</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        This item will be hidden from the catalogue and can no longer be assigned. Existing assignments, direct costs, and annual prices are preserved.
      </p>

      <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm space-y-1">
        <div className="font-medium text-amber-900">{item.name}</div>
        <div className="text-amber-700 font-mono text-xs">{item.code}</div>
        <div className="text-amber-700 text-xs mt-1">
          {item.serviceCategory.name} · {item.fundingModel === 'CHARGEBACK' ? 'Chargeback' : 'Corporate'}
        </div>
      </div>

      {formError && (
        <p className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

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
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Deactivating…' : 'Deactivate Item'}
        </button>
      </div>
    </div>
  )
}
