# ReliefChain

Traceaid is a transparent disaster-relief funding platform built on Stellar and Soroban. It helps donors send money to verified relief campaigns, lets NGOs and field partners track allocations, and makes the complete funding trail auditable on-chain.

The project combines a polished Next.js frontend with a Soroban smart contract that models a fund ledger and release flow for humanitarian use cases.

## Why Traceaid

Disaster relief often suffers from fragmented reporting, delayed transfers, and weak visibility into how funds are used. Traceaid addresses this by creating a public, auditable trail from donor to verified relief campaign and recipient milestones.

Core goals:
- transparent donation flow
- real-time proof of delivery visibility
- on-chain ledger for campaign activity
- clean, trustworthy experience for donors and NGOs
- demo-friendly landing page for fundraising and impact storytelling

## Features

- warm editorial landing page for the Traceaid brand
- campaign cards for active and upcoming relief programs
- in-page modal details for product, use case, developer, and community information
- wallet integration with Freighter for Stellar testnet interaction
- ledger view showing donation and release events
- Soroban escrow-style contract structure for donation and campaign tracking
- built for demo and presentation use on Stellar testnet

## Tech stack

- Frontend: Next.js 16, React 19, TypeScript
- UI: Framer Motion, Lucide React
- Blockchain: Stellar, Soroban, Freighter wallet
- Smart contract: Rust + Soroban SDK

## Project structure

```text
Traceaid/
├── README.md
├── frontend/
│   ├── app/
│   ├── package.json
│   ├── tsconfig.json
│   └── ...
├── contracts/
│   └── escrow/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs
└── .gitignore
```

## Prerequisites

Before running the app, make sure you have:

- Node.js 18+
- npm
- Rust + Cargo
- Freighter browser extension installed

## Frontend setup

From the project root:

```bash
cd frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Smart contract setup

The Soroban contract is located in:

```text
contracts/escrow
```

To build the contract:

```bash
cd contracts/escrow
cargo build --target wasm32-unknown-unknown
```

To optimize for release:

```bash
cargo build --target wasm32-unknown-unknown --release
```

## Freighter wallet demo notes

For wallet functionality to work:

- install the Freighter browser extension
- enable it in the browser
- allow access for localhost / localhost:3000
- refresh the page after enabling permissions

If Freighter is not permitted for the current site, the app will show a status message instead of opening the wallet popup.

## Demo flow

A good judge-facing flow is:

1. Open the landing page
2. Scroll through the hero and campaign cards
3. Click a campaign card to view a detailed panel
4. Click a footer item to open a different content popup
5. Use the Connect wallet action
6. Trigger the donation flow
7. Show the ledger panel updating with the transaction record

This demonstrates the user journey from trust, to donation, to visible proof of delivery.

## Current status

This project is structured as a functional demo for a humanitarian blockchain application. The UI is polished for presentation, the landing page is interactive, and the wallet/ledger flow is designed to show a realistic humanitarian funding experience on Stellar testnet.

## License

This project is intended for demonstration and prototype use.

## Contact

For questions or collaboration, contact the project maintainer or repository owner.

## Summary

Traceaid is a blockchain-based relief funding interface that turns aid distribution into a transparent and auditable process. It is designed to show how modern public infrastructure can improve trust, accountability, and speed in crisis response.

