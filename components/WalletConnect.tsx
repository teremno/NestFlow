"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit/components";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { ArrowRight, Check, Wallet } from "lucide-react";
import { useAccount } from "wagmi";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnect() {
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { publicKey, connected: isSolanaConnected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const solanaAddress = publicKey?.toBase58();
  const bothConnected = Boolean(isEvmConnected && evmAddress && isSolanaConnected && solanaAddress);
  const connectedSummary =
    evmAddress && solanaAddress
      ? `Ready: EVM ${shortenAddress(evmAddress)} to Solana ${shortenAddress(solanaAddress)}`
      : null;

  return (
    <section className="w-full rounded-lg border border-[#2d2a3e] bg-[#1e1b2e] p-5 text-slate-100 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md border border-sky-400/30 bg-sky-400/10 text-sky-300">
            <Wallet className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Wallets</h2>
            <p className="text-sm text-slate-400">Connect EVM source and Solana destination wallets.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <ConnectButton.Custom>
            {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
              const ready = mounted;
              const connected = ready && account && chain && !chain.unsupported;

              return (
                <div aria-hidden={!ready} className={!ready ? "opacity-0" : undefined}>
                  {connected ? (
                    <button
                      type="button"
                      onClick={openAccountModal}
                      className="flex min-h-12 w-full items-center justify-between rounded-md border border-sky-400/30 bg-sky-400/10 px-4 text-left text-sm text-slate-100 transition hover:border-sky-300/70 hover:bg-sky-400/15 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      <span>
                        <span className="block text-xs text-slate-400">EVM Wallet</span>
                        <span className="font-medium">{shortenAddress(account.address)}</span>
                      </span>
                      <span className="text-xs text-sky-300">{chain.name}</span>
                    </button>
                  ) : chain?.unsupported ? (
                    <button
                      type="button"
                      onClick={openChainModal}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-red-400/40 bg-red-500/10 px-4 text-sm font-medium text-red-200 transition hover:bg-red-500/15 focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <Wallet className="size-4" aria-hidden="true" />
                      Wrong EVM Network
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    >
                      <Wallet className="size-4" aria-hidden="true" />
                      Connect EVM Wallet
                    </button>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>

          <div className="hidden justify-center text-slate-500 md:flex">
            <ArrowRight className="size-5" aria-hidden="true" />
          </div>

          {isSolanaConnected && solanaAddress ? (
            <button
              type="button"
              onClick={() => void disconnect()}
              className="flex min-h-12 w-full items-center justify-between rounded-md border border-violet-400/30 bg-violet-400/10 px-4 text-left text-sm text-slate-100 transition hover:border-violet-300/70 hover:bg-violet-400/15 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <span>
                <span className="block text-xs text-slate-400">Solana Wallet</span>
                <span className="font-medium">{shortenAddress(solanaAddress)}</span>
              </span>
              <span className="text-xs text-violet-300">Disconnect</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setVisible(true)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-violet-500 px-4 text-sm font-semibold text-white transition hover:bg-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <Wallet className="size-4" aria-hidden="true" />
              Connect Solana Wallet
            </button>
          )}
        </div>

        {bothConnected && connectedSummary ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
            <Check className="size-4" aria-hidden="true" />
            <span>{connectedSummary}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
