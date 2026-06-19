export interface FundState {
  nav: number
  sharePrice: number
  totalValueLocked: number
  sharesOutstanding: number
  highWaterMark: number
  sinceInceptionReturn: number
}

export interface WalletPosition {
  connected: boolean
  address: `0x${string}` | null
  shareBalance: number
  shareValue: number
  costBasis: number
  pnl: number
  pnlPercent: number
}

export interface NavHistoryPoint {
  timestamp: number
  nav: number
  sharePrice: number
}

export interface Agent {
  id: string
  name: string
  role: string
  status: 'active' | 'idle' | 'error'
  feesGenerated: number
  tradesExecuted: number
  color: 'red' | 'cyan' | 'green' | 'amber'
  parentId: string | null
}

export interface Trade {
  id: string
  timestamp: number
  type: 'buy' | 'sell' | 'signal' | 'fee' | 'rebalance'
  agent: string
  protocol: string
  tokenIn: string
  tokenOut: string
  amountIn: number
  amountOut: number
  valueUsd: number
  txHash: `0x${string}`
}

export interface FeeStructure {
  managementFee: number
  performanceFee: number
  performanceFeePeriod: string
  highWaterMark: boolean
}

export interface ContractInfo {
  name: string
  address: `0x${string}`
  description: string
  auditUrl: string
}
