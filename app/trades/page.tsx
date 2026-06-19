'use client'

import { useTradeFeed } from '@/app/hooks/useTradeFeed'
import { HeartbeatIndicator } from '@/app/components/HeartbeatIndicator'
import { SectionHeader } from '@/app/components/SectionHeader'
import { formatUsd, formatTimeAgo, formatAddress } from '@/app/lib/formatters'

const TRADE_COLORS = {
  buy: 'text-accent-green',
  sell: 'text-accent-red',
  signal: 'text-accent-cyan',
  fee: 'text-accent-amber',
  rebalance: 'text-foreground',
} as const

export default function TradesPage() {
  const { trades, isLoading, refresh } = useTradeFeed()

  return (
    <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <SectionHeader title="Trade Feed" subtitle="Real-time on-chain activity — streaming from agent execution" accent="cyan" />
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

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="whitespace-nowrap px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                Time
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                Type
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                Agent
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                Protocol
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                In
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                Out
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                Value
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                Tx
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center font-mono text-xs text-foreground-muted animate-pulse"
                >
                  LOADING TRADES...
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
                  <td className="whitespace-nowrap px-4 py-3 text-foreground-muted">
                    {formatTimeAgo(trade.timestamp)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={
                        TRADE_COLORS[trade.type as keyof typeof TRADE_COLORS]
                      }
                    >
                      {trade.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground-muted">
                    {trade.agent}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground-muted">
                    {trade.protocol}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-foreground">
                    {trade.amountIn.toFixed(2)} {trade.tokenIn}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-foreground">
                    {trade.amountOut.toFixed(2)} {trade.tokenOut}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-foreground">
                    {formatUsd(trade.valueUsd)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[10px] text-foreground-muted">
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

      <div className="mt-4 text-center font-mono text-[10px] text-foreground-muted">
        {trades.length} trades loaded · new trades stream every 6s
      </div>
    </main>
  )
}
