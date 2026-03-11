import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a Prisma Decimal or number as currency string (€ by default).
 *
 * Uses pt-PT conventions: space as thousands separator, comma as decimal separator.
 * Implemented without toLocaleString to guarantee consistent output across
 * Node.js environments regardless of installed ICU data.
 */
export function formatCurrency(value: unknown, currency = '€'): string {
  if (value == null) return '—'          // null and undefined
  const n = Number(value)
  if (isNaN(n)) return '—'
  const abs = Math.abs(n).toFixed(2)
  const [intPart, decPart] = abs.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const sign = n < 0 ? '-' : ''
  return `${currency} ${sign}${grouped},${decPart}`
}

/** Safe Number conversion from Prisma Decimal */
export function toNumber(value: unknown): number {
  return Number(value) || 0
}
