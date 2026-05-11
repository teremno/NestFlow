import { createConfig, http, injected, type Config } from "wagmi";
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  mainnet,
  optimism,
  polygon,
} from "viem/chains";

const chains = [mainnet, polygon, bsc, avalanche, optimism, arbitrum, base] as const;

let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    config = createConfig({
      chains,
      connectors: [injected()],
      ssr: true,
      transports: {
        [mainnet.id]: http(),
        [polygon.id]: http(),
        [bsc.id]: http(),
        [avalanche.id]: http(),
        [optimism.id]: http(),
        [arbitrum.id]: http(),
        [base.id]: http(),
      },
    });
  }

  return config;
}

export { chains as wagmiChains };
