'use client'

import { useEffect, useState } from 'react'

const BOOT_LINES = [
  { msg: '[OK]   Initializing NULLBOSS kernel...', delay: 0 },
  { msg: '[OK]   Mounting agent runtime environment...', delay: 200 },
  { msg: '[OK]   Loading ORACLE parent intelligence...', delay: 450 },
  { msg: '[OK]   Establishing on-chain connection (Avalanche C-Chain)', delay: 700 },
  { msg: '[OK]   Spawning sub-agents [ARBITRAGE, TREND, LIQUIDATION]', delay: 1000 },
  { msg: '[OK]   Syncing NAV oracle feed...', delay: 1300 },
  { msg: '[OK]   Fund is live. No human in the loop.', delay: 1600 },
]

export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState<number>(0)

  useEffect(() => {
    const timers = BOOT_LINES.map((line, i) =>
      setTimeout(() => {
        setVisibleLines(i + 1)
        if (i === BOOT_LINES.length - 1) {
          setTimeout(onComplete, 600)
        }
      }, line.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <div className="w-full max-w-xl px-6">
        <div className="mb-6 font-mono text-xs tracking-[0.2em] text-accent-cyan">
          NULLBOSS v0.1.0 — BOOT SEQUENCE
        </div>
        <div className="space-y-1.5">
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className={`font-mono text-xs ${
                line.msg.startsWith('[OK]') ? 'text-accent-green' : 'text-foreground-muted'
              }`}
            >
              {line.msg}
            </div>
          ))}
          {visibleLines <= BOOT_LINES.length && (
            <div className="font-mono text-xs text-foreground-muted animate-pulse">
              _
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
