const KAMINO_API_BASE_URL = "https://api.kamino.finance";
const KAMINO_MAIN_MARKET = "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF";
const KAMINO_USDC_RESERVE = "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59";
const USDC_DECIMALS = 6;
const KAMINO_REQUEST_TIMEOUT_MS = 20_000;

export interface BuildKaminoDepositParams {
  amountBaseUnits: string;
  wallet: string;
}

interface KaminoDepositResponse {
  transaction?: unknown;
  error?: unknown;
  message?: unknown;
}

function toDecimalAmount(baseUnits: string, decimals: number): string {
  const amount = BigInt(baseUnits);
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === BigInt(0)) {
    return whole.toString();
  }

  return `${whole}.${fraction.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}

function getKaminoErrorMessage(payload: KaminoDepositResponse): string {
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  if (
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string" &&
    payload.error.message.trim()
  ) {
    return payload.error.message;
  }

  return "Kamino could not build the deposit transaction.";
}

async function readKaminoJson(response: Response): Promise<KaminoDepositResponse> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error("Kamino API returned a non-JSON response.");
  }

  return (await response.json()) as KaminoDepositResponse;
}

export async function buildKaminoUsdcDepositTransaction({
  amountBaseUnits,
  wallet,
}: BuildKaminoDepositParams): Promise<string> {
  const response = await fetch(`${KAMINO_API_BASE_URL}/ktx/klend/deposit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      wallet,
      market: KAMINO_MAIN_MARKET,
      reserve: KAMINO_USDC_RESERVE,
      amount: toDecimalAmount(amountBaseUnits, USDC_DECIMALS),
    }),
    signal: AbortSignal.timeout(KAMINO_REQUEST_TIMEOUT_MS),
  });
  const payload = await readKaminoJson(response);

  if (!response.ok) {
    throw new Error(getKaminoErrorMessage(payload));
  }

  if (typeof payload.transaction !== "string" || !payload.transaction.trim()) {
    throw new Error("Kamino API did not return a deposit transaction.");
  }

  return payload.transaction;
}
