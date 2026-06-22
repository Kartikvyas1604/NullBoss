'use client'

import { useEffect, useRef } from 'react'
import { useAgentStatus } from '@/app/hooks/useAgentStatus'
import { HeartbeatIndicator } from '@/app/components/HeartbeatIndicator'
import { SectionHeader } from '@/app/components/SectionHeader'
import { StatusBadge } from '@/app/components/StatusBadge'
import { formatCompactUsd } from '@/app/lib/formatters'

const AGENT_COLORS = {
  cyan: { border: 'border-accent-cyan', glow: 'glow-cyan', bg: 'bg-accent-cyan-dim' },
  green: { border: 'border-accent-green', glow: 'glow-green', bg: 'bg-accent-green-dim' },
  amber: { border: 'border-accent-amber', glow: '', bg: 'bg-accent-amber/10' },
  red: { border: 'border-accent-red', glow: 'glow-red', bg: 'bg-accent-red-dim' },
} as const

const AGENT_STROKES: Record<string, string> = {
  cyan: '#4DD8E8',
  green: '#39FF88',
  amber: '#FFB84D',
  red: '#E84142',
} as const

function AgentNode({
  agent,
  isParent = false,
}: {
  agent: { id: string; name: string; role: string; status: string; feesGenerated: number; tradesExecuted: number; color: string }
  isParent?: boolean
}) {
  const colors = AGENT_COLORS[agent.color as keyof typeof AGENT_COLORS]

  return (
    <div className="relative flex flex-col items-center">
      <div
        className={`relative flex items-center justify-center rounded-full border-2 ${colors.border} ${colors.glow} ${
          isParent ? 'h-24 w-24 sm:h-28 sm:w-28 md:h-36 md:w-36' : 'h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28'
        } ${colors.bg} transition-all duration-500`}
      >
        <div className="text-center">
          <div
            className={`font-mono font-bold tracking-wider ${
              isParent ? 'text-xs sm:text-sm md:text-base' : 'text-[9px] sm:text-[10px] md:text-xs'
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
            agent.status === 'active' ? 'text-accent-green' : 'text-foreground-muted'
          }`}
        >
          {agent.status === 'active' ? '● ACTIVE' : '○ IDLE'}
        </div>
        {!isParent && (
          <div className="mt-2 font-mono text-[10px] text-foreground-muted">
            {agent.tradesExecuted} trades
          </div>
        )}
      </div>
    </div>
  )
}

function ConnectingLines({ agents }: { agents: { id: string; color: string; status: string }[] }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    function redraw() {
      if (!svgRef.current) return
      const svg = svgRef.current
      const rect = svg.getBoundingClientRect()
      svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`)
    }
    redraw()
    window.addEventListener('resize', redraw)
    return () => window.removeEventListener('resize', redraw)
  }, [])

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 hidden h-full w-full sm:block"
      style={{ pointerEvents: 'none' }}
      preserveAspectRatio="none"
    >
      <defs>
        {Object.entries(AGENT_STROKES).map(([key, color]) => (
          <linearGradient key={key} id={`org-line-${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0.1} />
          </linearGradient>
        ))}
      </defs>

      {agents.map((agent, i) => (
        <g key={agent.id}>
          <line
            x1="50%"
            y1="22%"
            x2={`${20 + i * 30}%`}
            y2="62%"
            stroke={`url(#org-line-${agent.color})`}
            strokeWidth={1.5}
            opacity={0.35}
          />
          <line
            x1="50%"
            y1="22%"
            x2={`${20 + i * 30}%`}
            y2="62%"
            stroke={AGENT_STROKES[agent.color]}
            strokeWidth={1}
            strokeDasharray="4 4"
            className="signal-line"
            opacity={agent.status === 'active' ? 0.7 : 0.2}
          />
          <circle
            cx={`${20 + i * 30}%`}
            cy="62%"
            r="42"
            fill="none"
            stroke={AGENT_STROKES[agent.color]}
            strokeWidth={0.5}
            opacity={0.15}
          />
        </g>
      ))}
    </svg>
  )
}

