'use client'

import { useAgentStatus } from '@/app/hooks/useAgentStatus'
import { HeartbeatIndicator } from '@/app/components/HeartbeatIndicator'
import { formatCompactUsd } from '@/app/lib/formatters'

const AGENT_COLORS = {
  cyan: { border: 'border-accent-cyan', glow: 'glow-cyan', bg: 'bg-accent-cyan-dim' },
  green: { border: 'border-accent-green', glow: 'glow-green', bg: 'bg-accent-green-dim' },
  amber: { border: 'border-accent-amber', glow: '', bg: 'bg-accent-amber/10' },
  red: { border: 'border-accent-red', glow: 'glow-red', bg: 'bg-accent-red-dim' },
} as const

const AGENT_STROKES = {
  cyan: '#4DD8E8',
  green: '#39FF88',
  amber: '#FFB84D',
  red: '#E84142',
} as const

function AgentNode({
  agent,
  isParent = false,
}: {
  agent: { id: string; name: string; role: string; status: string; feesGenerated: number; tradesExecuted: number; color: keyof typeof AGENT_COLORS }
  isParent?: boolean
}) {
  const colors = AGENT_COLORS[agent.color]

  return (
    <div
      className={`relative flex flex-col items-center ${
        isParent ? '' : 'cursor-pointer'
      }`}
    >
      <div
        className={`relative flex items-center justify-center rounded-full border-2 ${colors.border} ${colors.glow} ${
          isParent ? 'h-28 w-28 md:h-36 md:w-36' : 'h-24 w-24 md:h-28 md:w-28'
        } ${colors.bg} transition-all duration-500`}
      >
        <div className="text-center">
          <div
            className={`font-mono font-bold tracking-wider ${
              isParent ? 'text-sm md:text-base' : 'text-[10px] md:text-xs'
            }`}
            style={{ color: AGENT_STROKES[agent.color] }}
          >
            {agent.name}
          </div>
        </div>
        {agent.status === 'active' && (
          <span
            className={`absolute -right-1 -top-1 h-3 w-3 rounded-full ${
              isParent ? 'bg-accent-green heartbeat' : 'bg-accent-green'
            }`}
          />
        )}
      </div>
      <div className="mt-2 text-center">
        <div
          className={`font-mono text-[10px] uppercase tracking-wider ${
            agent.status === 'active'
              ? 'text-accent-green'
              : 'text-foreground-muted'
          }`}
        >
          {agent.status === 'active' ? '● ACTIVE' : '○ IDLE'}
        </div>
        {!isParent && (
          <div className="mt-2 font-mono text-[10px] text-foreground-muted">
            {formatCompactUsd(agent.feesGenerated)} fees · {agent.tradesExecuted} trades
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const { agents, isLoading } = useAgentStatus()
  const parent = agents.find((a) => a.parentId === null)
  const subAgents = agents.filter((a) => a.parentId !== null)

  if (isLoading) {
    return (
      <main className="mx-auto flex max-w-7xl flex-1 items-center justify-center px-4">
        <div className="font-mono text-xs text-foreground-muted animate-pulse">
          INITIALIZING AGENT NETWORK...
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Agent Network</h1>
          <p className="mt-1 font-mono text-xs text-foreground-muted">
            Hierarchical intelligence — one parent, three specialized sub-agents
          </p>
        </div>
        <HeartbeatIndicator />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center py-8">
        {/* SVG connecting lines */}
        <svg
          className="absolute inset-0 h-full w-full"
          style={{ pointerEvents: 'none' }}
        >
          <defs>
            {Object.entries(AGENT_STROKES).map(([key, color]) => (
              <linearGradient key={key} id={`line-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                <stop offset="100%" stopColor={color} stopOpacity={0.15} />
              </linearGradient>
            ))}
          </defs>

          {/* Lines from parent to each sub-agent */}
          {subAgents.map((agent, i) => {
            const cx = 50
            const parentY = 12
            const childX = 8 + i * 28
            const childY = 52
            return (
              <g key={agent.id}>
                <line
                  x1={`${cx}%`}
                  y1={`${parentY}%`}
                  x2={`${childX + 12}%`}
                  y2={`${childY - 4}%`}
                  stroke={`url(#line-${agent.color})`}
                  strokeWidth={1.5}
                  opacity={0.4}
                />
                <line
                  x1={`${cx}%`}
                  y1={`${parentY}%`}
                  x2={`${childX + 12}%`}
                  y2={`${childY - 4}%`}
                  stroke={AGENT_STROKES[agent.color]}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  className="signal-line"
                  opacity={agent.status === 'active' ? 0.8 : 0.3}
                />
              </g>
            )
          })}
        </svg>

        {/* Parent Agent */}
        <div className="relative z-10 mb-12">
          {parent && <AgentNode agent={parent} isParent />}
        </div>

        {/* Sub-agents row */}
        <div className="relative z-10 grid w-full max-w-2xl grid-cols-3 gap-4 md:gap-8">
          {subAgents.map((agent) => (
            <div key={agent.id} className="flex justify-center">
              <div className="flex flex-col items-center">
                <AgentNode agent={agent} />
                <div className="mt-3 text-center">
                  <div className="font-mono text-[10px] leading-tight text-foreground-muted">
                    {agent.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        <div className="relative z-10 mt-16 grid w-full max-w-lg grid-cols-3 gap-4 rounded-lg border border-border bg-surface p-4">
          <div className="text-center">
            <div className="font-mono text-lg text-accent-cyan">4</div>
            <div className="font-mono text-[10px] uppercase text-foreground-muted">
              Agents
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono text-lg text-accent-green">
              {agents.filter((a) => a.status === 'active').length}
            </div>
            <div className="font-mono text-[10px] uppercase text-foreground-muted">
              Active
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono text-lg text-foreground">
              {agents.reduce((s, a) => s + a.tradesExecuted, 0)}
            </div>
            <div className="font-mono text-[10px] uppercase text-foreground-muted">
              Total Trades
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
