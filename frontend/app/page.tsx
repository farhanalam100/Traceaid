"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowUpRight, CheckCircle2, Loader2, Menu, X } from "lucide-react";
import * as StellarSdk from "@stellar/stellar-sdk";
import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

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

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v * 10) / 10);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.4, delay: 1.1, ease: [0.22, 1, 0.36, 1] });
    const unsub = rounded.on("change", (v) => setDisplay(v.toString()));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value]);

  return <>{display}{suffix}</>;
}

function FloatingOrb({ color, size, top, left, delay }: { color: string; size: number; top: string; left: string; delay: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-full blur-3xl"
      style={{ background: color, width: size, height: size, top, left, opacity: 0.25 }}
      animate={{
        y: [0, -30, 0, 20, 0],
        x: [0, 20, -10, 0, 0],
        scale: [1, 1.1, 0.95, 1.05, 1],
      }}
      transition={{ duration: 14 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}


function HandNetworkIllustration() {
  return (
    <motion.svg
      viewBox="0 0 640 640"
      className="w-full h-full"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <defs>
        <linearGradient id="handGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1B2A4A" />
          <stop offset="100%" stopColor="#10151F" />
        </linearGradient>
        <radialGradient id="tokenGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF5A36" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FF5A36" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Open hand, palm up, simplified geometric silhouette */}
      <g transform="translate(60,300)">
        <path
          d="M40 220
             C10 210, -5 175, 10 140
             L 35 55
             C 38 40, 55 38, 58 53
             L 66 130
             L 72 40
             C 74 24, 92 24, 94 40
             L 100 132
             L 108 34
             C 111 18, 129 18, 131 35
             L 136 132
             L 146 55
             C 149 40, 166 42, 165 58
             L 158 150
             C 178 150, 192 168, 186 190
             L 172 232
             C 165 254, 142 268, 118 268
             L 78 268
             C 58 268, 46 250, 40 220 Z"
          fill="url(#handGrad)"
          stroke="#2A3B5C"
          strokeWidth="1.5"
        />
      </g>

      {/* Token hovering above palm */}
      <motion.circle
        cx="150"
        cy="270"
        r="60"
        fill="url(#tokenGlow)"
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="150"
        cy="270"
        r="22"
        fill="#F2F4F1"
        stroke="#FF5A36"
        strokeWidth="3"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.text
        x="150"
        y="278"
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill="#FF5A36"
        fontFamily="'Space Grotesk', sans-serif"
        animate={{ y: [270, 262, 270] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        ★
      </motion.text>

      {/* Network lines radiating outward - representing the on-chain trail */}
      {[
        { x2: 340, y2: 120, delay: 0 },
        { x2: 420, y2: 220, delay: 0.4 },
        { x2: 460, y2: 340, delay: 0.8 },
        { x2: 420, y2: 460, delay: 1.2 },
        { x2: 320, y2: 540, delay: 1.6 },
      ].map((line, i) => (
        <g key={i}>
          <motion.line
            x1="150"
            y1="270"
            x2={line.x2}
            y2={line.y2}
            stroke="#3A4558"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 1.2, delay: 1 + line.delay * 0.3, ease: EASE }}
          />
          <motion.circle
            cx={line.x2}
            cy={line.y2}
            r="7"
            fill="#1B8A5A"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.3, 1], opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.4 + line.delay * 0.3, ease: EASE }}
          />
          <motion.circle
            cx={line.x2}
            cy={line.y2}
            r="14"
            fill="none"
            stroke="#1B8A5A"
            strokeWidth="1.5"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 1.8, delay: 1.6 + line.delay * 0.3, repeat: Infinity, ease: "easeOut" }}
          />
        </g>
      ))}
    </motion.svg>
  );
}

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

  const stats: { value: number; suffix: string; label: string }[] = [
    { value: 4, suffix: "s", label: "settlement time" },
    { value: 0.3, suffix: "%", label: "network fee" },
    { value: 100, suffix: "%", label: "on-chain trail" },
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
      <FloatingOrb color="#FF5A36" size={420} top="-8%" left="55%" delay={0} />
      <FloatingOrb color="#1B2A4A" size={360} top="40%" left="-10%" delay={3} />
      <FloatingOrb color="#1B8A5A" size={280} top="70%" left="65%" delay={6} />

      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 md:px-12 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
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
          transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
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
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
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

      <div className="pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[55%] opacity-[0.55]" style={{ maskImage: "linear-gradient(to left, black 40%, transparent 90%)" }}>
        <HandNetworkIllustration />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-12 pt-16 md:pt-24 pb-16 grid grid-cols-1 lg:grid-cols-[1.1fr,0.9fr] gap-14 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: [0, -4, 0] }}
            transition={{
              opacity: { duration: 0.8, delay: 0.6, ease: EASE },
              y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.4 },
            }}
            whileHover={{ scale: 1.04 }}
            className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] uppercase mb-6 px-3 py-1.5 rounded-full cursor-default"
            style={{ color: "#1B2A4A", background: "#E4E8E2" }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#1B8A5A" }}
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
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
            <HeadlineWord delay={0.8}>Aid that</HeadlineWord>
            <HeadlineWord delay={0.95}>arrives —</HeadlineWord>
            <HeadlineWord delay={1.1}>
              <span style={{ color: "#FF5A36" }}>and proves it.</span>
            </HeadlineWord>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3, ease: EASE }}
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
            transition={{ duration: 0.8, delay: 1.5, ease: EASE }}
            className="mt-9 flex flex-col gap-3"
          >
            <motion.button
              onClick={handleDonate}
              disabled={donating}
              whileHover={{ scale: 1.035, boxShadow: "0 12px 28px -8px rgba(255,90,54,0.45)" }}
              whileTap={{ scale: 0.97 }}
              className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold w-fit disabled:opacity-60"
              style={{ background: "#10151F", color: "#F2F4F1" }}
            >
              <motion.span
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 20%, rgba(255,90,54,0.35) 50%, transparent 80%)",
                }}
                animate={{ x: ["-120%", "220%"] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "linear", repeatDelay: 1.2 }}
              />
              <span className="relative z-10 flex items-center gap-2">
                {donating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <motion.span
                    animate={{ x: [0, 3, 0], y: [0, -3, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowUpRight size={16} />
                  </motion.span>
                )}
                {wallet ? "Donate 25 to Assam Flood Relief" : "Connect wallet to donate"}
              </span>
            </motion.button>
            {statusMsg && (
              <span className="text-sm" style={{ color: "#4A5354" }}>
                {statusMsg}
              </span>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.7, ease: EASE }}
            className="mt-12 flex items-center gap-8 pt-6"
            style={{ borderTop: "1px solid #D8D3C7" }}
          >
            {stats.map((s) => (
              <div key={s.label}>
                <div
                  className="text-xl font-semibold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#10151F" }}
                >
                  <CountUp value={s.value} suffix={s.suffix} />
                </div>
                <div className="text-[11px] uppercase tracking-wide mt-0.5" style={{ color: "#6B746C" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, delay: 0.2, ease: EASE }}
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
                    whileHover={{ scale: 1.015, borderColor: "#3A4558" }}
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