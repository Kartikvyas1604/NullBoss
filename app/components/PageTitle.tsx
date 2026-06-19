'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const TITLES: Record<string, string> = {
  '/': 'NULLBOSS — Terminal',
  '/dashboard': 'NULLBOSS — Dashboard',
  '/agents': 'NULLBOSS — Agent Network',
  '/trades': 'NULLBOSS — Trade Feed',
  '/transparency': 'NULLBOSS — Track Record',
}

export function PageTitleUpdater() {
  const pathname = usePathname()

  useEffect(() => {
    document.title = TITLES[pathname] ?? 'NULLBOSS — The Fund That Has No Boss'
  }, [pathname])

  return null
}
