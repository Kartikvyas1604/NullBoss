import { BaseAgent } from '@nullboss/core'
import type { AgentConfig, HealthStatus } from '@nullboss/core'

interface AgentRegistration {
  agentId: number
  type: string
  status: 'active' | 'paused' | 'unhealthy'
  weight: number
  confidence: number
  lastHeartbeat: number
  address: string
}

interface CapitalAllocation {
  agentId: number
  weight: number
  allocatedCapital: bigint
}

export class OrchestratorAgent extends BaseAgent {
  private subAgents: Map<number, AgentRegistration> = new Map()
  private readonly REBALANCE_INTERVAL = 120000
  private lastRebalance: number = 0
  private totalCapital = BigInt(100000) * BigInt(10**6)

  constructor(config: AgentConfig) {
    super(config)
  }

  get type(): string { return 'ORCHESTRATOR' }
  get confidence(): number {
    if (this.subAgents.size === 0) return 0
    const avg = Array.from(this.subAgents.values()).reduce((s, a) => s + a.confidence, 0)
    return avg / this.subAgents.size
  }

  protected getInterval(): number {
    return 60000
  }

  protected getChain(): any {
    return { id: this.config.chainId, name: 'Avalanche', nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }, rpcUrls: { default: { http: [this.config.rpcUrl] } } }
  }

  async registerSubAgent(agentId: number, type: string, address: string): Promise<void> {
    this.subAgents.set(agentId, {
      agentId,
      type,
      status: 'active',
      weight: 25,
      confidence: 0,
      lastHeartbeat: Date.now(),
      address
    })
    console.log(`[Orchestrator] Registered sub-agent ${type}#${agentId} at ${address}`)
    await this.rebalanceCapital()
  }

  async retireSubAgent(agentId: number): Promise<void> {
    this.subAgents.delete(agentId)
    console.log(`[Orchestrator] Retired sub-agent ${agentId}`)
    await this.rebalanceCapital()
  }

  private async rebalanceCapital(): Promise<void> {
    const active = Array.from(this.subAgents.values()).filter(a => a.status === 'active')
    if (active.length === 0) return
    const baseWeight = 100 / active.length
    for (const agent of active) {
      agent.weight = baseWeight
    }
    this.lastRebalance = Date.now()
    console.log(`[Orchestrator] Capital rebalanced across ${active.length} agents`)
  }

  private async refreshTotalCapital(): Promise<void> {
    try {
      const vaultAddress = this.config.vaultAddress as `0x${string}`
      if (vaultAddress) {
        const totalAssets = await this.publicClient.readContract({
          address: vaultAddress,
          abi: [{ type: 'function' as const, name: 'totalAssets', inputs: [], outputs: [{ type: 'uint256' as const }], stateMutability: 'view' as const }],
          functionName: 'totalAssets',
        }) as bigint
        if (totalAssets > 0n) this.totalCapital = totalAssets
      }
    } catch {}
  }

  protected async analyze(): Promise<void> {
    await this.refreshTotalCapital()
    for (const [id, agent] of this.subAgents) {
      if (Date.now() - agent.lastHeartbeat > 300000) {
        agent.status = 'unhealthy'
        console.warn(`[Orchestrator] Agent ${id} missed heartbeat`)
      }
    }
  }

  protected async execute(): Promise<void> {
    if (Date.now() - this.lastRebalance > this.REBALANCE_INTERVAL) {
      const active = Array.from(this.subAgents.values()).filter(a => a.status === 'active')
      if (active.length > 0) {
        const totalConfidence = active.reduce((s, a) => s + a.confidence, 0)
        if (totalConfidence > 0) {
          for (const agent of active) {
            agent.weight = (agent.confidence / totalConfidence) * 100
          }
          console.log('[Orchestrator] Dynamic rebalance complete')
        }
      }
      this.lastRebalance = Date.now()
    }
  }

  async getFleetHealth(): Promise<HealthStatus[]> {
    const fleet: HealthStatus[] = []
    for (const agent of this.subAgents.values()) {
      let tradesToday = 0
      try {
        const rep = await this.publicClient.readContract({
          address: this.config.registryAddress,
          abi: [{ type: 'function' as const, name: 'getReputation', inputs: [{ type: 'uint256' as const }], outputs: [
            { type: 'uint256' as const, name: 'totalTrades' },
            { type: 'uint256' as const, name: 'successfulTrades' },
          ], stateMutability: 'view' as const }],
          functionName: 'getReputation',
          args: [BigInt(agent.agentId)],
        }) as any
        tradesToday = Number(rep[0] as bigint)
      } catch {}

      fleet.push({
        agentId: agent.agentId,
        agentType: agent.type,
        status: agent.status === 'unhealthy' ? 'error' : agent.status === 'paused' ? 'paused' : 'running',
        uptime: Date.now() - this.startTime,
        lastAction: agent.lastHeartbeat,
        lastHeartbeat: agent.lastHeartbeat,
        tradesToday,
        pnlToday: 0n,
        confidence: agent.confidence
      })
    }
    return fleet
  }

  getAllocation(): CapitalAllocation[] {
    return Array.from(this.subAgents.values())
      .filter(a => a.status === 'active')
      .map(a => ({
        agentId: a.agentId,
        weight: a.weight,
        allocatedCapital: (this.totalCapital * BigInt(Math.floor(a.weight * 100))) / 10000n
      }))
  }
}
