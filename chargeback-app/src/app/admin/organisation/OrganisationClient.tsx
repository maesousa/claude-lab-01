'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Pelouro {
  id: string
  code: string
  name: string
}

interface Direcao {
  id: string
  code: string
  name: string
  pelouro: Pelouro
}

interface AreaRow {
  id: string
  code: string
  name: string
  direcaoId: string
  isActive: boolean
  direcao: Direcao
}

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; area: AreaRow }
  | { mode: 'deactivate'; area: AreaRow }
  | { mode: 'activate'; area: AreaRow }
  | null

interface FormState {
  code: string
  name: string
  direcaoId: string
}

const EMPTY_FORM: FormState = { code: '', name: '', direcaoId: '' }

// ─── Main component ───────────────────────────────────────────────────────────
export default function OrganisationClient() {
  const [areas,           setAreas]           = useState<AreaRow[]>([])
  const [direcoes,        setDirecoes]        = useState<Direcao[]>([])
  const [filterDirecaoId, setFilterDirecaoId] = useState('')
  const [search,          setSearch]          = useState('')
  const [loading,         setLoading]         = useState(true)

  const [dialog,     setDialog]     = useState<DialogState>(null)
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM)
  const [formError,  setFormError]  = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Fetch all data ───────────────────────────────────────────────────────
  const fetchAreas = useCallback(async () => {
    try {
      const res = await fetch('/api/areas?includeInactive=true')
      if (!res.ok) throw new Error('Failed to fetch areas')
      setAreas(await res.json())
    } catch (err) {
      console.error('[OrganisationClient] fetch areas:', err)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/areas?includeInactive=true').then((r) => r.json()),
      fetch('/api/direcoes').then((r) => r.json()),
    ])
      .then(([a, d]) => {
        setAreas(a)
        setDirecoes(d)
      })
      .catch((err) => console.error('[OrganisationClient] bootstrap:', err))
      .finally(() => setLoading(false))
  }, [])

  // ── Client-side filtering ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return areas.filter((a) => {
      if (filterDirecaoId && a.direcaoId !== filterDirecaoId) return false
      if (q && !a.code.toLowerCase().includes(q) && !a.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [areas, filterDirecaoId, search])

  const activeCount   = useMemo(() => areas.filter((a) => a.isActive).length, [areas])
  const inactiveCount = useMemo(() => areas.filter((a) => !a.isActive).length, [areas])

  // ── Dialog helpers ───────────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError('')
    setDialog({ mode: 'create' })
  }

  function openEdit(area: AreaRow) {
    setForm({ code: area.code, name: area.name, direcaoId: area.direcaoId })
    setFormError('')
    setDialog({ mode: 'edit', area })
  }

  function closeDialog() {
    setDialog(null)
    setFormError('')
  }

  // ── CRUD handlers ────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!form.code || !form.name || !form.direcaoId) {
      setFormError('Code, Name, and Direção are required.')
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/areas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: form.code, name: form.name, direcaoId: form.direcaoId }),
      })
      if (res.status === 409) {
        setFormError('An area with this code already exists.')
        return
      }
      if (!res.ok) throw new Error('Create failed')
      await fetchAreas()
      closeDialog()
    } catch {
      setFormError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!form.code || !form.name || !form.direcaoId) {
      setFormError('Code, Name, and Direção are required.')
      return
    }
    if (dialog?.mode !== 'edit') return

    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch(`/api/areas/${dialog.area.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: form.code, name: form.name, direcaoId: form.direcaoId }),
      })
      if (res.status === 409) {
        setFormError('An area with this code already exists.')
        return
      }
      if (!res.ok) throw new Error('Update failed')
      await fetchAreas()
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
      const res = await fetch(`/api/areas/${dialog.area.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: false }),
      })
      if (res.status === 409) {
        const data = await res.json()
        setFormError(data.error ?? 'Cannot deactivate this area.')
        return
      }
      if (!res.ok) throw new Error('Deactivate failed')
      await fetchAreas()
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
      const res = await fetch(`/api/areas/${dialog.area.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: true }),
      })
      if (!res.ok) throw new Error('Activate failed')
      await fetchAreas()
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
          <h1 className="text-xl font-semibold text-slate-900">Organisation</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage areas and cost centers</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          + Add Area
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryCard label="Active Areas"   value={String(activeCount)} />
        <SummaryCard label="Inactive Areas" value={String(inactiveCount)} />
        <SummaryCard label="Total Areas"    value={String(areas.length)} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Direção</label>
          <select
            value={filterDirecaoId}
            onChange={(e) => setFilterDirecaoId(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
          >
            <option value="">All Direções</option>
            {direcoes.map((d) => (
              <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-slate-600">Search</label>
          <input
            type="text"
            placeholder="Code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-slate-500">Loading areas…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No areas found for the selected filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Code', 'Name', 'Direção', 'Pelouro', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((a) => (
                <tr key={a.id} className={`hover:bg-slate-50 ${!a.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{a.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{a.name}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {a.direcao.code} — {a.direcao.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{a.direcao.pelouro.code}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge isActive={a.isActive} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(a)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      {a.isActive ? (
                        <button
                          onClick={() => { setFormError(''); setDialog({ mode: 'deactivate', area: a }) }}
                          className="text-xs font-medium text-amber-600 hover:text-amber-800"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => { setFormError(''); setDialog({ mode: 'activate', area: a }) }}
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
        <AreaFormDialog
          title={dialog.mode === 'create' ? 'Add Area' : 'Edit Area'}
          form={form}
          setForm={setForm}
          direcoes={direcoes}
          formError={formError}
          submitting={submitting}
          onSubmit={dialog.mode === 'create' ? handleCreate : handleEdit}
          onClose={closeDialog}
        />
      )}
      {dialog?.mode === 'deactivate' && (
        <ConfirmDialog
          title="Deactivate Area"
          message={`Deactivate area "${dialog.area.code} — ${dialog.area.name}"? It will be hidden from pickers but data will be preserved.`}
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
          title="Activate Area"
          message={`Reactivate area "${dialog.area.code} — ${dialog.area.name}"?`}
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

interface AreaFormDialogProps {
  title: string
  form: FormState
  setForm: (f: FormState) => void
  direcoes: Direcao[]
  formError: string
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}

function AreaFormDialog({
  title, form, setForm, direcoes, formError, submitting, onSubmit, onClose,
}: AreaFormDialogProps) {
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
              placeholder="CC-XXX"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              placeholder="Area name…"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Direção <span className="text-red-500">*</span></label>
            <select
              value={form.direcaoId}
              onChange={(e) => setForm({ ...form, direcaoId: e.target.value })}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
            >
              <option value="">Select a Direção…</option>
              {direcoes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name} ({d.pelouro.code})
                </option>
              ))}
            </select>
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
