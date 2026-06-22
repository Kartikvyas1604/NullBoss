'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ConnectWallet } from './ConnectWallet'
import { LiveClock } from './LiveClock'

const NAV_ITEMS = [
  { href: '/', label: 'Terminal' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'Agents' },
  { href: '/trades', label: 'Feed' },
  { href: '/transparency', label: 'Records' },
] as const

export function Header() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-accent-green heartbeat" />
            <span
              className="font-display text-lg font-semibold tracking-wider text-foreground"
              style={{ fontFeatureSettings: "'ss01' on, 'case' on" }}
            >
              NULL<span className="text-accent-red">BOSS</span>
            </span>
          </Link>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <LiveClock />
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
                pathname === item.href
                  ? 'text-accent-cyan'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ConnectWallet />
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded border border-border font-mono text-sm text-foreground-muted md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border md:hidden">
          <nav className="flex flex-col px-4 py-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`border-b border-border py-3 font-mono text-xs uppercase tracking-[0.15em] transition-colors last:border-0 ${
                  pathname === item.href
                    ? 'text-accent-cyan'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="py-3 sm:hidden">
              <ConnectWallet />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
