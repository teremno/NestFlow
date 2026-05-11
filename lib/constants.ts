export const LIFI_CONFIG = {
  integrator: "NestFlow",
  apiKey: process.env.NEXT_PUBLIC_LIFI_API_KEY ?? "",
} as const;

export const CHAINS = {
  ethereum: { id: 1, name: "Ethereum", token: "ETH" },
  polygon: { id: 137, name: "Polygon", token: "MATIC" },
  bsc: { id: 56, name: "BNB Chain", token: "BNB" },
  avalanche: { id: 43114, name: "Avalanche", token: "AVAX" },
  optimism: { id: 10, name: "Optimism", token: "ETH" },
  arbitrum: { id: 42161, name: "Arbitrum", token: "ETH" },
  base: { id: 8453, name: "Base", token: "ETH" },
  solana: { id: 1151111081099710, name: "Solana", token: "SOL" },
} as const;

export const TOKENS = {
  USDC: {
    ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    polygon: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    bsc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    solana: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  USDT: {
    ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    solana: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  },
} as const;

export const SOLANA_DEFI = {
  marinade: {
    name: "Marinade Finance",
    depositAddress: "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD",
    apy: 0.067,
  },
  kamino: {
    name: "Kamino Lend",
    depositAddress: "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW",
    apy: 0.054,
  },
} as const;

export const SAVINGS_PERIODS = [
  { label: "Weekly", value: "weekly", days: 7 },
  { label: "Bi-weekly", value: "biweekly", days: 14 },
  { label: "Monthly", value: "monthly", days: 30 },
] as const;

export type ChainKey = keyof typeof CHAINS;
export type SupportedToken = keyof typeof TOKENS;
export type SolanaDefiProtocol = keyof typeof SOLANA_DEFI;
export type SavingsPeriod = (typeof SAVINGS_PERIODS)[number]["value"];
