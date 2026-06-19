'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
}

export function AnimatedNumber({
  value,
  decimals = 2,
  prefix = '',
  suffix = '',
  duration = 600,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value)
  const frameRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const fromRef = useRef(value)

  useEffect(() => {
    const from = fromRef.current
    const diff = value - from
    if (Math.abs(diff) < 0.001) return

    const startTime = performance.now()
    fromRef.current = value

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + diff * eased)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration])

  return (
    <span className="font-mono tabular-nums tracking-tight">
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  )
}
