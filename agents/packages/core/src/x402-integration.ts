import { X402Client, TreasuryAutopay } from '@nullboss/x402'
import { privateKeyToAccount } from 'viem/accounts'
import type { X402PaymentReceipt, X402Client as X402ClientType } from '@nullboss/x402'

export class AgentX402Integration {
  private client: X402ClientType
  private autopay?: TreasuryAutopay

  constructor(
    agentKey: `0x${string}`,
    treasuryKey?: `0x${string}`,
    chainId: number = 43114
  ) {
    this.client = new X402Client(agentKey, chainId)
    if (treasuryKey) {
      this.autopay = new TreasuryAutopay(treasuryKey, {
        maxDailyAllowance: BigInt(10) * BigInt(10**18),
        hotWalletAddress: this.getAddressFromKey(agentKey),
        topUpThreshold: BigInt(10**17),
        topUpAmount: BigInt(10**18)
      }, chainId)
    }
  }

  private getAddressFromKey(key: `0x${string}`): `0x${string}` {
    return privateKeyToAccount(key).address
  }

  async fetchData(url: string): Promise<any> {
    const response = await this.client.fetchWithPayment(url)
    return response.json()
  }

  async ensureFunded(): Promise<void> {
    if (this.autopay) {
      await this.autopay.checkAndTopUp()
    }
  }

  get client_(): X402ClientType { return this.client }
}
