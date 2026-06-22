import { createConfig, http } from 'wagmi'
import { avalanche, avalancheFuji } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  coreWallet,
} from '@rainbow-me/rainbowkit/wallets'

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID ?? 'YOUR_PROJECT_ID'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, coreWallet, walletConnectWallet, coinbaseWallet],
    },
  ],
  { appName: 'NULLBOSS', projectId }
)

export function getConfig() {
  return createConfig({
    connectors,
    chains: [avalanche, avalancheFuji] as const,
    transports: {
      [avalanche.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc'),
      [avalancheFuji.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc'),
    },
    ssr: true,
  })
}
