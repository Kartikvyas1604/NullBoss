'use client'

import { useEffect, useState } from 'react'
import { checkChainConnection, CHAIN_NAMES } from '@/app/lib/contracts'

type Status = 'connecting' | 'connected' | 'disconnected'

export function ChainStatusBar() {
  const [status, setStatus] = useState<Status>('connecting')
  const [chainName, setChainName] = useState('')

  useEffect(() => {
    let cancelled = false
    checkChainConnection().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setStatus('connected')
        setChainName(result.label.replace('Connected to ', ''))
      } else {
        setStatus('disconnected')
      }
    })
    return () => { cancelled = true }
  }, [])

  const dotColor =
    status === 'connected' ? 'bg-accent-cyan' :
    status === 'connecting' ? 'bg-foreground-muted/40' :
    'bg-accent-red/50'

  const pulseClass = status === 'connected' ? 'animate-pulse' : ''

  const label =
    status === 'connected' ? `Connected to ${chainName}` :
    status === 'connecting' ? 'Connecting...' :
    'Disconnected'

  return (
    <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
      <span className={`relative inline-flex h-2 w-2 shrink-0 ${pulseClass}`}>
        <span className={`absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-60`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`} />
      </span>
      <span className="font-mono text-[11px] tracking-wider text-foreground-muted uppercase">
        {label}
      </span>
    </div>
  )
}
