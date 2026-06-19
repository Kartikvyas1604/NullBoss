'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/', label: 'Terminal' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'Agents' },
  { href: '/trades', label: 'Feed' },
  { href: '/transparency', label: 'Records' },
] as const

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded border border-border font-mono text-xs text-foreground-muted"
      >
        {open ? '✕' : '☰'}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-border bg-background/95 backdrop-blur-md">
          <nav className="flex flex-col px-4 py-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`border-b border-border py-3 font-mono text-xs uppercase tracking-[0.15em] transition-colors last:border-0 ${
                  pathname === item.href
                    ? 'text-accent-cyan'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}
