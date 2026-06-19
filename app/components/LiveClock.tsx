'use client'

import { useEffect, useState } from 'react'

export function LiveClock() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) return null

  return (
    <span className="font-mono text-[10px] text-foreground-muted tabular-nums">
      {time.toLocaleTimeString('en-US', { hour12: false })}
    </span>
  )
}
