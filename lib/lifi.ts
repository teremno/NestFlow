import {
  createConfig,
  executeRoute,
  getQuote,
  type LiFiStep,
  type QuoteRequestFromAmount,
  type Route,
  type RouteExtended,
  type SDKBaseConfig,
  type SDKConfig,
} from "@lifi/sdk";

import { LIFI_CONFIG } from "./constants";

const LIFI_QUOTE_TIMEOUT_MS = 15_000;

let lifiConfig: SDKBaseConfig | null = null;

export function getLifiSDK(): SDKBaseConfig {
  if (!lifiConfig) {
    const config: SDKConfig = {
      integrator: LIFI_CONFIG.integrator,
      ...(LIFI_CONFIG.apiKey ? { apiKey: LIFI_CONFIG.apiKey } : {}),
    };

    lifiConfig = createConfig(config);
  }

  return lifiConfig;
}

export interface LifiQuoteParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
}

export async function getLifiQuote(params: LifiQuoteParams): Promise<LiFiStep> {
  getLifiSDK();

  const quoteRequest: QuoteRequestFromAmount = {
    fromChain: params.fromChain,
    toChain: params.toChain,
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
  };

  return getQuote(quoteRequest, {
    signal: AbortSignal.timeout(LIFI_QUOTE_TIMEOUT_MS),
  });
}

export async function executeLifiRoute(route: Route): Promise<RouteExtended> {
  getLifiSDK();

  return executeRoute(route, {
    updateRouteHook: (updatedRoute) => {
      console.info("LI.FI route update:", updatedRoute.id);
    },
  });
}
