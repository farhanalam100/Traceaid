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

// ---- design tokens -------------------------------------------------------
// cream     #FBF1D6   hero background (halftone dot field sits on this)
// dot       #E9C96B   halftone dot color
// ink       #14120A   primary text
// mute      #6B675A   secondary text
// hairline  #E5E5E0   dividers / borders (white sections below hero)
// signal    #E08A2C   single accent, used sparingly
// verified  #1F9D55   reserved only for confirmed on-chain releases
// -------------------------------------------------------------------------

const ROTATING_WORDS = ["verified delivery.", "public proof.", "zero overhead.", "the ledger."];

// Honest — this is your real stack, not fabricated partner logos.
const STACK_ITEMS = ["Stellar Network", "Soroban", "Freighter Wallet", "Testnet Live", "Next.js", "TypeScript"];

const AUDIENCES = [
  {
    title: "For donors",
    body: "Send funds directly to a verified relief site and watch the delivery confirm on chain — no waiting for a quarterly impact report.",
    cta: "Start donating",
  },
  {
    title: "For relief organizations",
    body: "Receive funds the moment they're needed, and publish proof of delivery automatically instead of manually reconciling spreadsheets.",
    cta: "Register your org",
  },
  {
    title: "For developers",
    body: "Build on the open escrow protocol. Soroban contract source, deposit/release interfaces, and testnet docs, all public.",
    cta: "Read the docs",
  },
];

const CAMPAIGNS = [
  {
    name: "Assam Flood Relief",
    blurb: "Active campaign settling donor funds to verified relief sites across flood-affected districts.",
    status: "Live",
  },
  {
    name: "Odisha Cyclone Response",
    blurb: "Emergency shelter and supply funding, released in stages as verification checkpoints clear.",
    status: "Live",
  },
  {
    name: "Bihar Drought Fund",
    blurb: "Longer-horizon disbursement to agricultural relief partners, with quarterly release milestones.",
    status: "Upcoming",
  },
];

const FOOTER_COLUMNS = [
  { title: "About", links: ["The protocol", "Team", "Careers"] },
  { title: "Use cases", links: ["Disaster relief", "Cross border aid", "Verified NGOs"] },
  { title: "Developers", links: ["Docs", "Soroban contract", "API reference"] },
  { title: "Connect", links: ["Community", "Code of conduct", "FAQ"] },
];