export default function AgentsPage() {
  const { agents, isLoading, notDeployed } = useAgentStatus()
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

  if (notDeployed) {
    return (
      <main className="mx-auto flex max-w-7xl flex-1 flex-col items-center justify-center px-4">
        <div className="grid-bg flex flex-col items-center justify-center rounded-lg border border-border p-8 text-center sm:p-16">
          <div className="mb-4 font-mono text-4xl text-foreground-muted">[ ]</div>
          <p className="font-mono text-sm text-foreground-muted">
            Agent Registry not yet deployed
          </p>
          <p className="mt-1 font-mono text-xs text-foreground-muted">
            Once the AgentRegistry contract is deployed, agent hierarchy will display here.
          </p>
        </div>
      </main>
    )
  }

  if (agents.length === 0) {
    return (
      <main className="mx-auto flex max-w-7xl flex-1 flex-col items-center justify-center px-4">
        <div className="grid-bg flex flex-col items-center justify-center rounded-lg border border-border p-8 text-center sm:p-16">
          <div className="mb-4 font-mono text-4xl text-foreground-muted">[~]</div>
          <p className="font-mono text-sm text-foreground-muted">
            No agents registered yet
          </p>
          <p className="mt-1 font-mono text-xs text-foreground-muted">
            Agents will appear here once they register on-chain.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <SectionHeader title="Agent Network" subtitle="On-chain agent hierarchy — registered via AgentRegistry" accent="cyan" />
        <HeartbeatIndicator />
      </div>

      <div className="relative flex min-h-[400px] flex-1 flex-col items-center justify-center rounded-lg border border-border bg-surface/30 py-12 sm:min-h-[500px]">
        <ConnectingLines agents={subAgents} />

        {parent && (
          <div className="relative z-10 mb-16">
            <div className="flex flex-col items-center">
              <AgentNode agent={parent} isParent />
              <div className="mt-3 text-center">
                <div className="font-mono text-xs leading-tight text-accent-cyan">
                  {parent.role}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3 md:gap-8">
          {subAgents.map((agent) => (
            <div key={agent.id} className="flex justify-center">
              <div className="flex flex-col items-center">
                <AgentNode agent={agent} />
                <div className="mt-3 max-w-[180px] text-center sm:max-w-[140px]">
                  <div className="font-mono text-[10px] leading-tight text-foreground-muted">
                    {agent.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-16 grid w-full max-w-lg grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
          <div className="bg-surface p-4 text-center">
            <div className="font-mono text-lg text-accent-cyan">{agents.length}</div>
            <div className="font-mono text-[10px] uppercase text-foreground-muted">Agents</div>
          </div>
          <div className="bg-surface p-4 text-center">
            <div className="font-mono text-lg text-accent-green">
              {agents.filter((a) => a.status === 'active').length}
            </div>
            <div className="font-mono text-[10px] uppercase text-foreground-muted">Active</div>
          </div>
          <div className="bg-surface p-4 text-center">
            <div className="font-mono text-lg text-foreground">
              {agents.reduce((s, a) => s + a.tradesExecuted, 0)}
            </div>
            <div className="font-mono text-[10px] uppercase text-foreground-muted">Trades</div>
          </div>
        </div>
      </div>

      {subAgents.length > 0 && (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {subAgents.map((agent) => {
            const colors = AGENT_COLORS[agent.color as keyof typeof AGENT_COLORS]
            return (
              <div
                key={agent.id}
                className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className="font-mono text-sm font-bold tracking-wider"
                    style={{ color: AGENT_STROKES[agent.color] }}
                  >
                    {agent.name}
                  </span>
                  <StatusBadge status={agent.status === 'active' ? 'live' : 'standby'} />
                </div>
                <div className="mb-3 font-mono text-[10px] text-foreground-muted">
                  {agent.role}
                </div>
                <div className="space-y-1 border-t border-border pt-3">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-foreground-muted">Trades</span>
                    <span className="text-foreground">{agent.tradesExecuted}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
