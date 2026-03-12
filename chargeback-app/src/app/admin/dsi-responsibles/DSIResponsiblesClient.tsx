'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface DSIResponsibleRow {
  id:       string
  code:     string
  name:     string
  email:    string | null
  isActive: boolean
}

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit';       record: DSIResponsibleRow }
  | { mode: 'deactivate'; record: DSIResponsibleRow }
  | { mode: 'activate';   record: DSIResponsibleRow }
  | { mode: 'delete';     record: DSIResponsibleRow }
  | null

interface FormState {
  code:  string
  name:  string
  email: string
}

const EMPTY_FORM: FormState = { code: '', name: '', email: '' }

// ─── Main component ───────────────────────────────────────────────────────────
export default function DSIResponsiblesClient() {
  const [records,    setRecords]    = useState<DSIResponsibleRow[]>([])
  const [search,     setSearch]     = useState('')
  const [loading,    setLoading]    = useState(true)

  const [dialog,     setDialog]     = useState<DialogState>(null)
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM)
  const [formError,  setFormError]  = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/dsi-responsibles?includeInactive=true')
      if (!res.ok) throw new Error('Failed to fetch DSI Responsibles')
      setRecords(await res.json())
    } catch (err) {
      console.error('[DSIResponsiblesClient] fetch:', err)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchRecords().finally(() => setLoading(false))
  }, [fetchRecords])

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return records
    return records.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q)
    )
  }, [records, search])

  const activeCount   = useMemo(() => records.filter((r) => r.isActive).length,  [records])
  const inactiveCount = useMemo(() => records.filter((r) => !r.isActive).length, [records])

  // ── Dialog helpers ────────────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError('')
    setDialog({ mode: 'create' })
  }

  function openEdit(record: DSIResponsibleRow) {
    setForm({
      code:  record.code,
      name:  record.name,
      email: record.email ?? '',
    })
    setFormError('')
    setDialog({ mode: 'edit', record })
  }

  function closeDialog() {
    setDialog(null)
    setFormError('')
  }

  function validateForm(): boolean {
    if (!form.code.trim() || !form.name.trim()) {
      setFormError('Code and Name are required.')
      return false
    }
    return true
  }

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!validateForm()) return

    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/dsi-responsibles', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          code:  form.code.trim(),
          name:  form.name.trim(),
          email: form.email.trim() || null,
        }),
      })
      if (res.status === 409) {
        setFormError('A DSI Responsible with this code already exists.')
        return
      }
      if (!res.ok) throw new Error('Create failed')
      await fetchRecords()
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
      const res = await fetch(`/api/dsi-responsibles/${dialog.record.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          code:  form.code.trim(),
          name:  form.name.trim(),
          email: form.email.trim() || null,
        }),
      })
      if (res.status === 409) {
        setFormError('A DSI Responsible with this code already exists.')
        return
      }
      if (!res.ok) throw new Error('Update failed')
      await fetchRecords()
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
      const res = await fetch(`/api/dsi-responsibles/${dialog.record.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: false }),
      })
      if (!res.ok) throw new Error('Deactivate failed')
      await fetchRecords()
      closeDialog()
    } catch {
      setFormError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleActivate() {
    if (dialog?.mode !== 'activate') return

    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch(`/api/dsi-responsibles/${dialog.record.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: true }),
      })
      if (!res.ok) throw new Error('Activate failed')
      await fetchRecords()
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
    setFormError('')
    try {
      const res = await fetch(`/api/dsi-responsibles/${dialog.record.id}`, {
        method: 'DELETE',
      })
      if (res.status === 409) {
        const data = await res.json()
        setFormError(data.error ?? 'Cannot delete this record.')
        return
      }
      if (!res.ok) throw new Error('Delete failed')
      await fetchRecords()
      closeDialog()
    } catch (err) {
      if (!formError) setFormError('An unexpected error occurred. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">DSI Responsible</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage DSI team members responsible for IT items</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          + Add Person
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryCard label="Active"   value={String(activeCount)} />
        <SummaryCard label="Inactive" value={String(inactiveCount)} />
        <SummaryCard label="Total"    value={String(records.length)} />
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[160px] max-w-xs">
          <label className="text-xs font-medium text-slate-600">Search</label>
          <input
            type="text"
            placeholder="Code, name, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No records found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Code', 'Name', 'Email', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((r) => (
                <tr key={r.id} className={`hover:bg-slate-50 ${!r.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{r.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{r.name}</td>
                  <td className="px-4 py-3 text-slate-500">{r.email ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge isActive={r.isActive} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(r)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      {r.isActive ? (
                        <button
                          onClick={() => { setFormError(''); setDialog({ mode: 'deactivate', record: r }) }}
                          className="text-xs font-medium text-amber-600 hover:text-amber-800"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => { setFormError(''); setDialog({ mode: 'activate', record: r }) }}
                            className="text-xs font-medium text-green-600 hover:text-green-800"
                          >
                            Activate
                          </button>
                          <button
                            onClick={() => { setFormError(''); setDialog({ mode: 'delete', record: r }) }}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </>
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
        <DSIResponsibleFormDialog
          title={dialog.mode === 'create' ? 'Add Person' : 'Edit Person'}
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
          title="Deactivate DSI Responsible"
          message={`Deactivate ${dialog.record.code} — ${dialog.record.name}? They will be hidden from dropdowns but existing IT item assignments are preserved.`}
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
          title="Activate DSI Responsible"
          message={`Reactivate ${dialog.record.code} — ${dialog.record.name}?`}
          confirmLabel="Activate"
          confirmClass="bg-green-600 hover:bg-green-700"
          formError={formError}
          submitting={submitting}
          onConfirm={handleActivate}
          onClose={closeDialog}
        />
      )}
      {dialog?.mode === 'delete' && (
        <ConfirmDialog
          title="Delete DSI Responsible"
          message={`Permanently delete ${dialog.record.code} — ${dialog.record.name}? This cannot be undone.`}
          confirmLabel="Delete"
          confirmClass="bg-red-600 hover:bg-red-700"
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
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

interface FormDialogProps {
  title:      string
  form:       FormState
  setForm:    (f: FormState) => void
  formError:  string
  submitting: boolean
  onSubmit:   () => void
  onClose:    () => void
}

function DSIResponsibleFormDialog({
  title, form, setForm, formError, submitting, onSubmit, onClose,
}: FormDialogProps) {
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
            <label className="block text-sm font-medium text-slate-700">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm font-mono"
              placeholder="e.g. AM"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              placeholder="Full name…"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              placeholder="email@example.com"
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
  title:        string
  message:      string
  confirmLabel: string
  confirmClass: string
  formError:    string
  submitting:   boolean
  onConfirm:    () => void
  onClose:      () => void
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
