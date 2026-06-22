import { BaseAgent } from '@nullboss/core'
import type { AgentConfig } from '@nullboss/core'

interface Position {
  protocol: 'AAVE' | 'GMX'
  positionId: string
  collateralToken: `0x${string}`
  debtToken: `0x${string}`
  collateralAmount: bigint
  debtAmount: bigint
  liquidationThreshold: bigint
  healthFactor: bigint
}

export class LiquidationAgent extends BaseAgent {
  private currentConfidence: number = 0
  private positions: Position[] = []
  private readonly MIN_HEALTH_FACTOR = BigInt(105)
  private readonly LIQUIDATION_BONUS_BPS = 500n

  constructor(config: AgentConfig) {
    super(config)
  }

  get type(): string { return 'LIQUIDATION' }
  get confidence(): number { return this.currentConfidence }

  protected getInterval(): number {
    return 15000
  }

  protected getChain(): any {
    return { id: this.config.chainId, name: 'Avalanche', nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }, rpcUrls: { default: { http: [this.config.rpcUrl] } } }
  }

  protected async analyze(): Promise<void> {
    console.log('[Liquidation] Scanning Aave and GMX for undercollateralized positions')
    const aavePositions = await this.scanAave()
    const gmxPositions = await this.scanGMX()
    this.positions = [...aavePositions, ...gmxPositions]

    const liquidatable = this.positions.filter(p => p.healthFactor < this.MIN_HEALTH_FACTOR)
    if (liquidatable.length > 0) {
      this.currentConfidence = 90
      for (const pos of liquidatable) {
        console.log(`[Liquidation] Target: ${pos.protocol} position ${pos.positionId}, HF: ${pos.healthFactor}`)
      }
    } else {
      this.currentConfidence = Math.max(0, this.currentConfidence - 10)
    }
  }

  private async scanAave(): Promise<Position[]> {
    return []
  }

  private async scanGMX(): Promise<Position[]> {
    return []
  }

  protected async execute(): Promise<void> {
    if (this.currentConfidence < 85 || this.positions.length === 0) {
      console.log('[Liquidation] No viable targets')
      return
    }
    const target = this.positions.find(p => p.healthFactor < this.MIN_HEALTH_FACTOR)
    if (!target) return
    console.log(`[Liquidation] Liquidating ${target.protocol} position ${target.positionId} for ${this.LIQUIDATION_BONUS_BPS} bps bonus`)

    const USDC = '0x5425890298aed601595a70AB815c96711a31Bc65' as const
    const MOCK_ADAPTER = '0x14da13F038Def7E6257e5dCB3EdEbABea37367AC' as const
    const TRADE_AMOUNT = BigInt(500000)

    const allowance = await this.publicClient.readContract({
      address: USDC,
      abi: [{ name: 'allowance', type: 'function', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }],
      functionName: 'allowance',
      args: [this.account.address, this.config.executorAddress],
    }) as bigint
    if (allowance < TRADE_AMOUNT) {
      const hash = await this.walletClient.writeContract({
        address: USDC,
        abi: [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' }],
        functionName: 'approve',
        args: [this.config.executorAddress, TRADE_AMOUNT * 100n],
        chain: null as any,
      })
      console.log(`[Liquidation] Approved executor, tx: ${hash}`)
    }

    const data = '0x' as `0x${string}`
    const txHash = await this.executorClient.executeTradeWithTokenIn(
      MOCK_ADAPTER,
      USDC,
      TRADE_AMOUNT,
      data,
      100n,
      TRADE_AMOUNT,
    )
    console.log(`[Liquidation] Trade executed: ${txHash}`)
    this.tradesToday++
    this.currentConfidence = 0
  }
}
