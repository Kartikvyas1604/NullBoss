import { createPublicClient, createWalletClient, http, type Hash } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { avalanche, avalancheFuji } from 'viem/chains'
import type { TreasuryAutopayConfig } from './types'

export class TreasuryAutopay {
  private config: TreasuryAutopayConfig
  private walletClient
  private publicClient
  private account
  private dailySpent: bigint = 0n
  private lastResetDay: number = 0

  constructor(
    treasuryKey: `0x${string}`,
    config: TreasuryAutopayConfig,
    chainId: number = 43114
  ) {
    this.config = config
    this.account = privateKeyToAccount(treasuryKey)
    this.walletClient = createWalletClient({
      account: this.account,
      chain: chainId === 43114 ? avalanche : avalancheFuji,
      transport: http()
    })
    this.publicClient = createPublicClient({
      chain: chainId === 43114 ? avalanche : avalancheFuji,
      transport: http()
    })
    this.resetDailyIfNeeded()
  }

  private resetDailyIfNeeded(): void {
    const today = Math.floor(Date.now() / 86400000)
    if (today !== this.lastResetDay) {
      this.dailySpent = 0n
      this.lastResetDay = today
    }
  }

  async checkAndTopUp(): Promise<Hash | null> {
    this.resetDailyIfNeeded()

    if (this.dailySpent >= this.config.maxDailyAllowance) {
      console.warn('Daily allowance exhausted')
      return null
    }

    const balance = await this.publicClient.getBalance({
      address: this.config.hotWalletAddress
    })

    if (balance < this.config.topUpThreshold) {
      const topUpActual = this.config.topUpAmount >
        (this.config.maxDailyAllowance - this.dailySpent)
        ? (this.config.maxDailyAllowance - this.dailySpent)
        : this.config.topUpAmount

      const tx = await this.walletClient.sendTransaction({
        to: this.config.hotWalletAddress,
        value: topUpActual,
        chain: null
      })

      this.dailySpent += topUpActual
      console.log(`Topped up hot wallet with ${topUpActual} wei. Tx: ${tx}`)
      return tx
    }

    return null
  }

  get remainingDailyAllowance(): bigint {
    this.resetDailyIfNeeded()
    return this.config.maxDailyAllowance - this.dailySpent
  }
}
