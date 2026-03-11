import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'

const YEAR = 2026

interface PageProps {
  searchParams: { fundingModel?: string; categoryId?: string }
}

async function getItems(fundingModel?: string, categoryId?: string) {
  const [items, categories] = await Promise.all([
    prisma.iTItem.findMany({
      where: {
        isActive: true,
        ...(fundingModel ? { fundingModel } : {}),
        ...(categoryId  ? { serviceCategoryId: categoryId } : {}),
      },
      include: {
        serviceCategory: true,
        dsiResponsible:  true,
        prices: { where: { year: YEAR } },
      },
      orderBy: [
        { serviceCategory: { sortOrder: 'asc' } },
        { name: 'asc' },
      ],
    }),
    prisma.serviceCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])
  return { items, categories }
}

export default async function ItemsPage({ searchParams }: PageProps) {
  const { items, categories } = await getItems(
    searchParams.fundingModel,
    searchParams.categoryId
  )

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IT Items</h1>
          <p className="text-sm text-gray-500 mt-1">
            IT Service Catalogue · {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <a
          href="/api/items"
          target="_blank"
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          JSON ↗
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Funding Model filter */}
        <div className="flex rounded-md border border-gray-200 bg-white overflow-hidden text-sm">
          <FilterLink
            href="/items"
            active={!searchParams.fundingModel}
            label="All"
          />
          <FilterLink
            href="/items?fundingModel=CHARGEBACK"
            active={searchParams.fundingModel === 'CHARGEBACK'}
            label="Chargeback"
          />
          <FilterLink
            href="/items?fundingModel=CORPORATE"
            active={searchParams.fundingModel === 'CORPORATE'}
            label="Corporate"
          />
        </div>

        {/* Category filter */}
        <div className="flex rounded-md border border-gray-200 bg-white overflow-hidden text-sm">
          <FilterLink href="/items" active={!searchParams.categoryId} label="All categories" />
          {categories.map((cat) => (
            <FilterLink
              key={cat.id}
              href={`/items?categoryId=${cat.id}`}
              active={searchParams.categoryId === cat.id}
              label={cat.name}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
              <th className="px-4 py-3 text-left font-medium">Code</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Funding</th>
              <th className="px-4 py-3 text-left font-medium">Unit</th>
              <th className="px-4 py-3 text-left font-medium">Responsible</th>
              <th className="px-4 py-3 text-right font-medium">{YEAR} Price</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No items match the current filters.
                </td>
              </tr>
            )}
            {items.map((item) => {
              const price = item.prices[0]?.unitPrice
              return (
                <tr
                  key={item.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3">
                    <CategoryBadge
                      name={item.serviceCategory.name}
                      color={item.serviceCategory.color}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <FundingBadge model={item.fundingModel} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {item.dsiResponsible
                      ? `${item.dsiResponsible.code} — ${item.dsiResponsible.name}`
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {price != null
                      ? formatCurrency(price)
                      : <span className="text-gray-300 text-xs">n/a</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FilterLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm border-r border-gray-200 last:border-0 transition-colors ${
        active
          ? 'bg-slate-800 text-white font-medium'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </Link>
  )
}

function CategoryBadge({ name, color }: { name: string; color: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      {color && (
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {name}
    </span>
  )
}

function FundingBadge({ model }: { model: string }) {
  const isChargeback = model === 'CHARGEBACK'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        isChargeback
          ? 'bg-blue-50 text-blue-700 border border-blue-200'
          : 'bg-gray-100 text-gray-600 border border-gray-200'
      }`}
    >
      {isChargeback ? 'Chargeback' : 'Corporate'}
    </span>
  )
}
