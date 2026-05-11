import { getQuote, getStatus, type QuoteRequestFromAmount } from "@lifi/sdk";
import { NextResponse, type NextRequest } from "next/server";

import { getLifiSDK } from "@/lib/lifi";

type LifiAction = "quote" | "status";
type LifiStatusRequest = Parameters<typeof getStatus>[0];

interface LifiApiBody {
  action: LifiAction;
  params: Record<string, unknown>;
}

const MAX_BODY_BYTES = 16 * 1024;
const LIFI_TIMEOUT_MS = 15_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const ALLOWED_METHODS = "POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Idempotency-Key";
const ALLOWED_ORIGINS = new Set(
  [process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000", "http://127.0.0.1:3000"].filter(
    Boolean,
  ) as string[],
);
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function corsHeaders(request: NextRequest): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });
  const origin = request.headers.get("origin");

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function jsonResponse(
  request: NextRequest,
  body: unknown,
  init: ResponseInit = {},
): NextResponse {
  const requestId = crypto.randomUUID();
  const headers = corsHeaders(request);
  const initHeaders = new Headers(init.headers);

  initHeaders.forEach((value, key) => {
    headers.set(key, value);
  });

  headers.set("x-request-id", requestId);

  return NextResponse.json(
    typeof body === "object" && body !== null
      ? { ...body, requestId }
      : { data: body, requestId },
    {
      ...init,
      headers,
    },
  );
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(key: string): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = Date.now();
  const existingBucket = rateLimitBuckets.get(key);

  if (!existingBucket || existingBucket.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return { allowed: true };
  }

  if (existingBucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((existingBucket.resetAt - now) / 1_000),
    };
  }

  existingBucket.count += 1;

  return { allowed: true };
}

function parseBody(value: unknown): LifiApiBody {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be an object.");
  }

  const record = value as Record<string, unknown>;

  if (record.action !== "quote" && record.action !== "status") {
    throw new Error("Unsupported LI.FI action.");
  }

  if (!record.params || typeof record.params !== "object" || Array.isArray(record.params)) {
    throw new Error("Request params must be an object.");
  }

  return {
    action: record.action,
    params: record.params as Record<string, unknown>,
  };
}

function readRequiredString(params: Record<string, unknown>, key: string): string {
  const value = params[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function readRequiredPositiveInteger(params: Record<string, unknown>, key: string): number {
  const value = params[key];

  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return Number(value);
}

function toQuoteRequest(params: Record<string, unknown>): QuoteRequestFromAmount {
  const quoteRequest: QuoteRequestFromAmount = {
    fromChain: readRequiredPositiveInteger(params, "fromChain"),
    toChain: readRequiredPositiveInteger(params, "toChain"),
    fromToken: readRequiredString(params, "fromToken"),
    toToken: readRequiredString(params, "toToken"),
    fromAmount: readRequiredString(params, "fromAmount"),
    fromAddress: readRequiredString(params, "fromAddress"),
  };

  if (typeof params.toAddress === "string" && params.toAddress.trim()) {
    quoteRequest.toAddress = params.toAddress.trim();
  }

  return quoteRequest;
}

function readOptionalStringOrNumber(
  params: Record<string, unknown>,
  key: string,
): string | number | undefined {
  const value = params[key];

  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function readOptionalString(params: Record<string, unknown>, key: string): string | undefined {
  const value = params[key];

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toStatusRequest(params: Record<string, unknown>): LifiStatusRequest {
  const baseParams = {
    bridge: readOptionalString(params, "bridge"),
    fromChain: readOptionalStringOrNumber(params, "fromChain"),
    toChain: readOptionalStringOrNumber(params, "toChain"),
    fromAddress: readOptionalString(params, "fromAddress"),
  };
  const txHash = readOptionalStringOrNumber(params, "txHash");
  const taskId = readOptionalStringOrNumber(params, "taskId");

  if (typeof txHash === "string" && txHash.trim()) {
    return {
      ...baseParams,
      txHash: txHash.trim(),
    };
  }

  if (typeof taskId === "string" && taskId.trim()) {
    return {
      ...baseParams,
      taskId: taskId.trim(),
    };
  }

  throw new Error("status params must include txHash or taskId.");
}

function toUserMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "LI.FI request failed. Please try again.";
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  const contentType = request.headers.get("content-type") ?? "";

  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse(
      request,
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
      request,
      {
        error: {
          code: "unsupported_media_type",
          message: "Content-Type must be application/json.",
        },
      },
      { status: 415 },
    );
  }

  const rateLimit = checkRateLimit(`lifi:${getClientIp(request)}`);

  if (!rateLimit.allowed) {
    return jsonResponse(
      request,
      {
        error: {
          code: "rate_limited",
          message: "Too many LI.FI requests. Please wait and try again.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimit.retryAfter.toString(),
        },
      },
    );
  }

  try {
    getLifiSDK();
    const body = parseBody(await request.json());

    if (body.action === "quote") {
      const quote = await getQuote(toQuoteRequest(body.params), {
        signal: AbortSignal.timeout(LIFI_TIMEOUT_MS),
      });

      return jsonResponse(request, { quote });
    }

    const status = await getStatus(toStatusRequest(body.params), {
      signal: AbortSignal.timeout(LIFI_TIMEOUT_MS),
    });

    return jsonResponse(request, { status });
  } catch (error) {
    const message = toUserMessage(error);
    const isBadRequest = message.includes("required") || message.includes("must");

    console.error({
      route: "/api/lifi",
      error,
    });

    return jsonResponse(
      request,
      {
        error: {
          code: isBadRequest ? "invalid_request" : "lifi_request_failed",
          message: isBadRequest ? message : "Could not complete LI.FI request.",
        },
      },
      { status: isBadRequest ? 400 : 502 },
    );
  }
}
