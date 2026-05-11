import {
  KaminoAction,
  KaminoMarket,
  LendingObligation,
} from "@kamino-finance/klend-sdk";
import {
  AccountRole,
  address,
  createNoopSigner,
  createSolanaRpc,
  type Address,
  type Instruction,
} from "@solana/kit";
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";

import { TOKENS } from "@/lib/constants";
import { SOLANA_RPC } from "@/lib/solana";

const KAMINO_MAIN_MARKET = "DxXdAyU3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek";
const SLOT_DURATION_MS = 400;

export interface BuildKaminoDepositParams {
  amount: string;
  connection?: Connection;
  userPublicKey: PublicKey;
}

function isWritableRole(role: AccountRole): boolean {
  return role === AccountRole.WRITABLE || role === AccountRole.WRITABLE_SIGNER;
}

function isSignerRole(role: AccountRole): boolean {
  return role === AccountRole.READONLY_SIGNER || role === AccountRole.WRITABLE_SIGNER;
}

function toWeb3Instruction(instruction: Instruction): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programAddress),
    keys:
      instruction.accounts?.map((account) => ({
        pubkey: new PublicKey(account.address),
        isSigner: "addressIndex" in account ? false : isSignerRole(account.role),
        isWritable: isWritableRole(account.role),
      })) ?? [],
    data: Buffer.from(instruction.data ?? new Uint8Array()),
  });
}

export async function buildKaminoUsdcDepositTransaction({
  amount,
  connection = new Connection(SOLANA_RPC, "confirmed"),
  userPublicKey,
}: BuildKaminoDepositParams): Promise<Transaction> {
  const rpc = createSolanaRpc(SOLANA_RPC);
  const market = await KaminoMarket.load(rpc, address(KAMINO_MAIN_MARKET), SLOT_DURATION_MS);

  if (!market) {
    throw new Error("Kamino market could not be loaded. Please try again.");
  }

  const userAddress = address(userPublicKey.toBase58());
  const usdcMint = address(TOKENS.USDC.solana) as Address;
  const obligation = new LendingObligation(usdcMint, market.programId, 0);
  const action = await KaminoAction.buildDepositReserveLiquidityTxns(
    market,
    amount,
    usdcMint,
    createNoopSigner(userAddress),
    obligation,
    undefined,
  );
  const transaction = new Transaction();
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");

  transaction.feePayer = userPublicKey;
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.add(
    ...[
      ...action.computeBudgetIxs,
      ...action.setupIxs,
      ...action.lendingIxs,
      ...action.cleanupIxs,
    ].map(toWeb3Instruction),
  );
  return transaction;
}
