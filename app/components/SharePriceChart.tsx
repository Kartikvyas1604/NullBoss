'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useNavHistory } from '@/app/hooks/useNavHistory'
import { formatUsd, formatDate } from '@/app/lib/formatters'

export function SharePriceChart() {
  const { data, isLoading } = useNavHistory()

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-xs text-foreground-muted">
        BOOTING CHART...
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4DD8E8" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#4DD8E8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatDate}
            stroke="#25262A"
            tick={{ fill: '#787980', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={['dataMin - 10', 'dataMax + 10']}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            stroke="#25262A"
            tick={{ fill: '#787980', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: '#1A1B1E',
              border: '1px solid #25262A',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono',
            }}
            labelFormatter={(label: unknown) => formatDate(Number(label))}
            formatter={(value) => [formatUsd(Number(value)), 'NAV']}
          />
          <Area
            type="monotone"
            dataKey="nav"
            stroke="#4DD8E8"
            strokeWidth={1.5}
            fill="url(#navGradient)"
            dot={false}
            isAnimationActive={true}
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
