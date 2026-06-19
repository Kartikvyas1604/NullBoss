'use client'

import { useState, useEffect, useCallback } from 'react'
import { generateTrades } from '@/app/data/mockData'
import type { Trade } from '@/app/types'

export function useTradeFeed() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setTrades(generateTrades(50))
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Simulate new trades coming in
  useEffect(() => {
    const interval = setInterval(() => {
      const newTrades = generateTrades(1)
      setTrades((prev) => [newTrades[0], ...prev].slice(0, 100))
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const refresh = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => {
      setTrades(generateTrades(50))
      setIsLoading(false)
    }, 400)
  }, [])

  return { trades, isLoading, refresh }
}
