'use client'

import { useAccount, useBalance } from 'wagmi'
import { AnimatedNumber } from '@/app/components/AnimatedNumber'
import { HeartbeatIndicator } from '@/app/components/HeartbeatIndicator'
import { useFundState } from '@/app/hooks/useFundState'
import { formatUsd, formatPercent, formatCompactUsd } from '@/app/lib/formatters'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const { state } = useFundState()
  const { data: balance } = useBalance({ address })

  const shareBalance = isConnected ? 842.5 : 0
  const shareValue = shareBalance * state.sharePrice
  const costBasis = isConnected ? 89305 : 0
  const pnl = shareValue - costBasis
  const pnlPercent = costBasis > 0 ? ((pnl / costBasis) * 100) : 0

  return (
    <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Dashboard</h1>
          <p className="mt-1 font-mono text-xs text-foreground-muted">
            Your position in the fund
          </p>
        </div>
        <HeartbeatIndicator />
      </div>

      {!isConnected ? (
        <div className="grid-bg flex flex-col items-center justify-center rounded-lg border border-border p-16 text-center">
          <div className="mb-4 font-mono text-4xl text-foreground-muted">[ ]</div>
          <p className="font-mono text-sm text-foreground-muted">
            Connect your wallet to view your position.
          </p>
          <p className="mt-1 font-mono text-xs text-foreground-muted">
            Avalanche C-Chain · chainId 43114
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Position Summary */}
          <div className="rounded-lg border border-border bg-surface p-6 lg:col-span-2">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
              Position Summary
            </h2>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div>
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                  Share Balance
                </div>
                <div className="font-mono text-2xl text-foreground">
                  <AnimatedNumber value={shareBalance} decimals={2} />
                </div>
              </div>
              <div>
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                  Share Value
                </div>
                <div className="font-mono text-2xl text-accent-cyan">
                  <AnimatedNumber value={shareValue} prefix="$" decimals={2} />
                </div>
              </div>
              <div>
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                  Cost Basis
                </div>
                <div className="font-mono text-2xl text-foreground">
                  {formatUsd(costBasis)}
                </div>
              </div>
              <div>
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                  P&L
                </div>
                <div
                  className={`font-mono text-2xl ${
                    pnl >= 0
                      ? 'text-accent-green glow-text-green'
                      : 'text-accent-red glow-text-red'
                  }`}
                >
                  {pnl >= 0 ? '+' : ''}
                  <AnimatedNumber value={pnl} prefix="$" decimals={2} />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="font-mono text-xs text-foreground-muted">
                Return: {formatPercent(pnlPercent, true)}
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent-green transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pnlPercent * 2))}%` }}
                />
              </div>
            </div>
          </div>

          {/* NAV Info */}
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
              Fund Snapshot
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-mono text-xs text-foreground-muted">NAV</span>
                <span className="font-mono text-sm text-accent-cyan">
                  ${state.nav.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-xs text-foreground-muted">TVL</span>
                <span className="font-mono text-sm text-foreground">
                  {formatCompactUsd(state.totalValueLocked)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-xs text-foreground-muted">
                  Inception Return
                </span>
                <span className="font-mono text-sm text-accent-green">
                  +{state.sinceInceptionReturn.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-lg border border-border bg-surface p-6 lg:col-span-2">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
              Transactions
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded border border-border bg-background p-4">
                <div className="mb-3 font-mono text-sm text-foreground">Deposit</div>
                <div className="mb-3 font-mono text-xs text-foreground-muted">
                  Deposit AVAX or USDC to mint NULLBOSS shares at current NAV.
                </div>
                <button
                  type="button"
                  className="w-full rounded bg-accent-cyan px-4 py-2 font-mono text-xs font-medium text-black transition-opacity hover:opacity-90"
                >
                  [ Deposit ]
                </button>
              </div>
              <div className="rounded border border-border bg-background p-4">
                <div className="mb-3 font-mono text-sm text-foreground">Withdraw</div>
                <div className="mb-3 font-mono text-xs text-foreground-muted">
                  Redeem shares for pro-rata share of vault assets at current NAV.
                </div>
                <button
                  type="button"
                  className="w-full rounded border border-accent-red px-4 py-2 font-mono text-xs font-medium text-accent-red transition-colors hover:bg-accent-red-dim"
                >
                  [ Withdraw ]
                </button>
              </div>
            </div>
          </div>

          {/* Wallet Info */}
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
              Wallet
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-mono text-xs text-foreground-muted">
                  Address
                </span>
                <span className="font-mono text-xs text-foreground">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-xs text-foreground-muted">
                  AVAX Balance
                </span>
                <span className="font-mono text-xs text-foreground">
                  {balance ? `${parseFloat(balance.formatted).toFixed(4)} AVAX` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-xs text-foreground-muted">
                  Network
                </span>
                <span className="font-mono text-xs text-accent-cyan">
                  Avalanche C-Chain
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
