'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { type ReactNode, useState } from 'react'
import { getConfig } from '@/app/lib/wagmi'

export function Providers({ children }: { children: ReactNode }) {
  const [config] = useState(() => getConfig())
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#E84142',
            accentColorForeground: '#FFF',
            borderRadius: 'small',
            fontStack: 'rounded',
          })}
          initialChain={43114}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
