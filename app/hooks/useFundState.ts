'use client'

import { useState, useEffect, useCallback } from 'react'
import { MOCK_FUND } from '@/app/data/mockData'
import type { FundState } from '@/app/types'

export function useFundState() {
  const [state, setState] = useState<FundState>(MOCK_FUND)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  // Simulate live NAV updates
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const drift = (Math.random() - 0.49) * 0.4
        const newNav = parseFloat((prev.nav + drift).toFixed(2))
        return {
          ...prev,
          nav: newNav,
          sharePrice: newNav,
          totalValueLocked: prev.totalValueLocked + drift * prev.sharesOutstanding,
        }
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const refresh = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 400)
  }, [])

  return { state, isLoading, refresh }
}
