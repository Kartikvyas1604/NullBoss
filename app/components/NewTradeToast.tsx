'use client'

import { useEffect, useState } from 'react'
import { useTradeFeed } from '@/app/hooks/useTradeFeed'

export function NewTradeToast() {
  const { trades } = useTradeFeed()
  const [visible, setVisible] = useState(false)
  const [latest, setLatest] = useState<typeof trades[0] | null>(null)

  useEffect(() => {
    if (trades.length === 0) return
    const current = trades[0]
    if (latest && current.id !== latest.id) {
      setLatest(current)
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 4000)
      return () => clearTimeout(timer)
    }
    if (!latest) {
      setLatest(current)
    }
  }, [trades, latest])

  if (!visible || !latest) return null

  return (
    <div className="fixed right-4 top-20 z-40 max-w-[calc(100vw-2rem)] animate-slide-in rounded border border-accent-cyan bg-surface px-4 py-3 shadow-lg">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-accent-cyan">
        New Trade Executed
      </div>
      <div className="font-mono text-xs text-foreground">
        {latest.type.toUpperCase()} · {latest.agent}
      </div>
      <div className="font-mono text-[10px] text-foreground-muted">
        ${latest.valueUsd.toFixed(2)} · {latest.tokenIn} → {latest.tokenOut}
      </div>
    </div>
  )
}