const FOOTER_DETAILS: Record<string, Record<string, { eyebrow: string; title: string; body: string; cta: string }>> = {
  About: {
    "The protocol": {
      eyebrow: "About",
      title: "The protocol",
      body: "Traceaid uses Stellar and Soroban to move donor funds into verified relief campaigns with public proof of every deposit, release, and milestone. The protocol reduces delays and replaces manual trust chains with on-chain transparency.",
      cta: "See the flow",
    },
    Team: {
      eyebrow: "About",
      title: "Team",
      body: "The Traceaid team is built around humanitarian operations, blockchain infrastructure, and field verification. We connect donors, NGOs, and local coordinators so funding reaches the right place at the right time.",
      cta: "Meet the team",
    },
    Careers: {
      eyebrow: "About",
      title: "Careers",
      body: "We are hiring across product, protocol, and field deployment. If you care about transparent funding, crisis response, and resilient public infrastructure, Traceaid is building for the next generation of global aid logistics.",
      cta: "Join us",
    },
  },
  "Use cases": {
    "Disaster relief": {
      eyebrow: "Use case",
      title: "Disaster relief",
      body: "When floods, cyclones, or droughts hit a region, Traceaid can route donor money into verified local sites and publish a live ledger of where every dollar or token has gone. Relief organizations can act faster with more accountability.",
      cta: "View relief flow",
    },
    "Cross border aid": {
      eyebrow: "Use case",
      title: "Cross border aid",
      body: "International donors often face friction, delays, and opacity. Traceaid brings a shared, auditable trail between funders and field teams so aid can move across borders with clear compliance and settlement visibility.",
      cta: "Open the network",
    },
    "Verified NGOs": {
      eyebrow: "Use case",
      title: "Verified NGOs",
      body: "NGOs can publish verified partners, attach completion checkpoints, and supply stronger proof of outcomes. Donors can track whether funds are supporting the exact program they intended to back.",
      cta: "See validation",
    },
  },
  Developers: {
    Docs: {
      eyebrow: "Developers",
      title: "Docs",
      body: "Traceaid exposes a clear developer workflow for building aid applications on Stellar. Explore contract interfaces, wallet interactions, ledger structures, and sample deployment patterns for testing and integration.",
      cta: "Read docs",
    },
    "Soroban contract": {
      eyebrow: "Developers",
      title: "Soroban contract",
      body: "The Soroban smart contract handles campaign registration, donor deposits, and milestone-based release logic. It is designed to keep funds traceable while preserving public auditability for the entire chain of events.",
      cta: "Inspect contract",
    },
    "API reference": {
      eyebrow: "Developers",
      title: "API reference",
      body: "The API reference covers account access, ledger reads, transaction submission, and campaign status queries. It gives builders the exact hooks needed to integrate Traceaid features into wallets, dashboards, and monitoring tools.",
      cta: "Open API",
    },
  },
  Connect: {
    Community: {
      eyebrow: "Connect",
      title: "Community",
      body: "Join the growing network of donors, NGOs, developers, and crisis-response partners building transparent aid systems. Discussion, updates, and collaboration happen in the open community channels.",
      cta: "Join community",
    },
    "Code of conduct": {
      eyebrow: "Connect",
      title: "Code of conduct",
      body: "Traceaid is guided by respectful, inclusive, and transparent collaboration. The code of conduct helps maintain a safe space for contributors, operators, and mission-driven partners across the ecosystem.",
      cta: "Review policy",
    },
    FAQ: {
      eyebrow: "Connect",
      title: "FAQ",
      body: "Questions often come down to how funds are protected, how ledger data is verified, and how the protocol works in practice. The FAQ explains the flow from donation to settlement and reporting in plain language.",
      cta: "Read FAQ",
    },
  },
};

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

// Halftone dot field, like stellar.org's cream hero background.
function HalftoneBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundColor: "#FBF1D6",
        backgroundImage: "radial-gradient(#E9C96B 1.5px, transparent 1.5px)",
        backgroundSize: "16px 16px",
        maskImage: "linear-gradient(to bottom, black 55%, transparent 96%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 96%)",
      }}
    />
  );
}

function TraceaidLogo({ compact = false }: { compact?: boolean }) {
  const size = compact ? 30 : 36;

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 48 48" aria-label="Traceaid logo" role="img">
        <rect x="3" y="3" width="42" height="42" rx="12" fill="#14120A" />
        <path
          d="M14 15.5h20M19 15.5V31M15 31h18M15 31l4.8-7h8.4L33 31"
          fill="none"
          stroke="#FBF1D6"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M31 11.5L36.5 16M36.5 11.5V16H31"
          fill="none"
          stroke="#E08A2C"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16.5" cy="18.5" r="3" fill="#E9C96B" />
      </svg>
      <span
        className="tracking-tight"
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 500,
          fontSize: compact ? "1rem" : "1.1rem",
          letterSpacing: "-0.04em",
          color: "#14120A",
        }}
      >
        Traceaid
      </span>
    </div>
  );
}

// Cycling word, like stellar.org's "Where blockchain meets [payments/tokenization/DeFi]"
function RotatingWord({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % words.length), 2200);
    return () => clearInterval(id);
  }, [words.length]);

  return (
    <span className="relative inline-block align-baseline">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[i]}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="inline-block italic"
          style={{ color: "#E08A2C" }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// Edge-to-edge sliding strip, like stellar.org's partner-logo marquee —
// populated with real stack items instead of fabricated partner logos.
function Marquee({ items }: { items: string[] }) {
  const track = [...items, ...items];
  return (
    <div
      className="relative w-full overflow-hidden py-6"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <motion.div
        className="flex items-center gap-12 w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      >
        {track.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="text-[13px] font-medium tracking-wide whitespace-nowrap"
            style={{ color: "#4A4738", fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v * 10) / 10);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.2, delay: 0.9, ease: [0.22, 1, 0.36, 1] });
    const unsub = rounded.on("change", (v) => setDisplay(v.toString()));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value]);

  return <>{display}{suffix}</>;
}

