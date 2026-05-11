# NestFlow — Cross-Chain Savings Automator 🌉🏦

> Bridge from any chain. Save on Solana. Earn DeFi yield automatically.

Built for the **Build with LI.FI: Superteam Germany** hackathon at Colosseum Frontier.

## 🎯 What It Does

NestFlow lets users set a savings goal (e.g., "save $100/week") and automatically bridges their tokens from any EVM chain to Solana, swaps to USDC, and deposits into Solana DeFi protocols (Marinade Finance, Kamino Lend) — all in one click using LI.FI Composer.

### The Problem

- Users have fragmented funds across 5+ chains
- Moving funds to Solana DeFi requires 3+ separate transactions
- No automated recurring savings in cross-chain DeFi

### The Solution

NestFlow uses LI.FI's Composer API to combine bridge → swap → deposit into a single multi-step transaction flow. Set your goal once, execute with one click.

## 🔧 How LI.FI Is Used

1. **LI.FI SDK** — Quote generation for cross-chain routes (EVM → Solana)
2. **LI.FI Composer** — Multi-step transaction execution (bridge + swap + deposit in one flow)
3. **LI.FI API** — Server-side route validation and status tracking

The entire cross-chain execution layer is powered by LI.FI. Without LI.FI, users would need to manually bridge, swap, and deposit across 3 separate interfaces.

## 🛠 Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Cross-Chain**: LI.FI SDK + Composer
- **EVM Wallets**: RainbowKit + wagmi + viem
- **Solana Wallets**: @solana/wallet-adapter
- **DeFi Targets**: Marinade Finance, Kamino Lend
- **Deployment**: Vercel

## 🚀 Quick Start

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your keys
3. Run `npm install`
4. Run `npm run dev`
5. Open `http://localhost:3000`

## 📱 Flow

1. Connect EVM wallet (source) + Solana wallet (destination)
2. Set savings goal: source chain, token, amount, period
3. Choose target protocol on Solana (Marinade or Kamino)
4. Review LI.FI quote (fees, route, estimated time)
5. Confirm → LI.FI Composer executes bridge → swap → deposit
6. Track position on Dashboard

## 🎥 Demo

[Link to demo video]

## 👥 Team

Oleksandr / teremno — Builder  
GitHub: [@teremno](https://github.com/teremno)

## 📄 License

MIT
