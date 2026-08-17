"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react";
import * as StellarSdk from "@stellar/stellar-sdk";
import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ---- Contract config ----
const CONTRACT_ID =
  "CAZ6IXB27W6ZGT5LFF5C2L2VADRYF5JGLH4E7GG2V3OEJL44NRZNBWTE";
const RPC_URL = "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const CAMPAIGN_ID = "assam_floods";

type LedgerRecord = {
  amount: string;
  campaign_id: string;
  kind: string;
  party: string;
  timestamp: number;
};

// Read the ledger by simulating a get_ledger call (read-only, no signing needed)
async function fetchLedger(): Promise<LedgerRecord[]> {
  const server = new StellarSdk.rpc.Server(RPC_URL);
  const contract = new StellarSdk.Contract(CONTRACT_ID);

  // Use a throwaway source account for simulation (read calls don't need real funds)
  const sourceKeypair = StellarSdk.Keypair.random();
  const account = new StellarSdk.Account(sourceKeypair.publicKey(), "0");

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call("get_ledger", StellarSdk.nativeToScVal(CAMPAIGN_ID, { type: "symbol" }))
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (StellarSdk.rpc.Api.isSimulationError(sim)) {
    console.error("Simulation error:", sim.error);
    return [];
  }

  const result = sim.result?.retval;
  if (!result) return [];

  const decoded = StellarSdk.scValToNative(result);
  return decoded as LedgerRecord[];
}

// Submit a real, wallet-signed deposit transaction
async function submitDeposit(donorAddress: string, amount: number) {
  const server = new StellarSdk.rpc.Server(RPC_URL);
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const account = await server.getAccount(donorAddress);

  let tx = new StellarSdk.TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "deposit",
        StellarSdk.nativeToScVal(donorAddress, { type: "address" }),
        StellarSdk.nativeToScVal(amount, { type: "i128" }),
        StellarSdk.nativeToScVal(CAMPAIGN_ID, { type: "symbol" })
      )
    )
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);

  const signResult = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if ("error" in signResult && signResult.error) {
    throw new Error(String(signResult.error));
  }

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error("Transaction failed to submit");
  }

  // Poll for confirmation
  let getResult = await server.getTransaction(sendResult.hash);
  let attempts = 0;
  while (getResult.status === "NOT_FOUND" && attempts < 10) {
    await new Promise((r) => setTimeout(r, 1500));
    getResult = await server.getTransaction(sendResult.hash);
    attempts++;
  }

  return { hash: sendResult.hash, status: getResult.status };
}

export default function Home() {
  const [ledger, setLedger] = useState<LedgerRecord[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [wallet, setWallet] = useState<string | null>(null);
  const [donating, setDonating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const records = await fetchLedger();
      setLedger(records.reverse()); // newest first
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  async function connectWallet() {
    const connected = await isConnected();
    if (!connected.isConnected) {
      await requestAccess();
    }
    const addr = await getAddress();
    if (addr.address) {
      setWallet(addr.address);
    }
  }

  async function handleDonate() {
    if (!wallet) {
      await connectWallet();
      return;
    }
    setDonating(true);
    setStatusMsg("Waiting for signature in Freighter...");
    try {
      const result = await submitDeposit(wallet, 25);
      setStatusMsg(
        result.status === "SUCCESS"
          ? "Donation confirmed on-chain!"
          : `Submitted (${result.status}) — refreshing ledger...`
      );
      await loadLedger();
    } catch (e: any) {
      console.error(e);
      setStatusMsg(`Error: ${e.message || "donation failed"}`);
    } finally {
      setDonating(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  }

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden"
      style={{ background: "#F2F4F1", fontFamily: "'Inter', sans-serif", color: "#10151F" }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(#D8D3C7 1px, transparent 1px), linear-gradient(90deg, #D8D3C7 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 30% 20%, black 0%, transparent 70%)",
        }}
      />

      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 md:px-12 pt-6">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5A36" }} />
          <span
            className="text-[15px] font-semibold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            RELIEFCHAIN
          </span>
        </div>

        <button
          onClick={connectWallet}
          className="text-[13px] font-medium px-4 py-2 rounded-full"
          style={{
            background: wallet ? "#E4E8E2" : "#10151F",
            color: wallet ? "#1B2A4A" : "#F2F4F1",
          }}
        >
          {wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : "Connect Wallet"}
        </button>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-12 pt-16 md:pt-24 pb-16 grid grid-cols-1 lg:grid-cols-[1.1fr,0.9fr] gap-14 items-center">
        <div>
          <div
            className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] uppercase mb-6 px-3 py-1.5 rounded-full"
            style={{ color: "#1B2A4A", background: "#E4E8E2" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1B8A5A" }} />
            Stellar-settled · Cross-border relief
          </div>

          <h1
            className="font-semibold uppercase"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(2.4rem, 6vw, 4.6rem)",
              lineHeight: 0.98,
              letterSpacing: "-0.01em",
            }}
          >
            Aid that
            <br />
            arrives —
            <br />
            <span style={{ color: "#FF5A36" }}>and proves it.</span>
          </h1>

          <p className="mt-7 text-base md:text-lg max-w-md" style={{ color: "#4A5354" }}>
            Every donation settles on Stellar in seconds and leaves a public
            record — from a donor's wallet to a verified relief site.
          </p>

          <div className="mt-9 flex flex-col gap-3">
            <button
              onClick={handleDonate}
              disabled={donating}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold w-fit disabled:opacity-60"
              style={{ background: "#10151F", color: "#F2F4F1" }}
            >
              {donating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowUpRight size={16} />
              )}
              {wallet ? "Donate 25 to Assam Flood Relief" : "Connect wallet to donate"}
            </button>
            {statusMsg && (
              <span className="text-sm" style={{ color: "#4A5354" }}>
                {statusMsg}
              </span>
            )}
          </div>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#10151F", boxShadow: "0 24px 60px -20px rgba(16,21,31,0.35)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: "1px solid #232B3A" }}
          >
            <span
              className="text-[11px] uppercase tracking-[0.14em] font-medium"
              style={{ color: "#8A94A6" }}
            >
              Live proof-of-delivery
            </span>
            <span className="flex items-center gap-1.5">
              <motion.span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#FF5A36" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="text-[11px] font-mono" style={{ color: "#8A94A6" }}>
                testnet
              </span>
            </span>
          </div>

          <div className="px-5 py-4 flex flex-col gap-3 min-h-[280px] max-h-[420px] overflow-y-auto">
            {loadingLedger ? (
              <div className="flex items-center justify-center py-16" style={{ color: "#8A94A6" }}>
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : ledger.length === 0 ? (
              <div className="text-sm py-16 text-center" style={{ color: "#5D6A82" }}>
                No transactions yet — be the first to donate.
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {ledger.map((tx, i) => (
                  <motion.div
                    key={`${tx.timestamp}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="rounded-lg px-4 py-3"
                    style={{ background: "#161D2B", border: "1px solid #232B3A" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono" style={{ color: "#5D6A82" }}>
                        {tx.party.slice(0, 6)}...{tx.party.slice(-4)}
                      </span>
                      <span
                        className="flex items-center gap-1 text-[11px] font-medium"
                        style={{ color: tx.kind === "release" ? "#3FCB8C" : "#FF9F6B" }}
                      >
                        {tx.kind === "release" && <CheckCircle2 size={12} />}
                        {tx.kind}
                      </span>
                    </div>
                    <div className="mt-1.5 text-[13px] font-mono font-medium" style={{ color: "#FF5A36" }}>
                      {tx.amount} XLM
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
