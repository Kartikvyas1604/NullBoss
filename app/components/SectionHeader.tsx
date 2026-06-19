interface SectionHeaderProps {
  title: string
  subtitle?: string
  accent?: 'cyan' | 'green' | 'red' | 'amber'
}

const ACCENT_BORDERS = {
  cyan: 'bg-accent-cyan',
  green: 'bg-accent-green',
  red: 'bg-accent-red',
  amber: 'bg-accent-amber',
}

export function SectionHeader({ title, subtitle, accent = 'cyan' }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <div className={`mb-2 h-0.5 w-8 ${ACCENT_BORDERS[accent]}`} />
      <h2 className="font-display text-xl tracking-tight text-foreground">{title}</h2>
      {subtitle && (
        <p className="mt-1 font-mono text-xs text-foreground-muted">{subtitle}</p>
      )}
    </div>
  )
}
