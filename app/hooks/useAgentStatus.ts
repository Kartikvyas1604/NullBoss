'use client'

import { useState, useEffect } from 'react'
import { MOCK_AGENTS } from '@/app/data/mockData'
import type { Agent } from '@/app/types'

export function useAgentStatus() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  // Simulate agents cycling between active/idle
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) =>
        prev.map((a) => {
          if (a.id === 'parent-001') return a
          const roll = Math.random()
          if (roll < 0.1) {
            return {
              ...a,
              status: a.status === 'active' ? 'idle' as const : 'active' as const,
            }
          }
          return a
        })
      )
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return { agents, isLoading }
}
