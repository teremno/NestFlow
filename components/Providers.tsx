"use client";

import type { Theme } from "@rainbow-me/rainbowkit";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit/components";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { WagmiProvider } from "wagmi";

import { getConfig } from "@/lib/wagmi-config";

const solanaEndpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com";

const rainbowKitTheme: Theme = {
  blurs: {
    modalOverlay: "blur(8px)",
  },
  colors: {
    accentColor: "#0ea5e9",
    accentColorForeground: "#f8fafc",
    actionButtonBorder: "#2d2a3e",
    actionButtonBorderMobile: "#2d2a3e",
    actionButtonSecondaryBackground: "#1e1b2e",
    closeButton: "#94a3b8",
    closeButtonBackground: "#1e1b2e",
    connectButtonBackground: "#1e1b2e",
    connectButtonBackgroundError: "#7f1d1d",
    connectButtonInnerBackground: "#2d2a3e",
    connectButtonText: "#e2e8f0",
    connectButtonTextError: "#fecaca",
    connectionIndicator: "#22c55e",
    downloadBottomCardBackground: "#1e1b2e",
    downloadTopCardBackground: "#2d2a3e",
    error: "#ef4444",
    generalBorder: "#2d2a3e",
    generalBorderDim: "rgba(45, 42, 62, 0.55)",
    menuItemBackground: "#1e1b2e",
    modalBackdrop: "rgba(15, 13, 26, 0.78)",
    modalBackground: "#0f0d1a",
    modalBorder: "#2d2a3e",
    modalText: "#f8fafc",
    modalTextDim: "#94a3b8",
    modalTextSecondary: "#cbd5e1",
    profileAction: "#1e1b2e",
    profileActionHover: "#2d2a3e",
    profileForeground: "#1e1b2e",
    selectedOptionBorder: "#8b5cf6",
    standby: "#f59e0b",
  },
  fonts: {
    body: "Inter, system-ui, sans-serif",
  },
  radii: {
    actionButton: "8px",
    connectButton: "8px",
    menuButton: "8px",
    modal: "12px",
    modalMobile: "12px",
  },
  shadows: {
    connectButton: "0 10px 30px rgba(14, 165, 233, 0.12)",
    dialog: "0 24px 80px rgba(0, 0, 0, 0.45)",
    profileDetailsAction: "0 0 0 1px rgba(45, 42, 62, 0.9)",
    selectedOption: "0 0 0 1px #8b5cf6",
    selectedWallet: "0 0 0 1px #0ea5e9",
    walletLogo: "0 8px 24px rgba(0, 0, 0, 0.25)",
  },
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const wagmiConfig = getConfig();
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network: WalletAdapterNetwork.Mainnet }),
    ],
    [],
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectionProvider endpoint={solanaEndpoint}>
          <SolanaWalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <RainbowKitProvider modalSize="compact" theme={rainbowKitTheme}>
                {children}
              </RainbowKitProvider>
            </WalletModalProvider>
          </SolanaWalletProvider>
        </ConnectionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
