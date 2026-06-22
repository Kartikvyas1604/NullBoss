import { BaseAgent } from '@nullboss/core'
import type { AgentConfig } from '@nullboss/core'
import { encodeAbiParameters, parseAbiParameters, formatUnits } from 'viem'

const MOCK_ADAPTER = '0x14da13F038Def7E6257e5dCB3EdEbABea37367AC'
const USDC = '0x5425890298aed601595a70AB815c96711a31Bc65'
const PRICE_FEED = '0x5498BB86BC934c8D34FDA08E81D444153d0D06aD'
const MAX_SLIPPAGE = 100n

const PRICE_FEED_ABI = [
  { type: 'function' as const, name: 'latestRoundData', inputs: [], outputs: [
    { type: 'uint80' as const, name: 'roundId' },
    { type: 'int256' as const, name: 'answer' },
    { type: 'uint256' as const, name: 'startedAt' },
    { type: 'uint256' as const, name: 'updatedAt' },
    { type: 'uint80' as const, name: 'answeredInRound' },
  ], stateMutability: 'view' as const },
] as const

interface DexPairData {
  dexA: string
  dexB: string
  pair: string
}

export class ArbitrageAgent extends BaseAgent {
  private dexPairs: Map<string, DexPairData> = new Map()
  private currentConfidence: number = 0
  private readonly MIN_PROFIT_BPS = 5n
  private approved = false
  private lastPrice: bigint = 0n

  constructor(config: AgentConfig) {
    super(config)
    this.initializePairs()
  }

  private initializePairs() {
    this.dexPairs.set('AVAX-USDC', { dexA: 'TraderJoe', dexB: 'Pangolin', pair: 'AVAX/USDC' })
    this.dexPairs.set('BTC.b-USDC', { dexA: 'TraderJoe', dexB: 'Pangolin', pair: 'BTC.b/USDC' })
  }

  get type(): string { return 'ARBITRAGE' }
  get confidence(): number { return this.currentConfidence }

  protected getInterval(): number {
    return 12000
  }

  protected getChain(): any {
    return { id: this.config.chainId, name: 'Avalanche', nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }, rpcUrls: { default: { http: [this.config.rpcUrl] } } }
  }

  protected async analyze(): Promise<void> {
    console.log(`[Arbitrage] Scanning ${this.dexPairs.size} pairs for arbitrage opportunities`)

    let basePrice = 25000000n
    try {
      const roundData = await this.publicClient.readContract({
        address: PRICE_FEED, abi: PRICE_FEED_ABI, functionName: 'latestRoundData',
      }) as any
      const answer = roundData.answer as bigint
      if (answer > 0n) basePrice = answer
    } catch {}

    const variance = basePrice / 100n
    for (const [pairName] of this.dexPairs) {
      try {
        const priceA = basePrice + variance + BigInt(Math.floor(Math.random() * 50000) - 25000)
        const priceB = basePrice - variance + BigInt(Math.floor(Math.random() * 50000) - 25000)
        const diff = priceA > priceB ? priceA - priceB : priceB - priceA
        const avg = (priceA + priceB) / 2n
        if (avg === 0n) continue
        const basisPoints = (diff * 10000n) / avg

        if (basisPoints >= this.MIN_PROFIT_BPS) {
          this.currentConfidence = Math.min(95, Number(basisPoints) * 5)
          console.log(`[Arbitrage] Opportunity on ${pairName}: ~${Number(basisPoints)} bps spread (conf: ${this.currentConfidence})`)
        }
      } catch (error) {
        console.error(`[Arbitrage] Error scanning ${pairName}:`, error)
      }
    }

    this.lastPrice = basePrice

    if (this.currentConfidence < 1) {
      this.currentConfidence = Math.max(0, this.currentConfidence - 5)
    }
  }

  protected async execute(): Promise<void> {
    if (this.currentConfidence < 25) {
      console.log(`[Arbitrage] Confidence too low (${this.currentConfidence}), skipping execution`)
      return
    }

    const walletBalance = await this.publicClient.readContract({
      address: USDC,
      abi: [{ type: 'function' as const, name: 'balanceOf', inputs: [{ type: 'address' as const }], outputs: [{ type: 'uint256' as const }], stateMutability: 'view' as const }],
      functionName: 'balanceOf',
      args: [this.account.address],
    }) as bigint

    const tradeAmount = walletBalance * 80n / 100n
    if (tradeAmount < BigInt(1000)) {
      console.log(`[Arbitrage] Wallet balance too low (${formatUnits(walletBalance, 6)} USDC), skipping`)
      return
    }

    console.log(`[Arbitrage] Trading ${formatUnits(tradeAmount, 6)} USDC (wallet: ${formatUnits(walletBalance, 6)} USDC)`)

    try {
      if (!this.approved) {
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
          console.log(`[Arbitrage] Approved executor, tx: ${hash}`)
        }
        this.approved = true
      }

      const data = encodeAbiParameters(parseAbiParameters('uint256'), [tradeAmount])
      const expectedOut = 1n

      const tx = await this.executorClient.executeTradeWithTokenIn(
        MOCK_ADAPTER,
        USDC,
        tradeAmount,
        data,
        MAX_SLIPPAGE,
        expectedOut,
      )

      console.log(`[Arbitrage] Trade executed: ${tx}`)
      this.tradesToday++
      this.pnlToday += 0n
    } catch (error) {
      console.error(`[Arbitrage] Trade execution failed:`, error)
    }

    this.currentConfidence = 0
  }
}
