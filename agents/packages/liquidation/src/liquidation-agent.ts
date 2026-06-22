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

    const balance = await this.walletClient.getBalance({ address: this.config.agentAddress })
    if (balance < BigInt(1000000)) {
      console.log('[Liquidation] Insufficient balance, skipping')
      return
    }

    const usdc = this.config.usdcToken
    const adapter = this.config.mockTradeAdapter
    const amountIn = balance / BigInt(2)
    const data = '0x' as `0x${string}`
    const maxSlippageBps = 100n
    const expectedMinAmountOut = amountIn

    await this.executorClient.approveToken(usdc, amountIn)
    const txHash = await this.executorClient.executeTradeWithTokenIn(
      adapter,
      usdc,
      amountIn,
      data,
      maxSlippageBps,
      expectedMinAmountOut,
    )
    console.log(`[Liquidation] Trade executed: ${txHash}`)
    this.tradesToday++
    this.currentConfidence = 0
  }
}
