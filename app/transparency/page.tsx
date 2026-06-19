'use client'

import { useNavHistory } from '@/app/hooks/useNavHistory'
import { HeartbeatIndicator } from '@/app/components/HeartbeatIndicator'
import { SectionHeader } from '@/app/components/SectionHeader'
import { MOCK_CONTRACTS, FEE_STRUCTURE } from '@/app/data/mockData'
import { formatUsd, formatDate, formatCompactUsd } from '@/app/lib/formatters'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function TransparencyPage() {
  const { data, isLoading } = useNavHistory(365)

  const startNav = data.length > 0 ? data[0].nav : 100
  const endNav = data.length > 0 ? data[data.length - 1].nav : 100
  const totalReturn = ((endNav - startNav) / startNav) * 100
  const peak = data.reduce((max, p) => Math.max(max, p.nav), 0)
  const trough = data.reduce((min, p) => Math.min(min, p.nav), startNav)
  const maxDrawdown = ((trough - peak) / peak) * 100

  return (
    <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <SectionHeader title="Track Record" subtitle="On-chain proof-of-performance — every number is verifiable" accent="cyan" />
        <HeartbeatIndicator />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Performance metrics */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
            Total Return
          </div>
          <div className="font-mono text-2xl text-accent-green glow-text-green">
            +{totalReturn.toFixed(2)}%
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
            Peak NAV
          </div>
          <div className="font-mono text-2xl text-accent-cyan">
            {formatUsd(peak)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
            Current NAV
          </div>
          <div className="font-mono text-2xl text-foreground">
            {formatUsd(endNav)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
            Max Drawdown
          </div>
          <div className="font-mono text-2xl text-accent-red">
            {maxDrawdown.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Full NAV Chart */}
      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
            Historical NAV Curve (1 Year)
          </h2>
          <span className="font-mono text-[10px] text-foreground-muted">
            {data.length > 0 ? `${formatDate(data[0].timestamp)} — ${formatDate(data[data.length - 1].timestamp)}` : ''}
          </span>
        </div>
        {isLoading ? (
          <div className="flex h-80 items-center justify-center font-mono text-xs text-foreground-muted animate-pulse">
            LOADING CHART DATA...
          </div>
        ) : (
          <div className="h-80 w-full">
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
                  tick={{
                    fill: '#787980',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                  }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={60}
                />
                <YAxis
                  domain={['dataMin - 15', 'dataMax + 15']}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                  stroke="#25262A"
                  tick={{
                    fill: '#787980',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                  }}
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
                  labelFormatter={formatDate}
                  formatter={(value: number) => [formatUsd(value), 'NAV']}
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

      {/* Contracts & Audits */}
      <div className="mt-6">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
          Verified Contracts
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {MOCK_CONTRACTS.map((contract) => (
            <div
              key={contract.address}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="mb-2 font-mono text-sm text-accent-cyan">
                {contract.name}
              </div>
              <div className="mb-3 font-mono text-[10px] leading-relaxed text-foreground-muted">
                {contract.description}
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-[10px] text-foreground-muted">
                  {contract.address.slice(0, 10)}...{contract.address.slice(-6)}
                </span>
              </div>
              <a
                href={contract.auditUrl}
                className="font-mono text-[10px] text-accent-cyan underline underline-offset-2 hover:text-accent-green transition-colors"
              >
                View Audit Report ↗
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Fee Structure Detail */}
      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
          Fee Structure Enforcement
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-2 font-mono text-sm text-foreground">Management Fee</div>
            <div className="font-mono text-xs leading-relaxed text-foreground-muted">
              {FEE_STRUCTURE.managementFee}% annually, accrued continuously on-chain.
              Calculated as a daily drip of (AUM × 0.02 / 365). No human can
              waive or modify this rate — it is enforced by the vault contract.
            </div>
            <div className="mt-2 font-mono text-[10px] text-accent-green">
              ● Enforced at contract level
            </div>
          </div>
          <div>
            <div className="mb-2 font-mono text-sm text-foreground">
              Performance Fee
            </div>
            <div className="font-mono text-xs leading-relaxed text-foreground-muted">
              {FEE_STRUCTURE.performanceFee}% of profits above the high-water mark,
              calculated every {FEE_STRUCTURE.performanceFeePeriod}. The
              high-water mark is stored on-chain and can only increase — never
              reset by a manager.
            </div>
            <div className="mt-2 font-mono text-[10px] text-accent-green">
              ● High-water mark: {FEE_STRUCTURE.highWaterMark ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
