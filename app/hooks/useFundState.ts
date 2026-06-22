'use client'

import { useEffect, useState, useCallback } from 'react'
import { publicClient, CONTRACT_ADDRESSES, isDeployed, VAULT_ABI } from '@/app/lib/contracts'
import type { FundState } from '@/app/types'

export function useFundState() {
  const [state, setState] = useState<FundState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notDeployed, setNotDeployed] = useState(false)

  const fetchState = useCallback(async () => {
    const vaultAddr = CONTRACT_ADDRESSES.vault
    if (!isDeployed(vaultAddr)) {
      setNotDeployed(true)
      setIsLoading(false)
      return
    }
    try {
      const [totalAssets, totalSupply, highWaterMark, paused] = await Promise.all([
        publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: 'totalAssets' }),
        publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: 'totalSupply' }),
        publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: 'highWaterMark' }),
        publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: 'paused' }),
      ])

      const ta = totalAssets as bigint
      const ts = totalSupply as bigint
      const hwm = highWaterMark as bigint

      const totalAssetsNum = Number(ta) / 1e6
      const totalSupplyNum = Number(ts) / 1e18
      const sharePrice = totalSupplyNum > 0 ? totalAssetsNum / totalSupplyNum : 0
      const hwmNum = Number(hwm) / 1e6
      const INITIAL_SHARE_PRICE = 1.00
      const sinceInception = ((sharePrice - INITIAL_SHARE_PRICE) / INITIAL_SHARE_PRICE) * 100

      setState({
        nav: sharePrice,
        sharePrice,
        totalValueLocked: totalAssetsNum,
        sharesOutstanding: totalSupplyNum,
        highWaterMark: hwmNum,
        sinceInceptionReturn: sinceInception,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read vault state')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 15000)
    return () => clearInterval(interval)
  }, [fetchState])

  return { state, isLoading, error, notDeployed, refresh: fetchState }
}
