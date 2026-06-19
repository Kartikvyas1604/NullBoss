interface StatusBadgeProps {
  status: 'active' | 'idle' | 'error' | 'live' | 'standby'
}

const STATUS_STYLES = {
  active: 'text-accent-green border-accent-green/30 bg-accent-green-dim',
  live: 'text-accent-green border-accent-green/30 bg-accent-green-dim',
  idle: 'text-foreground-muted border-border bg-surface',
  standby: 'text-foreground-muted border-border bg-surface',
  error: 'text-accent-red border-accent-red/30 bg-accent-red-dim',
} as const

const STATUS_LABELS = {
  active: '● ACTIVE',
  live: '● LIVE',
  idle: '○ IDLE',
  standby: '○ STANDBY',
  error: '● ERROR',
} as const

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
