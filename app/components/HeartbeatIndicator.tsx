'use client'

export function HeartbeatIndicator() {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs text-accent-green">
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-green heartbeat" />
      </span>
      SYSTEM ACTIVE
    </span>
  )
}