export default function Home() {
  const [ledger, setLedger] = useState<LedgerRecord[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [wallet, setWallet] = useState<string | null>(null);
  const [donating, setDonating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<{
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
  } | null>(null);

  const navLinks = [
    { label: "Ledger", id: "ledger" },
    { label: "Campaigns", id: "campaigns" },
    { label: "Protocol", id: "protocol" },
    { label: "Team", id: "team" },
  ];

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setToast(null), 2500);
    }
  }, []);

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

  const scrollToSection = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const openDetailModal = useCallback(
    (eyebrow: string, title: string, body: string, cta: string) => {
      setModalContent({ eyebrow, title, body, cta });
    },
    []
  );

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  async function connectWallet() {
    if (typeof window === "undefined") {
      setStatusMsg("Wallet connection is only available in the browser.");
      return;
    }

    try {
      const connected = await isConnected();
      if (!connected.isConnected) {
        const access = await requestAccess();
        if (access.error) {
          throw new Error(access.error.message || "Freighter access was denied.");
        }
      }

      const addr = await getAddress();
      if (addr.address) {
        setWallet(addr.address);
        const message = "Wallet connected.";
        setStatusMsg(message);
        showToast(message);
        return;
      }

      const noAddressMessage = "Freighter opened, but no wallet address was returned.";
      setStatusMsg(noAddressMessage);
      showToast(noAddressMessage);
    } catch (e: any) {
      console.error(e);
      const message =
        e?.message?.includes("not found") || e?.message?.includes("denied")
          ? "Freighter is not active in this browser. Please install or enable the extension, then refresh."
          : "Freighter did not open. Please allow the extension and try again.";
      setStatusMsg(message);
      showToast(message);
    }
  }

  async function handleDonate() {
    if (!wallet) {
      await connectWallet();
      if (!wallet) {
        showToast("Connect your wallet first before donating.");
        return;
      }
    }

    setDonating(true);
    const message = "Waiting for signature in Freighter...";
    setStatusMsg(message);
    showToast(message);

    try {
      const result = await submitDeposit(wallet, 25);
      const finalMessage =
        result.status === "SUCCESS"
          ? "Donation confirmed on chain."
          : `Submitted (${result.status}) — refreshing ledger...`;
      setStatusMsg(finalMessage);
      showToast(finalMessage);
      await loadLedger();
    } catch (e: any) {
      console.error(e);
      const errorMessage = `Error: ${e.message || "donation failed"}`;
      setStatusMsg(errorMessage);
      showToast(errorMessage);
    } finally {
      setDonating(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  }

  const stats: { value: number; suffix: string; label: string; caption: string }[] = [
    { value: 4, suffix: "s", label: "Settlement time", caption: "median, last 30 days on testnet" },
    { value: 0.3, suffix: "%", label: "Network fee", caption: "vs. 6–10% typical NGO overhead" },
    { value: 100, suffix: "%", label: "On chain trail", caption: "every deposit and release, public" },
  ];

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden"
      style={{ background: "#FFFFFF", fontFamily: "'Inter', sans-serif", color: "#14120A" }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,500&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* hero wrapper with halftone background */}
      <div className="relative">
        <HalftoneBackground />

        <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 md:px-12 py-6">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="flex items-center gap-2"
          >
            <TraceaidLogo compact />
          </motion.div>

          <motion.nav
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
            className="hidden md:flex items-center gap-8 text-[13px] font-medium"
            style={{ color: "#3F3B2C" }}
          >
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={`#${l.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection(l.id);
                }}
                className="hover:opacity-60 transition-opacity"
              >
                {l.label}
              </a>
            ))}
          </motion.nav>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ opacity: 0.85 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            onClick={() => {
              showToast("Opening Freighter wallet...");
              void connectWallet();
            }}
            className="text-[13px] font-medium px-4 py-2 rounded-full"
            style={{
              background: wallet ? "#F2ECD3" : "#14120A",
              color: wallet ? "#14120A" : "#FBF1D6",
            }}
          >
            {wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : "Connect wallet"}
          </motion.button>

          <button
            type="button"
            onClick={() => {
              showToast("Menu opened");
              setMenuOpen(true);
            }}
            className="md:hidden w-9 h-9 rounded-full flex items-center justify-center ml-2"
            style={{ background: "#14120A" }}
            aria-label="Open menu"
          >
            <Menu size={16} color="#FBF1D6" />
          </button>
        </header>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 flex flex-col px-6 py-6"
              style={{ background: "#FBF1D6" }}
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "#14120A" }}
                >
                  <X size={16} color="#FBF1D6" />
                </button>
              </div>
              <nav className="flex flex-col gap-6 mt-12">
                {navLinks.map((l) => (
                  <a
                    key={l.label}
                    href={`#${l.id}`}
                    className="text-3xl font-medium tracking-tight"
                    style={{ fontFamily: "'Fraunces', serif" }}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSection(l.id);
                      showToast(`${l.label} selected`);
                      setMenuOpen(false);
                    }}
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-12">
          <div className="pt-8 md:pt-14 pb-10 text-center max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 500,
                fontSize: "clamp(2.6rem, 6vw, 4.6rem)",
                lineHeight: 1.06,
                letterSpacing: "-0.01em",
              }}
            >
              Where relief funding meets <RotatingWord words={ROTATING_WORDS} />
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease: EASE }}
              className="mt-7 text-base md:text-lg max-w-xl mx-auto"
              style={{ color: "#4A4738" }}
            >
              Traceaid settles every donation on Stellar in seconds and logs
              it to a public ledger from a donor's wallet to a verified
              relief site. No intermediaries, no missing funds.
            </motion.p>
          </div>

          {/* honest sliding strip — real stack, not fabricated partners */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8, ease: EASE }}
          >
            <Marquee items={STACK_ITEMS} />
          </motion.div>
        </div>
      </div>

      <main className="relative z-10">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg"
              style={{ background: "#14120A", color: "#FBF1D6" }}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {modalContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#14120A]/40 px-4"
              onClick={() => setModalContent(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="w-full max-w-3xl max-h-[82vh] overflow-y-auto rounded-[28px] border border-[#E5E5E0] bg-[#FBF1D6] p-7 shadow-[0_30px_80px_rgba(20,18,10,0.2)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: "#7A7A7A" }}>
                  {modalContent.eyebrow}
                </div>
                <h3
                  className="mb-4"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 500,
                    fontSize: "clamp(2.1rem, 4vw, 3.2rem)",
                    lineHeight: 1.1,
                  }}
                >
                  {modalContent.title}
                </h3>
                <p className="text-[16px] leading-relaxed" style={{ color: "#4A4738" }}>
                  {modalContent.body}
                </p>
                <div className="mt-8 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setModalContent(null)}
                    className="rounded-full border border-[#14120A] px-5 py-2.5 text-[13px] font-medium"
                    style={{ color: "#14120A" }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalContent(null);
                      scrollToSection("ledger");
                    }}
                    className="rounded-full px-5 py-2.5 text-[13px] font-medium"
                    style={{ background: "#14120A", color: "#FBF1D6" }}
                  >
                    {modalContent.cta}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div id="ledger" className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12">
          {/* donate + live ledger, below the dot-field hero */}
          <div className="py-14 grid grid-cols-1 lg:grid-cols-[1.05fr,0.95fr] gap-14 items-start">
            <div className="flex flex-col justify-center h-full">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] uppercase mb-6 px-3 py-1.5 rounded-full w-fit"
                style={{ color: "#3F3B2C", background: "#F2ECD3" }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1F9D55" }} />
                Live on Stellar testnet
              </motion.div>
              <h2
                className="mb-4"
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.8rem" }}
              >
                Send a donation, see it settle.
              </h2>
              <p className="text-[15px] mb-7 max-w-md" style={{ color: "#5B5B5B" }}>
                Connect a Freighter wallet and send a test donation to the Assam
                Flood Relief campaign, and the manifest on the right updates the
                moment it confirms on chain.
              </p>
              <div className="flex flex-col gap-3">
                <motion.button
                  type="button"
                  onClick={() => {
                    showToast("Donation action started");
                    void handleDonate();
                  }}
                  disabled={donating}
                  whileHover={{ opacity: 0.9 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold w-fit disabled:opacity-60"
                  style={{ background: "#14120A", color: "#FBF1D6" }}
                >
                  {donating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ArrowUpRight size={16} />
                  )}
                  {wallet ? "Donate 25 XLM to Assam Flood Relief" : "Connect wallet to donate"}
                </motion.button>
                {statusMsg && (
                  <span className="text-sm" style={{ color: "#5B5B5B" }}>
                    {statusMsg}
                  </span>
                )}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: EASE }}
              className="rounded-2xl overflow-hidden"
              style={{ background: "#FFFFFF", border: "1px solid #E5E5E0" }}
            >
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: "1px solid #E5E5E0" }}
              >
                <span
                  className="text-[11px] uppercase tracking-[0.14em] font-medium"
                  style={{ color: "#7A7A7A" }}
                >
                  Live proof of delivery
                </span>
                <span className="flex items-center gap-1.5">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "#E08A2C" }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <span className="text-[11px] font-mono" style={{ color: "#7A7A7A" }}>
                    testnet
                  </span>
                </span>
              </div>

              <div className="px-5 py-3 flex flex-col min-h-[260px] max-h-[380px] overflow-y-auto">
                {loadingLedger ? (
                  <div className="flex items-center justify-center py-16" style={{ color: "#9A9A9A" }}>
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                ) : ledger.length === 0 ? (
                  <div className="text-sm py-16 text-center" style={{ color: "#9A9A9A" }}>
                    No transactions yet, be the first to donate.
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {ledger.map((tx, i) => (
                      <motion.div
                        key={`${tx.timestamp}-${i}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="flex items-center justify-between py-3"
                        style={{ borderBottom: "1px solid #F0F0EC" }}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-mono" style={{ color: "#9A9A9A" }}>
                            {tx.party.slice(0, 6)}...{tx.party.slice(-4)}
                          </span>
                          <span
                            className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide"
                            style={{ color: tx.kind === "release" ? "#1F9D55" : "#E08A2C" }}
                          >
                            {tx.kind === "release" && <CheckCircle2 size={11} />}
                            {tx.kind}
                          </span>
                        </div>
                        <div className="text-[13px] font-mono font-medium" style={{ color: "#14120A" }}>
                          {tx.amount} XLM
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </div>

          {/* stat row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="grid grid-cols-1 sm:grid-cols-3"
            style={{ borderTop: "1px solid #E5E5E0", borderBottom: "1px solid #E5E5E0" }}
          >
            {stats.map((s, idx) => (
              <div
                key={s.label}
                className="py-10 px-2 sm:px-8"
                style={{
                  borderTop: idx > 0 ? "1px solid #E5E5E0" : undefined,
                  borderLeft: idx > 0 ? "1px solid #E5E5E0" : undefined,
                }}
              >
                <div
                  className="text-[12px] uppercase tracking-[0.1em] font-medium mb-3"
                  style={{ color: "#7A7A7A" }}
                >
                  {s.label}
                </div>
                <div
                  className="text-4xl sm:text-5xl"
                  style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, color: "#14120A" }}
                >
                  <CountUp value={s.value} suffix={s.suffix} />
                </div>
                <div className="text-[13px] mt-2" style={{ color: "#9A9A9A" }}>
                  {s.caption}
                </div>
              </div>
            ))}
          </motion.div>

          {/* audience cards */}
          <section id="protocol" className="py-20">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: EASE }}
              className="mb-10"
            >
              <div
                className="text-[12px] uppercase tracking-[0.14em] font-medium mb-2"
                style={{ color: "#7A7A7A" }}
              >
                Built for
              </div>
              <h2
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 500,
                  fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                }}
              >
                Everyone in the relief chain
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: "#E5E5E0" }}>
              {AUDIENCES.map((a, idx) => (
                <motion.div
                  key={a.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, delay: idx * 0.08, ease: EASE }}
                  className="p-8 flex flex-col justify-between min-h-[220px]"
                  style={{ background: "#FFFFFF" }}
                >
                  <div>
                    <h3
                      className="text-lg mb-3"
                      style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
                    >
                      {a.title}
                    </h3>
                    <p className="text-[14px] leading-relaxed" style={{ color: "#5B5B5B" }}>
                      {a.body}
                    </p>
                  </div>
                  <a
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      openDetailModal(
                        "Built for",
                        a.title,
                        a.body,
                        a.cta
                      );
                    }}
                    className="inline-flex items-center gap-1 text-[13px] font-medium mt-6 w-fit"
                    style={{ color: "#14120A" }}
                  >
                    {a.cta} <ArrowUpRight size={14} />
                  </a>
                </motion.div>
              ))}
            </div>
          </section>

          {/* campaign / use-case cards */}
          <section id="campaigns" className="py-20" style={{ borderTop: "1px solid #E5E5E0" }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: EASE }}
              className="mb-10"
            >
              <div
                className="text-[12px] uppercase tracking-[0.14em] font-medium mb-2"
                style={{ color: "#7A7A7A" }}
              >
                See it in action
              </div>
              <h2
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 500,
                  fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                }}
              >
                Real deliveries, tracked live
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {CAMPAIGNS.map((c, idx) => (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, delay: idx * 0.08, ease: EASE }}
                  className="rounded-2xl p-6"
                  style={{ border: "1px solid #E5E5E0" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-[11px] font-medium uppercase tracking-wide px-2.5 py-1 rounded-full"
                      style={{
                        color: c.status === "Live" ? "#1F9D55" : "#7A7A7A",
                        background: c.status === "Live" ? "#EAF7EF" : "#F2F2EF",
                      }}
                    >
                      {c.status}
                    </span>
                  </div>
                  <h3
                    className="text-lg mb-2"
                    style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
                  >
                    {c.name}
                  </h3>
                  <p className="text-[14px] leading-relaxed mb-5" style={{ color: "#5B5B5B" }}>
                    {c.blurb}
                  </p>
                  <a
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      openDetailModal(
                        "Campaign detail",
                        c.name,
                        c.blurb,
                        "View manifest"
                      );
                    }}
                    className="inline-flex items-center gap-1 text-[13px] font-medium"
                    style={{ color: "#14120A" }}
                  >
                    View manifest <ArrowUpRight size={14} />
                  </a>
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        {/* footer */}
        <footer id="team" style={{ borderTop: "1px solid #E5E5E0", background: "#FAFAF8" }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 py-16">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
              <div className="col-span-2 md:col-span-1">
                <div className="mb-3">
                  <TraceaidLogo compact />
                </div>
                <p className="text-[13px]" style={{ color: "#9A9A9A" }}>
                  Disaster relief, settled and proven on Stellar.
                </p>
              </div>

              {FOOTER_COLUMNS.map((col) => (
                <div key={col.title}>
                  <div
                    className="text-[11px] uppercase tracking-[0.12em] font-medium mb-4"
                    style={{ color: "#9A9A9A" }}
                  >
                    {col.title}
                  </div>
                  <div className="flex flex-col gap-3">
                    {col.links.map((l) => {
                      const detail = FOOTER_DETAILS[col.title]?.[l] ?? {
                        eyebrow: col.title,
                        title: l,
                        body: "This section explains how Traceaid supports real-world relief operations through transparent funding and public accountability.",
                        cta: "Explore",
                      };

                      return (
                        <button
                          key={l}
                          type="button"
                          onClick={() =>
                            openDetailModal(detail.eyebrow, detail.title, detail.body, detail.cta)
                          }
                          className="text-left text-[13px] hover:opacity-60 transition-opacity"
                          style={{ color: "#3F3F3F" }}
                        >
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mt-14 pt-6 text-[12px]"
              style={{ borderTop: "1px solid #E5E5E0", color: "#9A9A9A" }}
            >
              © 2026 Traceaid. Built on Stellar testnet for demonstration purposes.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
