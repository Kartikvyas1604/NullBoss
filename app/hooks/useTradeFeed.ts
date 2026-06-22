'use client'

import { useEffect, useState, useCallback } from 'react'
import { publicClient, CONTRACT_ADDRESSES, isDeployed, LEDGER_ABI } from '@/app/lib/contracts'
import type { Trade } from '@/app/types'

export function useTradeFeed() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notDeployed, setNotDeployed] = useState(false)

  const fetchTrades = useCallback(async () => {
    const ledgerAddr = CONTRACT_ADDRESSES.positionLedger
    if (!isDeployed(ledgerAddr)) {
      setNotDeployed(true)
      setIsLoading(false)
      return
    }
    try {
      const rawCount = await publicClient.readContract({
        address: ledgerAddr,
        abi: LEDGER_ABI,
        functionName: 'getTradeCount',
      })
      const count = Number(rawCount as bigint)
      const tradeList: Trade[] = []
      const max = Math.min(count, 50)
      for (let i = max - 1; i >= 0; i--) {
        try {
          const raw = await publicClient.readContract({
            address: ledgerAddr,
            abi: LEDGER_ABI,
            functionName: 'getTrade',
            args: [BigInt(i)],
          })
          const t = raw as {
            tradeId: `0x${string}`
            agentId: bigint
            tokenIn: `0x${string}`
            tokenOut: `0x${string}`
            amountIn: bigint
            amountOut: bigint
            fee: bigint
            x402Receipt: `0x${string}`
            timestamp: bigint
          }
          tradeList.push({
            id: t.tradeId,
            timestamp: Number(t.timestamp) * 1000,
            type: 'buy',
            agent: `Agent #${t.agentId}`,
            protocol: 'DEX',
            tokenIn: 'USDC',
            tokenOut: 'USDC',
            amountIn: Number(t.amountIn) / 1e6,
            amountOut: Number(t.amountOut) / 1e6,
            valueUsd: Number(t.amountIn) / 1e6,
            txHash: t.tradeId,
          })
        } catch {
          break
        }
      }
      setTrades(tradeList)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read trades')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrades()
    const interval = setInterval(fetchTrades, 15000)
    return () => clearInterval(interval)
  }, [fetchTrades])

  return { trades, isLoading, error, notDeployed, refresh: fetchTrades }
}
