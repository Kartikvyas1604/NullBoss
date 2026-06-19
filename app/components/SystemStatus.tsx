'use client'

export function SystemStatus() {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded border border-border bg-surface/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider backdrop-blur-sm">
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-green heartbeat" />
      </span>
      <span className="text-accent-green">AI Online</span>
      <span className="text-foreground-muted">·</span>
      <span className="text-foreground-muted">Avalanche C-Chain</span>
    </div>
  )
}
