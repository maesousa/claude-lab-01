import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a Prisma Decimal or number as currency string (€ by default) */
export function formatCurrency(value: unknown, currency = '€'): string {
  const n = Number(value)
  if (isNaN(n)) return '—'
  return `${currency} ${n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Safe Number conversion from Prisma Decimal */
export function toNumber(value: unknown): number {
  return Number(value) || 0
}
