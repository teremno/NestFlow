import { NextResponse, type NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";

import { buildKaminoUsdcDepositTransaction } from "@/lib/kamino";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4 * 1024;
const MAX_DEPOSIT_AMOUNT = BigInt("500000000"); // 500 USDC, 6 decimals.
const MIN_DEPOSIT_AMOUNT = BigInt("1");

interface KaminoDepositRequest {
  amount: string;
  owner: string;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): NextResponse {
  const requestId = crypto.randomUUID();

  return NextResponse.json(
    typeof body === "object" && body !== null
      ? {
          ...body,
          requestId,
        }
      : {
          data: body,
          requestId,
        },
    {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init.headers)),
        "x-request-id": requestId,
      },
    },
  );
}

function parseBody(value: unknown): KaminoDepositRequest {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be an object.");
  }

  const record = value as Record<string, unknown>;

  if (typeof record.owner !== "string" || !record.owner.trim()) {
    throw new Error("owner is required.");
  }

  if (typeof record.amount !== "string" || !/^\d+$/.test(record.amount)) {
    throw new Error("amount must be a positive integer string.");
  }

  const amount = BigInt(record.amount);

  if (amount < MIN_DEPOSIT_AMOUNT || amount > MAX_DEPOSIT_AMOUNT) {
    throw new Error("amount is outside the supported hackathon safety range.");
  }

  return {
    amount: record.amount,
    owner: record.owner.trim(),
  };
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  const contentType = request.headers.get("content-type") ?? "";

  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse(
      {
        error: {
          code: "payload_too_large",
          message: "Request body is too large.",
        },
      },
      { status: 413 },
    );
  }

  if (!contentType.includes("application/json")) {
    return jsonResponse(
      {
        error: {
          code: "unsupported_media_type",
          message: "Content-Type must be application/json.",
        },
      },
      { status: 415 },
    );
  }

  try {
    const body = parseBody(await request.json());
    const owner = new PublicKey(body.owner).toBase58();
    const serializedTransaction = await buildKaminoUsdcDepositTransaction({
      amountBaseUnits: body.amount,
      wallet: owner,
    });

    return jsonResponse({
      transaction: serializedTransaction,
    });
  } catch (error) {
    console.error({
      route: "/api/kamino/deposit",
      error,
    });

    return jsonResponse(
      {
        error: {
          code: "kamino_deposit_build_failed",
          message:
            error instanceof Error && error.message.trim()
              ? error.message
              : "Could not build Kamino deposit transaction.",
        },
      },
      { status: 400 },
    );
  }
}
