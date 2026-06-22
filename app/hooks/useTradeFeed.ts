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
          const USDC = '0x5425890298aed601595a70AB815c96711a31Bc65'
          const WAVAX = '0x659b28B7EcAbC69A86052D844e1b366c2098A815'

          const tokenInSymbol = t.tokenIn.toLowerCase() === USDC.toLowerCase() ? 'USDC' : t.tokenIn.toLowerCase() === WAVAX.toLowerCase() ? 'WAVAX' : '???'
          const tokenOutSymbol = t.tokenOut.toLowerCase() === USDC.toLowerCase() ? 'USDC' : t.tokenOut.toLowerCase() === WAVAX.toLowerCase() ? 'WAVAX' : '???'
          const tokenInDecimals = tokenInSymbol === 'USDC' ? 6 : 18
          const tokenOutDecimals = tokenOutSymbol === 'USDC' ? 6 : 18

          tradeList.push({
            id: t.tradeId,
            timestamp: Number(t.timestamp) * 1000,
            type: 'buy',
            agent: `Agent #${t.agentId}`,
            protocol: 'DEX',
            tokenIn: tokenInSymbol,
            tokenOut: tokenOutSymbol,
            amountIn: Number(t.amountIn) / 10 ** tokenInDecimals,
            amountOut: Number(t.amountOut) / 10 ** tokenOutDecimals,
            valueUsd: tokenInDecimals === 6 ? Number(t.amountIn) / 1e6 : 0,
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
