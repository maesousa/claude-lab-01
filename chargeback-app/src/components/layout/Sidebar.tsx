'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MAIN_NAV = [
  { label: 'Dashboard',    href: '/' },
  { label: 'IT Items',     href: '/items' },
  { label: 'Assignments',  href: '/assignments' },
  { label: 'Direct Costs', href: '/direct-costs' },
  { label: 'Reports',      href: '/reports' },
]

const ADMIN_NAV = [
  { label: 'Annual Prices', href: '/annual-prices' },
  { label: 'Organisation',  href: '/admin/organisation' },
  { label: 'Categories',    href: '/admin/categories' },
  { label: 'Import',        href: '/admin/import' },
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  function navLink(item: { label: string; href: string }) {
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          isActive(item.href)
            ? 'bg-slate-700 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        )}
      >
        {item.label}
      </Link>
    )
  }

  return (
    <aside className="w-56 min-h-screen bg-slate-900 text-white flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="font-bold text-base tracking-tight">Chargeback App</div>
        <div className="text-xs text-slate-400 mt-0.5">IT Cost Allocation</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {MAIN_NAV.map(navLink)}

        {/* Admin section */}
        <div className="border-t border-slate-700 my-3" />
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Admin
        </p>
        {ADMIN_NAV.map(navLink)}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700 text-xs text-slate-500">
        DSI · {new Date().getFullYear()}
      </div>
    </aside>
  )
}

// Inline cn to avoid circular import
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
