// === Agent Types ===
export interface Agent {
  agentId: number
  owner: `0x${string}`
  parentAgentId: number
  metadataUri: string
  registered: boolean
  revokedAt: number
  agentType: AgentType
  status: AgentStatus
}

export enum AgentType {
  ORCHESTRATOR = 'ORCHESTRATOR',
  ARBITRAGE = 'ARBITRAGE',
  TREND = 'TREND',
  LIQUIDATION = 'LIQUIDATION'
}

export enum AgentStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  RETIRED = 'RETIRED',
  REVOKED = 'REVOKED'
}

export interface AgentMetadata {
  name: string
  description: string
  strategyHash: string
  modelAttestation: string
  capabilities: string[]
  version: string
  createdAt: number
}

export interface ReputationEntry {
  outcomeHash: string
  success: boolean
  timestamp: number
  pnl: bigint
}

// === Vault Types ===
export interface VaultState {
  totalAssets: bigint
  totalSupply: bigint
  sharePrice: bigint
  highWaterMark: bigint
  managementFeeRate: bigint
  performanceFeeRate: bigint
  lastBlockAccrued: number
  paused: boolean
  emergencyGuardian: `0x${string}`
}

export interface DepositEvent {
  sender: `0x${string}`
  owner: `0x${string}`
  assets: bigint
  shares: bigint
  timestamp: number
}

export interface WithdrawEvent {
  sender: `0x${string}`
  receiver: `0x${string}`
  owner: `0x${string}`
  assets: bigint
  shares: bigint
  timestamp: number
}

// === Trade Types ===
export interface Trade {
  tradeId: string
  agentId: number
  agentType: AgentType
  tokenIn: `0x${string}`
  tokenOut: `0x${string}`
  amountIn: bigint
  amountOut: bigint
  fee: bigint
  pnl: bigint
  x402Receipt: string | null
  strategyCommit: string | null
  status: TradeStatus
  timestamp: number
  txHash: `0x${string}`
}

export enum TradeStatus {
  PENDING = 'PENDING',
  EXECUTED = 'EXECUTED',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED'
}

// === Fee Types ===
export interface FeeBreakdown {
  managementFee: bigint
  performanceFee: bigint
  parentTreasuryShare: bigint
  subAgentShare: bigint
  protocolTreasuryShare: bigint
}

// === Strategy Types ===
export interface StrategyIntent {
  agentId: number
  commitHash: string
  revealed: boolean
  executed: boolean
  timestamp: number
}

// === Circuit Breaker State ===
export interface CircuitBreakerState {
  maxTradePercent: number
  maxDrawdown: bigint
  dailyPnl: bigint
  dailyStartBlock: number
  tradesToday: number
  breached: boolean
}

// === Agent Signal ===
export interface AgentSignal {
  agentId: number
  agentType: AgentType
  action: 'BUY' | 'SELL' | 'HOLD'
  token: `0x${string}`
  amount: bigint
  confidence: number
  reason: string
  timestamp: number
  signature: `0x${string}`
}

// === NAV History ===
export interface NavPoint {
  timestamp: number
  sharePrice: string
  totalAssets: string
  totalSupply: string
}

// === API Response Types ===
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
}
