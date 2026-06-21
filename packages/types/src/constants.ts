export const CONSTANTS = {
  CHAIN_IDS: {
    AVALANCHE_MAINNET: 43114,
    AVALANCHE_FUJI: 43113
  } as const,

  RPC_URLS: {
    [43114]: 'https://api.avax.network/ext/bc/C/rpc',
    [43113]: 'https://api.avax-test.network/ext/bc/C/rpc'
  } as const,

  EXPLORER_URLS: {
    [43114]: 'https://snowtrace.io',
    [43113]: 'https://testnet.snowtrace.io'
  } as const,

  BLOCKS_PER_YEAR: 15768000,

  FEES: {
    MANAGEMENT_FEE: 200,
    PERFORMANCE_FEE: 2000,
    MAX_FEE_BPS: 10000
  } as const,

  TIMELOCK: {
    EMERGENCY_DELAY: 172800
  } as const,

  CIRCUIT_BREAKERS: {
    DEFAULT_MAX_TRADE_PERCENT: 500,
    DEFAULT_MAX_DRAWDOWN: 2000
  } as const,

  USDC_TOKEN: {
    MAINNET: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    FUJI: '0x5425890298aed601595a70AB815c96711a31Bc65'
  } as const,

  X402: {
    DEFAULT_RECIPIENT: '0x402DataFeedAddress',
    PRICE_PER_REQUEST: '1000000'
  } as const
} as const
