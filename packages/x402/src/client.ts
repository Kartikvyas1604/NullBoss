import { createWalletClient, http, parseUnits, type Hash } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { avaxFuji, avalanche } from 'viem/chains'
import type { X402Response, X402PaymentReceipt, X402PaymentRequest } from './types'

export class X402Client {
  private walletClient
  private account
  private chainId: number

  constructor(privateKey: `0x${string}`, chainId: number = 43114) {
    this.account = privateKeyToAccount(privateKey)
    this.chainId = chainId
    this.walletClient = createWalletClient({
      account: this.account,
      chain: chainId === 43114 ? avalanche : avaxFuji,
      transport: http()
    })
  }

  async fetchWithPayment(url: string, options: RequestInit = {}): Promise<Response> {
    const initialResponse = await fetch(url, {
      ...options,
      headers: { ...options.headers, 'Accept': 'application/json' }
    })

    if (initialResponse.status === 402) {
      const paymentRequest: X402Response = await initialResponse.json()
      return this.retryWithPayment(url, options, paymentRequest)
    }

    return initialResponse
  }

  private async retryWithPayment(
    url: string,
    options: RequestInit,
    paymentRequest: X402Response
  ): Promise<Response> {
    const txHash = await this.sendPayment(paymentRequest)

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'X-Payment-Hash': txHash,
        'X-Payment-Amount': paymentRequest.amount,
        'X-Payment-Token': paymentRequest.token
      }
    })
  }

  async sendPayment(request: X402Response): Promise<Hash> {
    const tx = await this.walletClient.sendTransaction({
      to: request.recipient as `0x${string}`,
      value: parseUnits(request.amount, 18),
      chainId: this.chainId
    })
    return tx
  }

  async verifyPayment(receiptHash: Hash): Promise<boolean> {
    const publicClient = createWalletClient({
      chain: this.chainId === 43114 ? avalanche : avaxFuji,
      transport: http()
    })
    const receipt = await publicClient.getTransactionReceipt({ hash: receiptHash })
    return receipt.status === 'success'
  }
}
