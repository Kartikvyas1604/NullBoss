'use client'

import { useTradeFeed } from '@/app/hooks/useTradeFeed'
import { HeartbeatIndicator } from '@/app/components/HeartbeatIndicator'
import { SectionHeader } from '@/app/components/SectionHeader'
import { formatUsd, formatTimeAgo, formatAddress } from '@/app/lib/formatters'

const TRADE_COLORS: Record<string, string> = {
  buy: 'text-accent-green',
  sell: 'text-accent-red',
  signal: 'text-accent-cyan',
  fee: 'text-accent-amber',
  rebalance: 'text-foreground',
}

export default function TradesPage() {
  const { trades, isLoading, error, notDeployed, refresh } = useTradeFeed()

  return (
    <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <SectionHeader title="Trade Feed" subtitle="On-chain trade execution history" accent="cyan" />
        <div className="flex items-center gap-4">
          <HeartbeatIndicator />
          <button
            onClick={refresh}
            type="button"
            className="rounded border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-foreground-muted transition-colors hover:border-foreground-muted hover:text-foreground"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {notDeployed && (
        <div className="grid-bg flex flex-col items-center justify-center rounded-lg border border-border p-8 text-center sm:p-16">
          <div className="mb-4 font-mono text-4xl text-foreground-muted">[ ]</div>
          <p className="font-mono text-sm text-foreground-muted">
            PositionLedger not yet deployed
          </p>
          <p className="mt-1 font-mono text-xs text-foreground-muted">
            Trade data will stream here once the PositionLedger contract is deployed and agents execute trades.
          </p>
        </div>
      )}

      {error && (
        <div className="grid-bg flex flex-col items-center justify-center rounded-lg border border-accent-red p-8 text-center sm:p-16">
          <div className="mb-4 font-mono text-4xl text-accent-red glow-text-red">[!]</div>
          <p className="font-mono text-sm text-accent-red">Failed to load trade feed</p>
          <p className="mt-1 font-mono text-xs text-foreground-muted">{error}</p>
          <button
            onClick={refresh}
            type="button"
            className="mt-4 rounded border border-accent-red px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-red transition-colors hover:bg-accent-red-dim"
          >
            Retry
          </button>
        </div>
      )}

      {!notDeployed && !error && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="whitespace-nowrap px-2 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted sm:px-4">Time</th>
                <th className="whitespace-nowrap px-2 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted sm:px-4">Type</th>
                <th className="whitespace-nowrap px-2 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted sm:px-4">Agent</th>
                <th className="whitespace-nowrap px-2 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted sm:px-4">Protocol</th>
                <th className="whitespace-nowrap px-2 py-3 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted sm:px-4">In</th>
                <th className="whitespace-nowrap px-2 py-3 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted sm:px-4">Out</th>
                <th className="whitespace-nowrap px-2 py-3 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted sm:px-4">Value</th>
                <th className="whitespace-nowrap px-2 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted sm:px-4">Tx</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center font-mono text-xs text-foreground-muted animate-pulse">
                    LOADING TRADES...
                  </td>
                </tr>
              ) : trades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center font-mono text-xs text-foreground-muted">
                    No trades executed yet
                  </td>
                </tr>
              ) : (
                trades.map((trade, i) => (
                  <tr
                    key={trade.id}
                    className={`border-b border-border font-mono text-xs transition-colors hover:bg-surface/50 ${
                      i < 3 ? 'bg-accent-red-dim/5' : ''
                    }`}
                  >
                    <td className="whitespace-nowrap px-2 py-3 text-foreground-muted sm:px-4">
                      {formatTimeAgo(trade.timestamp)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 sm:px-4">
                      <span className={TRADE_COLORS[trade.type] || 'text-foreground-muted'}>
                        {trade.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-foreground-muted sm:px-4">
                      {trade.agent}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-foreground-muted sm:px-4">
                      {trade.protocol}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right text-foreground sm:px-4">
                      {trade.amountIn.toFixed(2)} {trade.tokenIn}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right text-foreground sm:px-4">
                      {trade.amountOut.toFixed(2)} {trade.tokenOut}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right text-foreground sm:px-4">
                      {formatUsd(trade.valueUsd)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 font-mono text-[10px] text-foreground-muted sm:px-4">
                      <a
                        href={`https://snowtrace.io/tx/${trade.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent-cyan transition-colors"
                      >
                        {formatAddress(trade.txHash)}
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
