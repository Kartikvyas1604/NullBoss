'use client'

import { useFundState } from '@/app/hooks/useFundState'
import { AnimatedNumber } from './AnimatedNumber'
import { HeartbeatIndicator } from './HeartbeatIndicator'
import { formatCompactUsd } from '@/app/lib/formatters'

export function NavTicker() {
  const { state, isLoading } = useFundState()

  if (isLoading) {
    return (
      <div className="grid-bg border border-border p-6">
        <div className="font-mono text-xs text-foreground-muted animate-pulse">
          INITIALIZING SYSTEM...
        </div>
      </div>
    )
  }

  return (
    <div className="grid-bg border border-border p-6">
      <div className="mb-3 flex items-center justify-between">
        <HeartbeatIndicator />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <div className="reveal reveal-delay-1">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
            NAV / Share
          </div>
          <div className="font-mono text-2xl font-medium text-accent-cyan glow-text-cyan md:text-3xl">
            <AnimatedNumber value={state.nav} prefix="$" />
          </div>
        </div>

        <div className="reveal reveal-delay-2">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
            TVL
          </div>
          <div className="font-mono text-2xl font-medium text-foreground md:text-3xl">
            {formatCompactUsd(state.totalValueLocked)}
          </div>
        </div>

        <div className="reveal reveal-delay-3">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
            Shares Outstanding
          </div>
          <div className="font-mono text-2xl font-medium text-foreground md:text-3xl">
            <AnimatedNumber value={state.sharesOutstanding} decimals={0} />
          </div>
        </div>

        <div className="reveal reveal-delay-4">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
            Since Inception
          </div>
          <div className="font-mono text-2xl font-medium text-accent-green glow-text-green md:text-3xl">
            +<AnimatedNumber value={state.sinceInceptionReturn} suffix="%" />
          </div>
        </div>
      </div>
    </div>
  )
}
