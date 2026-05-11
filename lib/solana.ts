import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com";
const SOLANA_RPC_TIMEOUT_MS = 10_000;

let connection: Connection | null = null;

export function getSolanaConnection(): Connection {
  if (!connection) {
    connection = new Connection(SOLANA_RPC, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: SOLANA_RPC_TIMEOUT_MS,
    });
  }

  return connection;
}

export async function getSolanaBalance(address: string): Promise<number> {
  const conn = getSolanaConnection();
  const pubkey = parsePublicKey(address);
  const balance = await withTimeout(
    conn.getBalance(pubkey),
    SOLANA_RPC_TIMEOUT_MS,
    "Timed out while fetching Solana balance.",
  );

  return balance / LAMPORTS_PER_SOL;
}

export function shortenAddress(address: string): string {
  if (address.length <= 8) {
    return address;
  }

  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function parsePublicKey(address: string): PublicKey {
  try {
    return new PublicKey(address);
  } catch {
    throw new Error(`Invalid Solana address: ${shortenAddress(address)}`);
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
