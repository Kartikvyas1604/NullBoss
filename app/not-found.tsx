import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-7xl flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="font-mono text-4xl text-foreground-muted sm:text-6xl">404</div>
      <h1 className="mt-4 font-display text-xl tracking-tight sm:text-2xl">Signal Lost</h1>
      <p className="mt-2 font-mono text-xs text-foreground-muted sm:text-sm">
        This page does not exist. The agents found nothing here.
      </p>
      <Link
        href="/"
        className="mt-8 rounded border border-accent-cyan px-6 py-2 font-mono text-xs uppercase tracking-wider text-accent-cyan transition-colors hover:bg-accent-cyan-dim"
      >
        Return to Terminal
      </Link>
    </main>
  )
}
