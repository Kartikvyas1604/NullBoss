'use client'

import { NetworkBackground } from './NetworkBackground'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="grid-bg absolute inset-0 opacity-40" />
      <NetworkBackground />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

      {/* Scanline accent bar */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-cyan to-transparent opacity-30" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="reveal mb-6 flex items-center justify-center gap-3">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-green heartbeat" />
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-accent-green">
              Autonomous — On-Chain — Alive
            </span>
          </div>

          <h1 className="reveal reveal-delay-1 font-display text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            The Fund That
            <br />
            <span className="text-accent-red glow-text-red">Has No Boss</span>
          </h1>

          <p className="reveal reveal-delay-2 mt-6 font-mono text-sm leading-relaxed text-foreground-muted sm:text-base">
            No managers. No emotions. No sleep.
            <br />
            An autonomous intelligence managing DeFi positions on Avalanche C-Chain.
            <br />
            Every trade. Every fee. Every heartbeat — on-chain and verifiable.
          </p>

          <div className="reveal reveal-delay-3 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-2 text-center font-mono text-xs text-foreground-muted">
              <span className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
                2% Management
              </span>
              <span className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-amber" />
                20% Performance
              </span>
              <span className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan" />
                High-Water Mark
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
