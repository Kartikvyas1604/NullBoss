import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { avalanche, avalancheFuji } from 'wagmi/chains'

export const config = createConfig({
  connectors: [injected()],
  chains: [avalanche, avalancheFuji] as const,
  transports: {
    [avalanche.id]: http(process.env.NEXT_PUBLIC_AVAX_RPC || 'https://api.avax.network/ext/bc/C/rpc'),
    [avalancheFuji.id]: http(process.env.NEXT_PUBLIC_FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc'),
  },
  ssr: true,
  multiInjectedProviderDiscovery: true,
})
