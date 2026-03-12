import { prisma } from '@/lib/prisma'
import ItemsClient from './ItemsClient'

export const metadata = {
  title: 'IT Catalogue — Chargeback App',
}

const YEAR = 2026

export default async function ItemsPage() {
  const [items, categories, dsiResponsibles] = await Promise.all([
    prisma.iTItem.findMany({
      where: { isActive: true },
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
    prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.dSIResponsible.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    }),
  ])

  // Serialise Decimal → string so the client component can receive plain JSON props
  const serialisedItems = items.map((item) => ({
    ...item,
    prices: item.prices.map((p) => ({
      ...p,
      unitPrice: p.unitPrice.toString(),
    })),
  }))

  return (
    <ItemsClient
      initialItems={serialisedItems}
      categories={categories}
      dsiResponsibles={dsiResponsibles}
      year={YEAR}
    />
  )
}
