'use client'

import { useState, useEffect } from 'react'
import { generateNavHistory } from '@/app/data/mockData'
import type { NavHistoryPoint } from '@/app/types'

export function useNavHistory(days = 180) {
  const [data, setData] = useState<NavHistoryPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(generateNavHistory(days))
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [days])

  return { data, isLoading }
}
