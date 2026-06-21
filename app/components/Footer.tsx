export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm tracking-wider">
            NULL<span className="text-accent-red">BOSS</span>
          </span>
          <span className="font-mono text-[10px] text-foreground-muted">
            v0.1.0 — On Avalanche C-Chain
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <a
            href="https://snowtrace.io"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted transition-colors hover:text-foreground"
          >
            Snowtrace
          </a>
          <a
            href="#"
            className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted transition-colors hover:text-foreground"
          >
            Docs
          </a>
          <a
            href="#"
            className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>

        <div className="font-mono text-[10px] text-foreground-muted">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-red animate-pulse" />
            No managers. No emotions. No sleep.
          </span>
        </div>
      </div>
    </footer>
  )
}
