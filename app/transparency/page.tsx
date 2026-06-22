'use client'

import { useNavHistory } from '@/app/hooks/useNavHistory'
import { HeartbeatIndicator } from '@/app/components/HeartbeatIndicator'
import { SectionHeader } from '@/app/components/SectionHeader'
import { formatUsd, formatDate } from '@/app/lib/formatters'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function TransparencyPage() {
  const { data, isLoading, notDeployed } = useNavHistory(365)

  const endNav = data.length > 0 ? data[data.length - 1].nav : 0
  const peak = data.reduce((max, p) => Math.max(max, p.nav), endNav)
  const trough = data.reduce((min, p) => Math.min(min, p.nav), endNav || Infinity)
  const totalReturn = endNav > 0 && data[0]?.nav > 0 ? ((endNav - data[0].nav) / data[0].nav) * 100 : 0
  const maxDrawdown = peak > 0 ? ((trough - peak) / peak) * 100 : 0

  return (
    <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <SectionHeader title="Track Record" subtitle="On-chain proof-of-performance — every number is verifiable" accent="cyan" />
        <HeartbeatIndicator />
      </div>

      {notDeployed ? (
        <div className="grid-bg flex flex-col items-center justify-center rounded-lg border border-border p-8 text-center sm:p-16">
          <div className="mb-4 font-mono text-4xl text-foreground-muted">[ ]</div>
          <p className="font-mono text-sm text-foreground-muted">
            Fund not yet deployed
          </p>
          <p className="mt-1 font-mono text-xs text-foreground-muted">
            Performance data will appear once the vault contract is deployed and accumulating history.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-surface p-3 sm:p-4">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                Total Return
              </div>
              <div className={`font-mono text-xl sm:text-2xl ${totalReturn >= 0 ? 'text-accent-green glow-text-green' : 'text-accent-red'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3 sm:p-4">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                Peak NAV
              </div>
              <div className="font-mono text-xl text-accent-cyan sm:text-2xl">
                {formatUsd(peak)}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3 sm:p-4">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                Current NAV
              </div>
              <div className="font-mono text-xl text-foreground sm:text-2xl">
                {formatUsd(endNav)}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3 sm:p-4">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                Max Drawdown
              </div>
              <div className="font-mono text-xl text-accent-red sm:text-2xl">
                {maxDrawdown.toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-surface p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
                NAV
              </h2>
              {data.length > 1 && (
                <span className="font-mono text-[10px] text-foreground-muted">
                  {formatDate(data[0].timestamp)} — {formatDate(data[data.length - 1].timestamp)}
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="flex h-80 items-center justify-center font-mono text-xs text-foreground-muted animate-pulse">
                LOADING CHART DATA...
              </div>
            ) : (
              <div className="h-56 w-full sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="navGradientFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4DD8E8" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#4DD8E8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatDate}
                      stroke="#25262A"
                      tick={{ fill: '#787980', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={60}
                    />
                    <YAxis
                      domain={['dataMin - 15', 'dataMax + 15']}
                      tickFormatter={(v) => `$${v.toFixed(0)}`}
                      stroke="#25262A"
                      tick={{ fill: '#787980', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1A1B1E',
                        border: '1px solid #25262A',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                      }}
                      labelFormatter={(label: unknown) => formatDate(Number(label))}
                      formatter={(value) => [formatUsd(Number(value)), 'NAV']}
                    />
                    <Area
                      type="monotone"
                      dataKey="nav"
                      stroke="#4DD8E8"
                      strokeWidth={1.5}
                      fill="url(#navGradientFull)"
                      dot={false}
                      isAnimationActive={true}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-lg border border-border bg-surface p-6">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
              Fee Structure Enforcement
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 font-mono text-sm text-foreground">Management Fee</div>
                <div className="font-mono text-xs leading-relaxed text-foreground-muted">
                  2% annually, accrued continuously on-chain.
                  Calculated as a daily drip of (AUM × 0.02 / 365). No human can
                  waive or modify this rate — it is enforced by the vault contract.
                </div>
                <div className="mt-2 font-mono text-[10px] text-accent-green">
                  ● Enforced at contract level
                </div>
              </div>
              <div>
                <div className="mb-2 font-mono text-sm text-foreground">Performance Fee</div>
                <div className="font-mono text-xs leading-relaxed text-foreground-muted">
                  20% of profits above the high-water mark,
                  calculated every 28 days. The high-water mark is stored
                  on-chain and can only increase — never reset by a manager.
                </div>
                <div className="mt-2 font-mono text-[10px] text-accent-green">
                  ● High-water mark: Enabled
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
