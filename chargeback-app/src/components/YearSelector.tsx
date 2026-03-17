'use client'

import { useRouter } from 'next/navigation'

const YEARS = [2024, 2025, 2026, 2027]

interface YearSelectorProps {
  year: number
  /** Base path to push to when year changes, e.g. "/" or "/assignments" */
  basePath?: string
}

export default function YearSelector({ year, basePath = '/' }: YearSelectorProps) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const y = e.target.value
    router.push(`${basePath}?year=${y}`)
  }

  return (
    <select
      value={year}
      onChange={handleChange}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {YEARS.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  )
}
