export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-border ${className}`}
    />
  )
}

export function SkeletonLine({ width = 'w-full' }: { width?: string }) {
  return <Skeleton className={`h-3 ${width}`} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="mb-2 h-8 w-32" />
      <Skeleton className="h-3 w-48" />
    </div>
  )
}
