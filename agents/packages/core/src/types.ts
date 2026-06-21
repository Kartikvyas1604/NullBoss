// Core runtime types

export interface AgentConfig {
  agentId: number
  agentType: 'ORCHESTRATOR' | 'ARBITRAGE' | 'TREND' | 'LIQUIDATION'
  privateKey: `0x${string}`
  rpcUrl: string
  chainId: number
  registryAddress: `0x${string}`
  executorAddress: `0x${string}`
  vaultAddress: `0x${string}`
  x402Config: {
    privateKey: `0x${string}`
    maxDailyAllowance: bigint
  }
}

export interface HealthStatus {
  agentId: number
  agentType: string
  status: 'running' | 'paused' | 'error'
  uptime: number
  lastAction: number
  lastHeartbeat: number
  tradesToday: number
  pnlToday: bigint
  confidence: number
  error?: string
}
