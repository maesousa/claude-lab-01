'use client'

import { useState, useEffect, useMemo } from 'react'
import { formatCurrency, toNumber } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

// Minimal slice of /api/assignments response — only fields needed for aggregation
interface AssignmentRow {
  id: string
  cost: string
  employee: {
    id: string
    firstName: string
    lastName: string
    area: { id: string; code: string; name: string }
  }
  itItem: {
    serviceCategory: { id: string; name: string; color: string | null }
  }
}

// Minimal slice of /api/direct-costs response — only fields needed for aggregation
interface DirectCostRow {
  id: string
  totalCost: string
  area: { id: string; code: string; name: string }
  itItem: {
    serviceCategory: { id: string; name: string; color: string | null }
  }
}

type ReportType = 'area' | 'employee' | 'category'

// ─── Constants ────────────────────────────────────────────────────────────────

const YEARS = [2024, 2025, 2026, 2027]
const DEFAULT_YEAR = 2026

const REPORT_TABS: { id: ReportType; label: string }[] = [
  { id: 'area',     label: 'Cost by Area' },
  { id: 'employee', label: 'Cost by Employee' },
  { id: 'category', label: 'Cost by Category' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportsClient() {
  const [reportType, setReportType] = useState<ReportType>('area')
  const [year, setYear]             = useState(DEFAULT_YEAR)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [directCosts, setDirectCosts] = useState<DirectCostRow[]>([])
  const [loading, setLoading]         = useState(true)

  // ─── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/assignments?year=${year}`).then((r) => r.json()),
      fetch(`/api/direct-costs?year=${year}`).then((r) => r.json()),
    ])
      .then(([a, dc]) => {
        setAssignments(a)
        setDirectCosts(dc)
      })
      .catch((err) => console.error('[ReportsClient]', err))
      .finally(() => setLoading(false))
  }, [year])

  // ─── Global totals (always shown in summary cards) ─────────────────────────

  const totalAssignmentCost = useMemo(
    () => assignments.reduce((s, a) => s + toNumber(a.cost), 0),
    [assignments]
  )

  const totalDirectCost = useMemo(
    () => directCosts.reduce((s, dc) => s + toNumber(dc.totalCost), 0),
    [directCosts]
  )

  const grandTotal = totalAssignmentCost + totalDirectCost

  // ─── Report 1: Cost by Area ────────────────────────────────────────────────

  const byArea = useMemo(() => {
    type Row = {
      areaId: string; areaCode: string; areaName: string
      assignmentCost: number; directCost: number
    }
    const map = new Map<string, Row>()

    for (const a of assignments) {
      const { id, code, name } = a.employee.area
      const row = map.get(id) ?? { areaId: id, areaCode: code, areaName: name, assignmentCost: 0, directCost: 0 }
      map.set(id, { ...row, assignmentCost: row.assignmentCost + toNumber(a.cost) })
    }
    for (const dc of directCosts) {
      const { id, code, name } = dc.area
      const row = map.get(id) ?? { areaId: id, areaCode: code, areaName: name, assignmentCost: 0, directCost: 0 }
      map.set(id, { ...row, directCost: row.directCost + toNumber(dc.totalCost) })
    }
    return [...map.values()]
      .map((r) => ({ ...r, total: r.assignmentCost + r.directCost }))
      .sort((a, b) => b.total - a.total)
  }, [assignments, directCosts])

  // ─── Report 2: Cost by Employee ────────────────────────────────────────────

  const byEmployee = useMemo(() => {
    type Row = {
      empId: string; firstName: string; lastName: string
      areaName: string; total: number; itemCount: number
    }
    const map = new Map<string, Row>()

    for (const a of assignments) {
      const e = a.employee
      const row = map.get(e.id) ?? {
        empId: e.id, firstName: e.firstName, lastName: e.lastName,
        areaName: e.area.name, total: 0, itemCount: 0,
      }
      map.set(e.id, { ...row, total: row.total + toNumber(a.cost), itemCount: row.itemCount + 1 })
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [assignments])

  // ─── Report 3: Cost by Category ────────────────────────────────────────────

  const byCategory = useMemo(() => {
    type Row = {
      catId: string; catName: string; catColor: string | null
      assignmentCost: number; directCost: number
    }
    const map = new Map<string, Row>()

    for (const a of assignments) {
      const cat = a.itItem.serviceCategory
      const row = map.get(cat.id) ?? { catId: cat.id, catName: cat.name, catColor: cat.color, assignmentCost: 0, directCost: 0 }
      map.set(cat.id, { ...row, assignmentCost: row.assignmentCost + toNumber(a.cost) })
    }
    for (const dc of directCosts) {
      const cat = dc.itItem.serviceCategory
      const row = map.get(cat.id) ?? { catId: cat.id, catName: cat.name, catColor: cat.color, assignmentCost: 0, directCost: 0 }
      map.set(cat.id, { ...row, directCost: row.directCost + toNumber(dc.totalCost) })
    }
    return [...map.values()]
      .map((r) => ({ ...r, total: r.assignmentCost + r.directCost }))
      .sort((a, b) => b.total - a.total)
  }, [assignments, directCosts])

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const hasData = assignments.length > 0 || directCosts.length > 0

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">IT cost breakdown by area, employee and category</p>
        </div>

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
      </div>

      {/* ── Summary cards ── */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-3.5 shadow-sm min-w-[190px]">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assignment Cost</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {loading ? '—' : formatCurrency(totalAssignmentCost)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">per-employee allocations</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-3.5 shadow-sm min-w-[190px]">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Direct Cost</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {loading ? '—' : formatCurrency(totalDirectCost)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">area-level contracts</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-3.5 shadow-sm min-w-[190px]">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Grand Total ({year})</p>
          <p className="text-2xl font-bold text-blue-900 mt-1 tabular-nums">
            {loading ? '—' : formatCurrency(grandTotal)}
          </p>
          <p className="text-xs text-blue-400 mt-0.5">assignments + direct costs</p>
        </div>
      </div>

      {/* ── Report type tabs ── */}
      <div className="flex gap-2 mb-5">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              reportType === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Table area ── */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading report data…</div>
        ) : !hasData ? (
          <div className="p-10 text-center text-sm text-gray-400">
            No cost data recorded for {year}.
          </div>
        ) : reportType === 'area' ? (
          <AreaTable rows={byArea} />
        ) : reportType === 'employee' ? (
          <EmployeeTable rows={byEmployee} />
        ) : (
          <CategoryTable rows={byCategory} grandTotal={grandTotal} />
        )}
      </div>
    </div>
  )
}

