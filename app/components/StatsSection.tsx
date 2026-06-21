'use client'

import { NavTicker } from './NavTicker'
import { SharePriceChart } from './SharePriceChart'

export function StatsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-8">
        <NavTicker />
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
              Historical NAV
            </span>
          </div>
          <SharePriceChart />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">
          <h2 className="mb-4 font-display text-lg tracking-tight sm:text-xl">Fee Structure</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="font-mono text-sm text-foreground">Management Fee</div>
                <div className="font-mono text-xs text-foreground-muted">
                  Paid annually from AUM
                </div>
              </div>
              <div className="font-mono text-lg text-accent-cyan">2%</div>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="font-mono text-sm text-foreground">Performance Fee</div>
                <div className="font-mono text-xs text-foreground-muted">
                  On profits above high-water mark
                </div>
              </div>
              <div className="font-mono text-lg text-accent-amber">20%</div>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="font-mono text-sm text-foreground">Fee Period</div>
                <div className="font-mono text-xs text-foreground-muted">
                  Performance fee calculated every
                </div>
              </div>
              <div className="font-mono text-lg text-foreground">28 days</div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-sm text-foreground">High-Water Mark</div>
                <div className="font-mono text-xs text-foreground-muted">
                  Fee only on new highs
                </div>
              </div>
              <div className="font-mono text-lg text-accent-green">Active</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">
          <h2 className="mb-4 font-display text-lg tracking-tight sm:text-xl">How It Works</h2>
          <div className="space-y-4">
            {[
              {
                step: '01',
                title: 'Buy Shares',
                desc: 'Deposit AVAX or USDC into the fund vault. Receive NULLBOSS intelligence shares representing your ownership.',
              },
              {
                step: '02',
                title: 'AI Manages',
                desc: 'The ORACLE parent agent allocates capital across sub-agents — arbitrage, trend-following, and liquidation hunting.',
              },
              {
                step: '03',
                title: 'Fees Accrue',
                desc: '2% management fee drips continuously. 20% performance fee applies only when NAV exceeds the high-water mark.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-accent-red">
                  [{item.step}]
                </span>
                <div>
                  <div className="font-mono text-sm text-foreground">{item.title}</div>
                  <div className="font-mono text-xs text-foreground-muted">
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
