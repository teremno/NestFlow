import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";

import { Providers } from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NestFlow — Cross-Chain Savings Automator",
  description: "Save across chains. Earn on Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full bg-[#0f0d1a] antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#0f0d1a] text-slate-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
