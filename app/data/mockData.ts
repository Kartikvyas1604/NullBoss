import type {
  FundState,
  NavHistoryPoint,
  Agent,
  Trade,
  WalletPosition,
  ContractInfo,
} from '@/app/types'

export const MOCK_FUND: FundState = {
  nav: 124.67,
  sharePrice: 124.67,
  totalValueLocked: 47_320_000,
  sharesOutstanding: 379_512,
  highWaterMark: 128.43,
  sinceInceptionReturn: 24.67,
}

export function generateNavHistory(days = 180): NavHistoryPoint[] {
  const points: NavHistoryPoint[] = []
  let nav = 100
  let now = Date.now()

  for (let i = days; i >= 0; i--) {
    const drift = (Math.random() - 0.48) * 2.5
    const shock = Math.random() < 0.02 ? (Math.random() - 0.5) * 8 : 0
    nav = Math.max(80, nav + drift + shock)
    points.push({
      timestamp: now - i * 86400000,
      nav: parseFloat(nav.toFixed(2)),
      sharePrice: parseFloat(nav.toFixed(2)),
    })
  }
  return points
}

export const MOCK_AGENTS: Agent[] = [
  {
    id: 'parent-001',
    name: 'ORACLE',
    role: 'Parent Agent — Strategy Orchestrator',
    status: 'active',
    feesGenerated: 128_400,
    tradesExecuted: 1_247,
    color: 'cyan',
    parentId: null,
  },
  {
    id: 'arb-001',
    name: 'ARBITRAGE',
    role: 'Cross-DEX arbitrage hunter',
    status: 'active',
    feesGenerated: 52_100,
    tradesExecuted: 689,
    color: 'green',
    parentId: 'parent-001',
  },
  {
    id: 'trend-001',
    name: 'TREND',
    role: 'Momentum & trend follower',
    status: 'idle',
    feesGenerated: 41_800,
    tradesExecuted: 312,
    color: 'amber',
    parentId: 'parent-001',
  },
  {
    id: 'liq-001',
    name: 'LIQUIDATION',
    role: 'Liquidation position snapper',
    status: 'active',
    feesGenerated: 34_500,
    tradesExecuted: 246,
    color: 'red',
    parentId: 'parent-001',
  },
]

const PROTOCOLS = ['Trader Joe', 'GMX', 'Pangolin', 'Benqi', 'Aave', 'Platypus']
const TOKENS = ['AVAX', 'USDC', 'USDT', 'JOE', 'GMX', 'sAVAX', 'BTC.b', 'ETH.f']

export function generateTrades(count = 50): Trade[] {
  const trades: Trade[] = []
  let now = Date.now()

  for (let i = 0; i < count; i++) {
    const isBuy = Math.random() > 0.4
    const amountIn = parseFloat((Math.random() * 250_000 + 1000).toFixed(2))
    const amountOut = isBuy
      ? parseFloat((amountIn * (0.98 + Math.random() * 0.04)).toFixed(2))
      : parseFloat((amountIn * (1.02 + Math.random() * 0.04)).toFixed(2))
    const agent = MOCK_AGENTS.slice(1)[Math.floor(Math.random() * 3)]

    trades.push({
      id: `tx-${now - i * 120000}`,
      timestamp: now - i * 120000,
      type: isBuy ? 'buy' : 'sell',
      agent: agent.name,
      protocol: PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)],
      tokenIn: TOKENS[Math.floor(Math.random() * TOKENS.length)],
      tokenOut: TOKENS[Math.floor(Math.random() * TOKENS.length)],
      amountIn,
      amountOut,
      valueUsd: parseFloat((amountIn * (0.95 + Math.random() * 0.1)).toFixed(2)),
      txHash: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}` as `0x${string}`,
    })
  }
  return trades.sort((a, b) => b.timestamp - a.timestamp)
}

export const MOCK_POSITION: WalletPosition = {
  connected: false,
  address: null,
  shareBalance: 0,
  shareValue: 0,
  costBasis: 0,
  pnl: 0,
  pnlPercent: 0,
}

export const MOCK_CONNECTED_POSITION: WalletPosition = {
  connected: true,
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18' as `0x${string}`,
  shareBalance: 842.5,
  shareValue: 105_014.38,
  costBasis: 89_305.00,
  pnl: 15_709.38,
  pnlPercent: 17.59,
}

export const MOCK_CONTRACTS: ContractInfo[] = [
  {
    name: 'NULLBOSS Fund Vault',
    address: '0xA1b2c3d4e5f67890123456789abcdef01234567' as `0x${string}`,
    description: 'Main fund contract — holds all assets, enforces 2/20 fee structure, mints/burns shares.',
    auditUrl: '#',
  },
  {
    name: 'Oracle Router',
    address: '0xB2c3d4e5f67890123456789abcdef012345678a' as `0x${string}`,
    description: 'Price oracle aggregator — consumes Chainlink + DEX TWAP feeds for NAV calculation.',
    auditUrl: '#',
  },
  {
    name: 'Agent Registry',
    address: '0xC3d4e5f67890123456789abcdef0123456789ab' as `0x${string}`,
    description: 'On-chain registry of sub-agent contracts registered with the parent ORACLE agent.',
    auditUrl: '#',
  },
]

export const FEE_STRUCTURE = {
  managementFee: 2.0,
  performanceFee: 20.0,
  performanceFeePeriod: '28 days',
  highWaterMark: true,
}
