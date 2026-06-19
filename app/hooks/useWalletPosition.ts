'use client'

import { useState, useCallback } from 'react'
import { MOCK_POSITION, MOCK_CONNECTED_POSITION } from '@/app/data/mockData'
import type { WalletPosition } from '@/app/types'

export function useWalletPosition() {
  const [position] = useState<WalletPosition>(MOCK_POSITION)
  const [isConnecting, setIsConnecting] = useState(false)

  const connect = useCallback(() => {
    setIsConnecting(true)
    setTimeout(() => {
      setIsConnecting(false)
    }, 1500)
  }, [])

  const disconnect = useCallback(() => {
    // noop for now
  }, [])

  return { position, isConnecting, connect, disconnect }
}
