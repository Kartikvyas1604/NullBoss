'use client'

import { useEffect, useState, useRef } from 'react'
import {
  checkChainConnection,
  checkVault,
  checkRegistry,
  checkFundIsLive,
  type BootCheckResult,
} from '@/app/lib/contracts'

interface BootLine {
  label: string
  check: () => Promise<BootCheckResult>
}

const BOOT_CHECKS: BootLine[] = [
  { label: 'Initializing NULLBOSS kernel...', check: async () => ({ label: 'Kernel initialized', ok: true, latency: 0 }) },
  { label: 'Mounting agent runtime environment...', check: async () => ({ label: 'Runtime mounted', ok: true, latency: 0 }) },
  { label: 'Loading ORACLE parent intelligence...', check: async () => ({ label: 'Oracle intelligence loaded', ok: true, latency: 0 }) },
  { label: 'Establishing on-chain connection (Avalanche C-Chain)', check: checkChainConnection },
  { label: 'Spawning sub-agents', check: checkRegistry },
  { label: 'Syncing NAV oracle feed...', check: checkVault },
  { label: 'Finalizing fund status...', check: checkFundIsLive },
]

type LineState = { status: 'pending' | 'running' | 'ok' | 'fail'; result?: BootCheckResult }

export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [lines, setLines] = useState<LineState[]>(() =>
    BOOT_CHECKS.map(() => ({ status: 'pending' as const }))
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (currentIndex >= BOOT_CHECKS.length) return

    const check = BOOT_CHECKS[currentIndex]

    setLines((prev) => {
      const next = [...prev]
      next[currentIndex] = { status: 'running' }
      return next
    })

    check.check().then((result) => {
      if (!mounted.current) return
      setLines((prev) => {
        const next = [...prev]
        next[currentIndex] = {
          status: result.ok ? 'ok' : 'fail',
          result,
        }
        return next
      })
      const delay = result.ok ? 200 : 600
      setTimeout(() => {
        if (mounted.current) setCurrentIndex((i) => i + 1)
      }, delay)
    })
  }, [currentIndex])

  const allDone = currentIndex >= BOOT_CHECKS.length
  const hasFailure = lines.some((l) => l.status === 'fail')

  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(onComplete, hasFailure ? 2000 : 800)
      return () => clearTimeout(timer)
    }
  }, [allDone, hasFailure, onComplete])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background crt-boot">
      <div className="relative w-full max-w-xl px-6">
        {/* Background nav links ghosted behind */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
          <div className="flex gap-8 font-mono text-2xl tracking-[0.3em] text-foreground uppercase select-none">
            <span>SNOWTRACE</span>
            <span>DOCS</span>
            <span>GITHUB</span>
          </div>
        </div>

        <div className="relative mb-6 font-mono text-xs tracking-[0.2em] text-accent-cyan">
          NULLBOSS v0.1.0 — BOOT SEQUENCE
        </div>

        <div className="space-y-1.5">
          {lines.map((line, i) => (
            <BootLineItem key={i} line={line} index={i} />
          ))}
          {!allDone && (
            <div className="font-mono text-xs text-foreground-muted crt-cursor">_</div>
          )}
        </div>

        {allDone && !hasFailure && (
          <div className="mt-6 font-mono text-xs text-accent-cyan/70 italic">
            All systems nominal. Entering live mode...
          </div>
        )}

        {allDone && hasFailure && (
          <div className="mt-6 font-mono text-xs text-accent-red glow-text-red">
            [WARN] Some subsystems unreachable — running in degraded mode.
          </div>
        )}
      </div>
    </div>
  )
}

function BootLineItem({ line, index }: { line: LineState; index: number }) {
  const [showCursor, setShowCursor] = useState(true)
  const isLatest = line.status === 'running'

  useEffect(() => {
    if (!isLatest) return
    const interval = setInterval(() => setShowCursor((c) => !c), 400)
    return () => clearInterval(interval)
  }, [isLatest])

  const prefix = line.status === 'ok' ? '[OK]' : line.status === 'fail' ? '[FAIL]' : line.status === 'running' ? '[..]' : '[  ]'

  const textColor =
    line.status === 'ok' ? 'text-foreground-muted' :
    line.status === 'fail' ? 'text-accent-red' :
    line.status === 'running' ? 'text-accent-cyan' :
    'text-foreground-muted/30'

  const latencyStr = line.result?.latency != null && line.result.latency > 0
    ? ` (${line.result.latency}ms)`
    : ''

  const glowClass = line.status === 'fail' ? 'glow-text-red' : ''

  return (
    <div className="group flex items-start font-mono text-xs">
      <span className={`shrink-0 w-8 tracking-wider ${textColor} ${glowClass} transition-all duration-300`}>
        {prefix}
      </span>
      <span className={`flex-1 ${textColor} ${glowClass} transition-all duration-300`}>
        {line.status === 'running'
          ? <span>{BOOT_CHECKS[index]?.label || ''}{showCursor ? '...' : '   '}</span>
          : line.result
            ? <span>{line.result.label}{latencyStr}</span>
            : <span>{BOOT_CHECKS[index]?.label || ''}</span>
        }
      </span>
      {line.status === 'ok' && (
        <span className="shrink-0 text-accent-cyan/50 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
          ✓
        </span>
      )}
    </div>
  )
}
