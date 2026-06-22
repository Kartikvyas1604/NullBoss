import { BaseAgent, AgentX402Integration } from '@nullboss/core'
import { formatUnits } from 'viem'
import type { AgentConfig } from '@nullboss/core'

const PRICE_FEED = '0x5498BB86BC934c8D34FDA08E81D444153d0D06aD'
const PRICE_FEED_ABI = [
  { type: 'function' as const, name: 'latestRoundData', inputs: [], outputs: [
    { type: 'uint80' as const, name: 'roundId' },
    { type: 'int256' as const, name: 'answer' },
    { type: 'uint256' as const, name: 'startedAt' },
    { type: 'uint256' as const, name: 'updatedAt' },
    { type: 'uint80' as const, name: 'answeredInRound' },
  ], stateMutability: 'view' as const },
] as const

export class TrendAgent extends BaseAgent {
  private currentConfidence: number = 0
  private x402: AgentX402Integration
  private readonly MIN_CONFIDENCE_THRESHOLD = 55
  private readonly TREND_LOOKBACK_BLOCKS = 60
  private priceHistory: bigint[] = []
  private volumeBase: number = 65

  constructor(config: AgentConfig) {
    super(config)
    this.x402 = new AgentX402Integration(config.x402Config.privateKey)
  }

  get type(): string { return 'TREND' }
  get confidence(): number { return this.currentConfidence }

  protected getInterval(): number {
    return 30000
  }

  protected getChain(): any {
    return { id: this.config.chainId, name: 'Avalanche', nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }, rpcUrls: { default: { http: [this.config.rpcUrl] } } }
  }

  protected async analyze(): Promise<void> {
    const momentum = await this.calculateMomentum()
    const volumeSignal = await this.analyzeVolume()
    let sentimentSignal = 0

    try {
      const sentiment = await this.x402.fetchData('https://api.nullboss.io/v1/sentiment/avalanche')
      sentimentSignal = sentiment.score || 0
    } catch {}

    const compositeScore = momentum * 0.4 + volumeSignal * 0.3 + sentimentSignal * 0.3
    this.currentConfidence = Math.min(99, Math.max(0, Math.round(compositeScore)))
    console.log(`[Trend] M:${momentum.toFixed(1)} V:${volumeSignal.toFixed(1)} S:${sentimentSignal.toFixed(1)} => confidence: ${this.currentConfidence}%`)
  }

  private async calculateMomentum(): Promise<number> {
    try {
      const roundData = await this.publicClient.readContract({
        address: PRICE_FEED, abi: PRICE_FEED_ABI, functionName: 'latestRoundData',
      }) as any
      const priceWei = (roundData.answer as bigint) * 1000000n / 100000000n

      this.priceHistory.push(priceWei)
      if (this.priceHistory.length > this.TREND_LOOKBACK_BLOCKS) this.priceHistory.shift()
      if (this.priceHistory.length < 5) return 50

      const oldest = this.priceHistory[0]
      if (oldest === 0n) return 50
      const change = Number((priceWei - oldest) * 10000n / oldest)
      return Math.max(-100, Math.min(100, change))
    } catch {
      return 50
    }
  }

  private async analyzeVolume(): Promise<number> {
    try {
      const mockCount = await this.publicClient.readContract({
        address: '0x14da13F038Def7E6257e5dCB3EdEbABea37367AC' as `0x${string}`,
        abi: [{ type: 'function' as const, name: 'tradeCount', inputs: [], outputs: [{ type: 'uint256' as const }], stateMutability: 'view' as const }],
        functionName: 'tradeCount',
      }) as bigint
      this.volumeBase = Math.min(95, Math.max(5, Number(mockCount) * 5 + 30))
    } catch {
      this.volumeBase += (Math.random() - 0.5) * 10
      this.volumeBase = Math.max(30, Math.min(90, this.volumeBase))
    }
    return this.volumeBase
  }

  protected async execute(): Promise<void> {
    if (this.currentConfidence < this.MIN_CONFIDENCE_THRESHOLD) {
      console.log(`[Trend] Confidence too low (${this.currentConfidence}%), holding`)
      return
    }
    const direction = this.currentConfidence > 50 ? 'LONG' : 'SHORT'
    console.log(`[Trend] Executing ${direction} (confidence: ${this.currentConfidence}%)`)

    const USDC = '0x5425890298aed601595a70AB815c96711a31Bc65' as const
    const MOCK_ADAPTER = '0x14da13F038Def7E6257e5dCB3EdEbABea37367AC' as const

    const walletBalance = await this.publicClient.readContract({
      address: USDC,
      abi: [{ type: 'function' as const, name: 'balanceOf', inputs: [{ type: 'address' as const }], outputs: [{ type: 'uint256' as const }], stateMutability: 'view' as const }],
      functionName: 'balanceOf',
      args: [this.account.address],
    }) as bigint

    const tradeAmount = walletBalance * 60n / 100n
    if (tradeAmount < BigInt(1000)) {
      console.log(`[Trend] Wallet balance too low (${formatUnits(walletBalance, 6)} USDC), skipping`)
      return
    }
    console.log(`[Trend] Trading ${formatUnits(tradeAmount, 6)} USDC (wallet: ${formatUnits(walletBalance, 6)} USDC)`)

    const allowance = await this.publicClient.readContract({
      address: USDC,
      abi: [{ name: 'allowance', type: 'function', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }],
      functionName: 'allowance',
      args: [this.account.address, this.config.executorAddress],
    }) as bigint
    if (allowance < tradeAmount) {
      const hash = await this.walletClient.writeContract({
        address: USDC,
        abi: [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' }],
        functionName: 'approve',
        args: [this.config.executorAddress, BigInt(2) ** BigInt(256) - BigInt(1)],
        chain: null as any,
      })
      console.log(`[Trend] Approved executor, tx: ${hash}`)
    }

    const data = '0x' as `0x${string}`
    const txHash = await this.executorClient.executeTradeWithTokenIn(
      MOCK_ADAPTER,
      USDC,
      tradeAmount,
      data,
      100n,
      tradeAmount,
    )
    console.log(`[Trend] Trade executed: ${txHash}`)
    this.tradesToday++
    this.currentConfidence = 0
  }
}
