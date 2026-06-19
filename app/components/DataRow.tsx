interface DataRowProps {
  label: string
  value: string
  valueColor?: string
}

export function DataRow({ label, value, valueColor = 'text-foreground' }: DataRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="font-mono text-xs text-foreground-muted">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${valueColor}`}>{value}</span>
    </div>
  )
}
