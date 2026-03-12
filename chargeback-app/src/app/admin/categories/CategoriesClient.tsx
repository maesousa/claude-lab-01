'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CategoryRow {
  id: string
  code: string
  name: string
  description: string | null
  color: string | null
  sortOrder: number
  isActive: boolean
}

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; category: CategoryRow }
  | { mode: 'deactivate'; category: CategoryRow }
  | { mode: 'activate'; category: CategoryRow }
  | null

interface FormState {
  code: string
  name: string
  description: string
  color: string
  sortOrder: string
}

const EMPTY_FORM: FormState = {
  code:        '',
  name:        '',
  description: '',
  color:       '#3B82F6',
  sortOrder:   '0',
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CategoriesClient() {
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [search,     setSearch]     = useState('')
  const [loading,    setLoading]    = useState(true)

  const [dialog,     setDialog]     = useState<DialogState>(null)
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM)
  const [formError,  setFormError]  = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Fetch data ───────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories?includeInactive=true')
      if (!res.ok) throw new Error('Failed to fetch categories')
      setCategories(await res.json())
    } catch (err) {
      console.error('[CategoriesClient] fetch:', err)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchCategories().finally(() => setLoading(false))
  }, [fetchCategories])

  // ── Client-side filtering ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return categories
    return categories.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q)
    )
  }, [categories, search])

  const activeCount   = useMemo(() => categories.filter((c) => c.isActive).length, [categories])
  const inactiveCount = useMemo(() => categories.filter((c) => !c.isActive).length, [categories])

  // ── Dialog helpers ───────────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError('')
    setDialog({ mode: 'create' })
  }

  function openEdit(category: CategoryRow) {
    setForm({
      code:        category.code,
      name:        category.name,
      description: category.description ?? '',
      color:       category.color ?? '#3B82F6',
      sortOrder:   String(category.sortOrder),
    })
    setFormError('')
    setDialog({ mode: 'edit', category })
  }

  function closeDialog() {
    setDialog(null)
    setFormError('')
  }

  function buildPayload() {
    return {
      code:        form.code,
      name:        form.name,
      description: form.description || null,
      color:       form.color || null,
      sortOrder:   parseInt(form.sortOrder) || 0,
    }
  }

  function validateForm(): boolean {
    if (!form.code || !form.name) {
      setFormError('Code and Name are required.')
      return false
    }
    return true
  }

  // ── CRUD handlers ────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!validateForm()) return

    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/categories', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildPayload()),
      })
      if (res.status === 409) {
        setFormError('A category with this code already exists.')
        return
      }
      if (!res.ok) throw new Error('Create failed')
      await fetchCategories()
      closeDialog()
    } catch {
      setFormError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!validateForm()) return
    if (dialog?.mode !== 'edit') return

    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch(`/api/categories/${dialog.category.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildPayload()),
      })
      if (!res.ok) throw new Error('Update failed')
      await fetchCategories()
      closeDialog()
    } catch {
      setFormError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate() {
    if (dialog?.mode !== 'deactivate') return

    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch(`/api/categories/${dialog.category.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: false }),
      })
      if (res.status === 409) {
        const data = await res.json()
        setFormError(data.error ?? 'Cannot deactivate this category.')
        return
      }
      if (!res.ok) throw new Error('Deactivate failed')
      await fetchCategories()
      closeDialog()
    } catch (err) {
      if (!formError) setFormError('An unexpected error occurred. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleActivate() {
    if (dialog?.mode !== 'activate') return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/categories/${dialog.category.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: true }),
      })
      if (!res.ok) throw new Error('Activate failed')
      await fetchCategories()
      closeDialog()
    } catch {
      setFormError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage IT service categories</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          + Add Category
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryCard label="Active Categories"   value={String(activeCount)} />
        <SummaryCard label="Inactive Categories" value={String(inactiveCount)} />
        <SummaryCard label="Total Categories"    value={String(categories.length)} />
      </div>

      {/* Search filter */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[160px] max-w-xs">
          <label className="text-xs font-medium text-slate-600">Search</label>
          <input
            type="text"
            placeholder="Code, name, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-slate-500">Loading categories…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No categories found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Color', 'Code', 'Name', 'Description', 'Sort Order', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((c) => (
                <tr key={c.id} className={`hover:bg-slate-50 ${!c.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <ColorSwatch color={c.color} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{c.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{c.description ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-center whitespace-nowrap">{c.sortOrder}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge isActive={c.isActive} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      {c.isActive ? (
                        <button
                          onClick={() => { setFormError(''); setDialog({ mode: 'deactivate', category: c }) }}
                          className="text-xs font-medium text-amber-600 hover:text-amber-800"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => { setFormError(''); setDialog({ mode: 'activate', category: c }) }}
                          className="text-xs font-medium text-green-600 hover:text-green-800"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs */}
      {(dialog?.mode === 'create' || dialog?.mode === 'edit') && (
        <CategoryFormDialog
          title={dialog.mode === 'create' ? 'Add Category' : 'Edit Category'}
          form={form}
          setForm={setForm}
          formError={formError}
          submitting={submitting}
          onSubmit={dialog.mode === 'create' ? handleCreate : handleEdit}
          onClose={closeDialog}
        />
      )}
      {dialog?.mode === 'deactivate' && (
        <ConfirmDialog
          title="Deactivate Category"
          message={`Deactivate category "${dialog.category.code} — ${dialog.category.name}"? It will be hidden from pickers but existing data will be preserved.`}
          confirmLabel="Deactivate"
          confirmClass="bg-amber-600 hover:bg-amber-700"
          formError={formError}
          submitting={submitting}
          onConfirm={handleDeactivate}
          onClose={closeDialog}
        />
      )}
      {dialog?.mode === 'activate' && (
        <ConfirmDialog
          title="Activate Category"
          message={`Reactivate category "${dialog.category.code} — ${dialog.category.name}"?`}
          confirmLabel="Activate"
          confirmClass="bg-green-600 hover:bg-green-700"
          formError={formError}
          submitting={submitting}
          onConfirm={handleActivate}
          onClose={closeDialog}
        />
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function ColorSwatch({ color }: { color: string | null }) {
  if (!color) return <span className="inline-block w-5 h-5 rounded-full bg-slate-200" />
  return (
    <span
      className="inline-block w-5 h-5 rounded-full border border-white shadow-sm"
      style={{ backgroundColor: color }}
      title={color}
    />
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-500/20">
      Inactive
    </span>
  )
}

interface CategoryFormDialogProps {
  title: string
  form: FormState
  setForm: (f: FormState) => void
  formError: string
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}

function CategoryFormDialog({
  title, form, setForm, formError, submitting, onSubmit, onClose,
}: CategoryFormDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Code <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm font-mono"
              placeholder="CATEGORY_CODE"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              placeholder="Category name…"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              placeholder="Optional description…"
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="space-y-1 flex-1">
              <label className="block text-sm font-medium text-slate-700">Color</label>
              <input
                type="text"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm font-mono"
                placeholder="#3B82F6"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Pick</label>
              <input
                type="color"
                value={form.color.startsWith('#') ? form.color : '#3B82F6'}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded-md border border-slate-300 p-0.5"
              />
            </div>
            <div className="pb-0.5">
              <ColorSwatch color={form.color || null} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Sort Order</label>
            <input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              className="block w-28 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
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
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  confirmClass: string
  formError: string
  submitting: boolean
  onConfirm: () => void
  onClose: () => void
}

function ConfirmDialog({
  title, message, confirmLabel, confirmClass, formError, submitting, onConfirm, onClose,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h2 className="text-base font-semibold text-slate-900 mb-2">{title}</h2>
          <p className="text-sm text-slate-600">{message}</p>
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
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${confirmClass}`}
          >
            {submitting ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