// ─── Area Table ───────────────────────────────────────────────────────────────

interface AreaRow {
  areaId: string; areaCode: string; areaName: string
  assignmentCost: number; directCost: number; total: number
}

function AreaTable({ rows }: { rows: AreaRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left">
            <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Area</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Assignment Cost</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Direct Cost</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Total IT Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.areaId}
              className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${
                idx % 2 === 1 ? 'bg-gray-50/50' : ''
              }`}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{row.areaName}</div>
                <div className="text-xs text-gray-400 mt-0.5 font-mono">{row.areaCode}</div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                {row.assignmentCost > 0 ? formatCurrency(row.assignmentCost) : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                {row.directCost > 0 ? formatCurrency(row.directCost) : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                {formatCurrency(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <TotalRow
            cols={[
              null,
              rows.reduce((s, r) => s + r.assignmentCost, 0),
              rows.reduce((s, r) => s + r.directCost, 0),
              rows.reduce((s, r) => s + r.total, 0),
            ]}
          />
        </tfoot>
      </table>
    </div>
  )
}

// ─── Employee Table ───────────────────────────────────────────────────────────

interface EmployeeRow {
  empId: string; firstName: string; lastName: string
  areaName: string; total: number; itemCount: number
}

function EmployeeTable({ rows }: { rows: EmployeeRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left">
            <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Employee</th>
            <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Area</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Total Assigned Cost</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-center whitespace-nowrap"># Items</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.empId}
              className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${
                idx % 2 === 1 ? 'bg-gray-50/50' : ''
              }`}
            >
              <td className="px-4 py-3 font-medium text-gray-900">
                {row.lastName}, {row.firstName}
              </td>
              <td className="px-4 py-3 text-gray-600">{row.areaName}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                {formatCurrency(row.total)}
              </td>
              <td className="px-4 py-3 text-center tabular-nums text-gray-600">{row.itemCount}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <TotalRow
            cols={[
              null,
              null,
              rows.reduce((s, r) => s + r.total, 0),
              null,
            ]}
          />
        </tfoot>
      </table>
    </div>
  )
}

// ─── Category Table ───────────────────────────────────────────────────────────

interface CategoryRow {
  catId: string; catName: string; catColor: string | null
  assignmentCost: number; directCost: number; total: number
}

function CategoryTable({ rows, grandTotal }: { rows: CategoryRow[]; grandTotal: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left">
            <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Category</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Assignment Cost</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Direct Cost</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Total Cost</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">% of Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const pct = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0
            return (
              <tr
                key={row.catId}
                className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${
                  idx % 2 === 1 ? 'bg-gray-50/50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: row.catColor ? `${row.catColor}25` : '#f3f4f6',
                      color: row.catColor ?? '#374151',
                    }}
                  >
                    {row.catName}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                  {row.assignmentCost > 0 ? formatCurrency(row.assignmentCost) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                  {row.directCost > 0 ? formatCurrency(row.directCost) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                  {formatCurrency(row.total)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                  {pct.toFixed(1)}%
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <TotalRow
            cols={[
              null,
              rows.reduce((s, r) => s + r.assignmentCost, 0),
              rows.reduce((s, r) => s + r.directCost, 0),
              rows.reduce((s, r) => s + r.total, 0),
              null,
            ]}
          />
        </tfoot>
      </table>
    </div>
  )
}

// ─── Shared: Total footer row ─────────────────────────────────────────────────

function TotalRow({ cols }: { cols: (number | null)[] }) {
  return (
    <tr className="border-t-2 border-gray-200 bg-gray-50">
      {cols.map((val, i) => (
        <td
          key={i}
          className={`px-4 py-3 text-sm font-semibold tabular-nums ${
            i === 0 ? 'text-gray-500 text-left' : 'text-right'
          } ${val !== null ? 'text-gray-900' : 'text-gray-500'}`}
        >
          {i === 0
            ? 'Total'
            : val !== null
            ? formatCurrency(val)
            : ''}
        </td>
      ))}
    </tr>
  )
}
