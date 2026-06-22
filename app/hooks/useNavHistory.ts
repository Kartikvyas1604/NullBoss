'use client'

import { useEffect, useState, useCallback } from 'react'
import { publicClient, CONTRACT_ADDRESSES, isDeployed, VAULT_ABI } from '@/app/lib/contracts'
import type { NavHistoryPoint } from '@/app/types'

export function useNavHistory(_days = 365) {
  const [data, setData] = useState<NavHistoryPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notDeployed, setNotDeployed] = useState(false)

  const fetchNav = useCallback(async () => {
    const vaultAddr = CONTRACT_ADDRESSES.vault
    if (!isDeployed(vaultAddr)) {
      setNotDeployed(true)
      setIsLoading(false)
      return
    }
    try {
      const [totalAssets, totalSupply] = await Promise.all([
        publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: 'totalAssets' }),
        publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: 'totalSupply' }),
      ])
      const ta = totalAssets as bigint
      const ts = totalSupply as bigint
      const sharePrice = ts > BigInt(0)
        ? (Number(ta) / 1e6) / (Number(ts) / 1e18)
        : 0
      setData([{ timestamp: Date.now(), nav: sharePrice, sharePrice }])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read vault')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNav()
  }, [fetchNav])

  return { data, isLoading, error, notDeployed }
}
