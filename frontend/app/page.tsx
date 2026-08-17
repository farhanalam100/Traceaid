"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, CheckCircle2, Loader2, Menu, X } from "lucide-react";
import * as StellarSdk from "@stellar/stellar-sdk";
import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

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

async function fetchLedger(): Promise<LedgerRecord[]> {
  const server = new StellarSdk.rpc.Server(RPC_URL);
  const contract = new StellarSdk.Contract(CONTRACT_ID);
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
  return StellarSdk.scValToNative(result) as LedgerRecord[];
}

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
  if (sendResult.status === "ERROR") throw new Error("Transaction failed to submit");

  let getResult = await server.getTransaction(sendResult.hash);
  let attempts = 0;
  while (getResult.status === "NOT_FOUND" && attempts < 10) {
    await new Promise((r) => setTimeout(r, 1500));
    getResult = await server.getTransaction(sendResult.hash);
    attempts++;
  }
  return { hash: sendResult.hash, status: getResult.status };
}

function HeadlineWord({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className="block"
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ delay, duration: 0.7, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default function Home() {
  const [ledger, setLedger] = useState<LedgerRecord[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [wallet, setWallet] = useState<string | null>(null);
  const [donating, setDonating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = ["Ledger", "Campaigns", "Protocol", "Team"];

  const loadLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const records = await fetchLedger();
      setLedger(records.reverse());
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
    if (addr.address) setWallet(addr.address);
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

  const stats: [string, string][] = [
    ["~4s", "settlement time"],
    ["0.3%", "network fee"],
    ["100%", "on-chain trail"],
  ];

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
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex items-center gap-2"
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5A36" }} />
          <span
            className="text-[15px] font-semibold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            RELIEFCHAIN
          </span>
        </motion.div>

        <motion.nav
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="hidden md:flex items-center gap-8 text-[13px] font-medium tracking-wide"
          style={{ color: "#1B2A4A" }}
        >
          {navLinks.map((l) => (
            <a key={l} href="#" className="hover:opacity-60 transition-opacity">
              {l}
            </a>
          ))}
        </motion.nav>

        <motion.button
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
          onClick={connectWallet}
          className="text-[13px] font-medium px-4 py-2 rounded-full"
          style={{
            background: wallet ? "#E4E8E2" : "#10151F",
            color: wallet ? "#1B2A4A" : "#F2F4F1",
          }}
        >
          {wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : "Connect Wallet"}
        </motion.button>

        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden w-9 h-9 rounded-full flex items-center justify-center ml-2"
          style={{ background: "#10151F" }}
          aria-label="Open menu"
        >
          <Menu size={16} color="#F2F4F1" />
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex flex-col px-6 py-6"
            style={{ background: "#F2F4F1" }}
          >
            <div className="flex justify-end">
              <button
                onClick={() => setMenuOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "#10151F" }}
              >
                <X size={16} color="#F2F4F1" />
              </button>
            </div>
            <nav className="flex flex-col gap-6 mt-12">
              {navLinks.map((l) => (
                <a
                  key={l}
                  href="#"
                  className="text-3xl font-medium tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  onClick={() => setMenuOpen(false)}
                >
                  {l}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-12 pt-16 md:pt-24 pb-16 grid grid-cols-1 lg:grid-cols-[1.1fr,0.9fr] gap-14 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
            className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] uppercase mb-6 px-3 py-1.5 rounded-full"
            style={{ color: "#1B2A4A", background: "#E4E8E2" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1B8A5A" }} />
            Stellar-settled · Cross-border relief
          </motion.div>

          <h1
            className="font-semibold uppercase"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(2.4rem, 6vw, 4.6rem)",
              lineHeight: 0.98,
              letterSpacing: "-0.01em",
            }}
          >
            <HeadlineWord delay={0.3}>Aid that</HeadlineWord>
            <HeadlineWord delay={0.42}>arrives —</HeadlineWord>
            <HeadlineWord delay={0.54}>
              <span style={{ color: "#FF5A36" }}>and proves it.</span>
            </HeadlineWord>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75, ease: EASE }}
            className="mt-7 text-base md:text-lg max-w-md"
            style={{ color: "#4A5354" }}
          >
            Every donation settles on Stellar in seconds and leaves a public
            record — from a donor's wallet to a verified relief site. No
            intermediaries. No missing funds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9, ease: EASE }}
            className="mt-9 flex flex-col gap-3"
          >
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.1, ease: EASE }}
            className="mt-12 flex items-center gap-8 pt-6"
            style={{ borderTop: "1px solid #D8D3C7" }}
          >
            {stats.map(([num, label]) => (
              <div key={label}>
                <div
                  className="text-xl font-semibold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#10151F" }}
                >
                  {num}
                </div>
                <div className="text-[11px] uppercase tracking-wide mt-0.5" style={{ color: "#6B746C" }}>
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
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
                      <motion.span
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="flex items-center gap-1 text-[11px] font-medium"
                        style={{ color: tx.kind === "release" ? "#3FCB8C" : "#FF9F6B" }}
                      >
                        {tx.kind === "release" && <CheckCircle2 size={12} />}
                        {tx.kind}
                      </motion.span>
                    </div>
                    <div className="mt-1.5 text-[13px] font-mono font-medium" style={{ color: "#FF5A36" }}>
                      {tx.amount} XLM
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
