'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { type ReactNode, useState } from 'react'
import { getConfig } from '@/app/lib/wagmi'

const NULLBOSS_THEME = darkTheme({
  accentColor: '#E84142',
  accentColorForeground: '#FFF',
  borderRadius: 'small',
  fontStack: 'rounded',
}).merge({
  colors: {
    connectButtonBackground: '#1A1B1E',
    connectButtonBackgroundError: '#E84142',
    connectButtonInnerBackground: '#121316',
    connectButtonText: '#D1D2D5',
    connectButtonTextError: '#FFF',
    modalBackground: '#0A0B0D',
    modalBorder: '#25262A',
    modalText: '#D1D2D5',
    modalTextDim: '#787980',
    modalTextSecondary: '#787980',
    modalClose: '#787980',
    profileAction: '#121316',
    profileActionHover: '#1A1B1E',
    profileForeground: '#121316',
    selectedOptionBorder: '#4DD8E8',
    actionButtonBorder: '#25262A',
    actionButtonBorderMobile: '#25262A',
    actionButtonSecondaryBackground: '#121316',
    closeButton: '#25262A',
    closeButtonBackground: '#121316',
    generalBorder: '#25262A',
    generalBorderDim: '#1A1B1E',
    menuItemBackground: '#121316',
    downloadBottomCardBackground: '#0A0B0D',
    downloadTopCardBackground: '#121316',
    connectionIndicator: '#39FF88',
    standby: '#FFB84D',
  },
  fonts: {
    body: 'Unbounded, system-ui, sans-serif',
  },
})

export function Providers({ children }: { children: ReactNode }) {
  const [config] = useState(() => getConfig())
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={NULLBOSS_THEME} initialChain={43114}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
