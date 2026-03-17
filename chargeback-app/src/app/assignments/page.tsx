import AssignmentsClient from './AssignmentsClient'

export const metadata = {
  title: 'Individual Costs — Chargeback App',
}

export default function AssignmentsPage({
  searchParams,
}: {
  searchParams: { year?: string; unpriced?: string }
}) {
  const year = parseInt(searchParams.year ?? '') || 2026
  const unpriced = searchParams.unpriced === 'true'
  return <AssignmentsClient defaultYear={year} defaultUnpriced={unpriced} />
}
