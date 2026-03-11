import { prisma } from '@/lib/prisma'
import { toNumber, formatCurrency } from '@/lib/utils'

const YEAR = 2026

async function getDashboardData() {
  const [
    employeeCount,
    chargebackItemCount,
    categories,
    assignments,
    directCosts,
    areaCount,
  ] = await Promise.all([
    prisma.employee.count({ where: { isActive: true } }),
    prisma.iTItem.count({ where: { isActive: true, fundingModel: 'CHARGEBACK' } }),
    prisma.serviceCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.assignment.findMany({
      where: { year: YEAR },
      include: {
        itItem: {
          include: {
            prices: { where: { year: YEAR } },
            serviceCategory: true,
          },
        },
      },
    }),
    prisma.directCost.findMany({
      where: { year: YEAR },
      include: {
        itItem: { include: { serviceCategory: true } },
      },
    }),
    prisma.area.count({ where: { isActive: true } }),
  ])

  // Total chargeback cost = Σ assignments + Σ direct costs
  const assignmentTotal = assignments.reduce((sum, a) => {
    const unitPrice = toNumber(a.itItem.prices[0]?.unitPrice)
    return sum + toNumber(a.quantity) * unitPrice
  }, 0)

  const directCostTotal = directCosts.reduce(
    (sum, dc) => sum + toNumber(dc.totalCost),
    0
  )

  // Cost breakdown by service category
  const byCategory = categories.map((cat) => {
    const assignCost = assignments
      .filter((a) => a.itItem.serviceCategoryId === cat.id)
      .reduce((sum, a) => {
        const unitPrice = toNumber(a.itItem.prices[0]?.unitPrice)
        return sum + toNumber(a.quantity) * unitPrice
      }, 0)

    const directCost = directCosts
      .filter((dc) => dc.itItem.serviceCategoryId === cat.id)
      .reduce((sum, dc) => sum + toNumber(dc.totalCost), 0)

    return { ...cat, total: assignCost + directCost }
  }).filter((c) => c.total > 0)

  return {
    employeeCount,
    chargebackItemCount,
    areaCount,
    assignmentCount: assignments.length,
    assignmentTotal,
    directCostTotal,
    grandTotal: assignmentTotal + directCostTotal,
    byCategory,
    year: YEAR,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const stats = [
    { label: 'Active Employees',   value: data.employeeCount.toString() },
    { label: 'Active Cost Centers', value: data.areaCount.toString() },
    { label: 'Chargeback IT Items', value: data.chargebackItemCount.toString() },
    { label: `Assignments ${data.year}`, value: data.assignmentCount.toString() },
  ]

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          IT Chargeback overview · Year {data.year}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Cost summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
            Per-Employee Cost {data.year}
          </div>
          <div className="text-xl font-bold text-blue-900">
            {formatCurrency(data.assignmentTotal)}
          </div>
          <div className="text-xs text-blue-600 mt-1">{data.assignmentCount} assignments</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-1">
            Direct Area Costs {data.year}
          </div>
          <div className="text-xl font-bold text-amber-900">
            {formatCurrency(data.directCostTotal)}
          </div>
          <div className="text-xs text-amber-600 mt-1">fixed contracts</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">
            Total Chargeback {data.year}
          </div>
          <div className="text-xl font-bold text-green-900">
            {formatCurrency(data.grandTotal)}
          </div>
          <div className="text-xs text-green-600 mt-1">Mechanism A + B</div>
        </div>
      </div>

      {/* Cost by category */}
      {data.byCategory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              Cost by Service Category · {data.year}
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left font-medium">Category</th>
                <th className="px-4 py-2 text-right font-medium">Total Cost</th>
                <th className="px-4 py-2 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {data.byCategory.map((cat) => (
                <tr key={cat.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 flex items-center gap-2">
                    {cat.color && (
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                    {cat.name}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatCurrency(cat.total)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {data.grandTotal > 0
                      ? `${((cat.total / data.grandTotal) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {formatCurrency(data.grandTotal)}
                </td>
                <td className="px-4 py-2.5 text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
