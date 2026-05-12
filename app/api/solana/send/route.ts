import { Connection } from "@solana/web3.js";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

const SOLANA_RPC =
  process.env.SOLANA_RPC ??
  process.env.NEXT_PUBLIC_SOLANA_RPC ??
  "https://api.mainnet-beta.solana.com";
const MAX_BODY_BYTES = 16 * 1024;
const CONFIRMATION_TIMEOUT_MS = 120_000;
const CONFIRMATION_POLL_MS = 2_000;

interface SolanaSendRequest {
  signedTransaction: string;
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

function parseBody(value: unknown): SolanaSendRequest {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be an object.");
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.signedTransaction !== "string" ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(record.signedTransaction)
  ) {
    throw new Error("signedTransaction must be a base64 string.");
  }

  return {
    signedTransaction: record.signedTransaction,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForConfirmation(
  connection: Connection,
  signature: string,
): Promise<void> {
  const deadline = Date.now() + CONFIRMATION_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const { value } = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });
    const status = value[0];

    if (status?.err) {
      throw new Error(
        `Solana transaction failed. Signature: ${signature}. Error: ${JSON.stringify(status.err)}`,
      );
    }

    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    ) {
      return;
    }

    await wait(CONFIRMATION_POLL_MS);
  }

  throw new Error(
    `Solana transaction was submitted but not confirmed yet. Signature: ${signature}`,
  );
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
    const connection = new Connection(SOLANA_RPC, "confirmed");
    const signature = await connection.sendRawTransaction(
      Buffer.from(body.signedTransaction, "base64"),
      {
        maxRetries: 3,
        skipPreflight: false,
      },
    );

    await waitForConfirmation(connection, signature);

    return jsonResponse({
      signature,
    });
  } catch (error) {
    console.error({
      route: "/api/solana/send",
      error,
    });

    return jsonResponse(
      {
        error: {
          code: "solana_send_failed",
          message:
            error instanceof Error && error.message.trim()
              ? error.message
              : "Could not submit Solana transaction.",
        },
      },
      { status: 400 },
    );
  }
}
