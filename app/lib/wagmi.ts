import { createConfig, http } from 'wagmi'
import { avalanche, avalancheFuji } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets'

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID ?? 'YOUR_PROJECT_ID'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet],
    },
  ],
  { appName: 'NULLBOSS', projectId }
)

export function getConfig() {
  return createConfig({
    connectors,
    chains: [avalanche, avalancheFuji],
    transports: {
      [avalanche.id]: http(),
      [avalancheFuji.id]: http(),
    },
    ssr: true,
  })
}
