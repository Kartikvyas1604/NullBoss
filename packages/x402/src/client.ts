import { createPublicClient, createWalletClient, http, parseUnits, type Hash } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { avalanche, avalancheFuji } from 'viem/chains'
import type { X402Response } from './types'

export class X402Client {
  private walletClient
  private account
  private chainId: number

  constructor(privateKey: `0x${string}`, chainId: number = 43114) {
    this.account = privateKeyToAccount(privateKey)
    this.chainId = chainId
    this.walletClient = createWalletClient({
      account: this.account,
      chain: chainId === 43114 ? avalanche : avalancheFuji,
      transport: http()
    })
  }

  async fetchWithPayment(url: string, options: RequestInit = {}): Promise<Response> {
    const initialResponse = await fetch(url, {
      ...options,
      headers: { ...options.headers, 'Accept': 'application/json' }
    })

    if (initialResponse.status === 402) {
      const paymentRequest = await initialResponse.json() as X402Response
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
      chain: null
    })
    return tx
  }

  async verifyPayment(receiptHash: Hash): Promise<boolean> {
    const publicClient = createPublicClient({
      chain: this.chainId === 43114 ? avalanche : avalancheFuji,
      transport: http()
    })
    const receipt = await publicClient.getTransactionReceipt({ hash: receiptHash })
    return receipt.status === 'success'
  }
}
