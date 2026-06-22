'use client'

import { useEffect, useState, useCallback } from 'react'
import { publicClient, CONTRACT_ADDRESSES, isDeployed, REGISTRY_ABI } from '@/app/lib/contracts'

interface OnChainAgent {
  id: string
  name: string
  role: string
  status: 'active' | 'idle' | 'error'
  feesGenerated: number
  tradesExecuted: number
  color: 'red' | 'cyan' | 'green' | 'amber'
  parentId: string | null
}

const AGENT_TYPE_LABELS: Record<string, { name: string; role: string; color: 'red' | 'cyan' | 'green' | 'amber' }> = {
  '0': { name: 'ORCHESTRATOR', role: 'Parent Agent — Strategy Orchestrator', color: 'cyan' },
  '1': { name: 'ARBITRAGE', role: 'Cross-DEX arbitrage hunter', color: 'green' },
  '2': { name: 'TREND', role: 'Momentum & trend follower', color: 'amber' },
  '3': { name: 'LIQUIDATION', role: 'Liquidation position snapper', color: 'red' },
}

export function useAgentStatus() {
  const [agents, setAgents] = useState<OnChainAgent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notDeployed, setNotDeployed] = useState(false)

  const fetchAgents = useCallback(async () => {
    const registryAddr = CONTRACT_ADDRESSES.registry
    if (!isDeployed(registryAddr)) {
      setNotDeployed(true)
      setIsLoading(false)
      return
    }
    try {
      const found: OnChainAgent[] = []
      for (let i = 1; i <= 20; i++) {
        try {
          const agent = await publicClient.readContract({
            address: registryAddr,
            abi: REGISTRY_ABI,
            functionName: 'getAgent',
            args: [BigInt(i)],
          })
          const a = agent as {
            agentId: bigint
            owner: `0x${string}`
            parentAgentId: bigint
            metadataUri: string
            registered: boolean
            revokedAt: bigint
          }

          if (!a.registered) continue

          const isActive = await publicClient.readContract({
            address: registryAddr,
            abi: REGISTRY_ABI,
            functionName: 'isAgentActive',
            args: [BigInt(i)],
          })

          let repSuccess = BigInt(0)
          let repTotal = BigInt(0)
          try {
            const result = await publicClient.readContract({
              address: registryAddr,
              abi: REGISTRY_ABI,
              functionName: 'getReputation',
              args: [BigInt(i)],
            })
            const r = result as [bigint, bigint]
            repSuccess = r[0]
            repTotal = r[1]
          } catch { /* no reputation */ }

          const parentIdBI = a.parentAgentId
          const typeKey = parentIdBI > BigInt(0) ? String(parentIdBI) : '0'
          const typeInfo = AGENT_TYPE_LABELS[typeKey] || { name: `Agent #${i}`, role: 'Unknown', color: 'amber' as const }

          found.push({
            id: `agent-${i}`,
            name: typeInfo.name,
            role: typeInfo.role,
            status: isActive ? 'active' : 'idle',
            feesGenerated: 0,
            tradesExecuted: Number(repTotal),
            color: typeInfo.color,
            parentId: parentIdBI > BigInt(0) ? `agent-${parentIdBI}` : null,
          })
        } catch {
          break
        }
      }
      setAgents(found)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read agents')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 30000)
    return () => clearInterval(interval)
  }, [fetchAgents])

  return { agents, isLoading, error, notDeployed }
}
