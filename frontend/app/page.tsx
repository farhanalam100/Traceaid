"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowUpRight, CheckCircle2, Loader2, Menu, X, Radio } from "lucide-react";
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

// Hi-tech palette
const INK = "#05070A";
const PANEL = "#0B0F16";
const PANEL_BORDER = "#1C2430";
const CYAN = "#3EE6FF";
const CYAN_DIM = "#1B4A54";
const VIOLET = "#8B7CFF";
const TEXT_DIM = "#6B7684";
const TEXT_MID = "#9AA5B1";

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

// HUD corner-bracket frame — the signature structural motif
function BracketFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const corner = "absolute w-3 h-3 border-[#3EE6FF]";
  return (
    <div className={`relative ${className}`}>
      <span className={`${corner} top-0 left-0 border-t-2 border-l-2`} />
      <span className={`${corner} top-0 right-0 border-t-2 border-r-2`} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} />
      {children}
    </div>
  );
}

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v * 10) / 10);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.4, delay: 1.1, ease: EASE });
    const unsub = rounded.on("change", (v) => setDisplay(v.toString()));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value]);

  return <>{display}{suffix}</>;
}

function FloatingToken({
  label,
  color,
  delay,
  className,
}: {
  label: string;
  color: string;
  delay: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{
        opacity: [0.7, 1, 0.7],
        y: [0, -12, 0],
        x: [0, 8, 0],
        scale: [1, 1.04, 1],
      }}
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={`absolute flex items-center gap-2 rounded-full border px-2.5 py-1.5 backdrop-blur-sm ${className}`}
      style={{
        background: "rgba(11, 15, 22, 0.72)",
        borderColor: `${color}55`,
        boxShadow: `0 0 25px -10px ${color}`,
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span
        className="text-[10px] tracking-[0.16em] uppercase"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "#E9EEF5" }}
      >
        {label}
      </span>
    </motion.div>
  );
}

function OrbitalCryptoLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute right-[8%] top-[18%] h-[340px] w-[340px] rounded-full border"
        style={{ borderColor: "rgba(62,230,255,0.18)", boxShadow: "inset 0 0 28px rgba(62,230,255,0.08)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute right-[15%] top-[24%] h-[220px] w-[220px] rounded-full border"
        style={{ borderColor: "rgba(139,124,255,0.18)" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />

      <FloatingToken label="BTC" color="#F7931A" delay={0.2} className="right-[22%] top-[12%]" />
      <FloatingToken label="ETH" color="#6CC6FF" delay={1.1} className="right-[8%] top-[38%]" />
      <FloatingToken label="SOL" color="#7DFFB0" delay={0.7} className="right-[25%] top-[58%]" />
      <FloatingToken label="USDC" color="#4AD6A7" delay={1.8} className="right-[5%] top-[62%]" />
      <FloatingToken label="ADA" color="#2CC8FF" delay={2.3} className="right-[31%] top-[32%]" />
      <FloatingToken label="XLM" color="#A5F3FC" delay={3.1} className="right-[12%] top-[20%]" />
    </div>
  );
}

function ParticleNetwork() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const coreX = width * 0.72;
    const coreY = height * 0.42;

    type Node = { x: number; y: number; vx: number; vy: number; r: number };
    const NODE_COUNT = 46;
    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 0.6,
    }));

    let raf = 0;
    let t = 0;

    function resize() {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx!.scale(dpr, dpr);
    }
    window.addEventListener("resize", resize);

    function draw() {
      if (!ctx) return;
      t += 1;
      ctx.clearRect(0, 0, width, height);

      // glowing core
      const pulse = 0.75 + Math.sin(t * 0.02) * 0.25;
      const coreR = 90 * pulse;
      const grad = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreR);
      grad.addColorStop(0, "rgba(62,230,255,0.35)");
      grad.addColorStop(0.5, "rgba(62,230,255,0.12)");
      grad.addColorStop(1, "rgba(62,230,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(coreX, coreY, coreR, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "rgba(62,230,255,0.9)";
      ctx.arc(coreX, coreY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // update + draw nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        const dCore = Math.hypot(n.x - coreX, n.y - coreY);
        const nearCore = dCore < 260;

        ctx.beginPath();
        ctx.fillStyle = nearCore ? "rgba(139,124,255,0.7)" : "rgba(154,165,177,0.45)";
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        if (nearCore) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(62,230,255,${0.16 * (1 - dCore / 260)})`;
          ctx.lineWidth = 0.6;
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(coreX, coreY);
          ctx.stroke();
        }
      }

      // connect nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 90) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(107,118,132,${0.18 * (1 - d / 90)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" style={{ mixBlendMode: "screen" }} />;
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

  const navLinks = ["LEDGER", "CAMPAIGNS", "PROTOCOL", "TEAM"];

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
    setStatusMsg("AWAITING SIGNATURE...");
    try {
      const result = await submitDeposit(wallet, 25);
      setStatusMsg(
        result.status === "SUCCESS" ? "CONFIRMED ON-CHAIN" : `SUBMITTED (${result.status})`
      );
      await loadLedger();
    } catch (e: any) {
      console.error(e);
      setStatusMsg(`ERROR: ${e.message || "TRANSACTION FAILED"}`);
    } finally {
      setDonating(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  }

  const stats: { value: number; suffix: string; label: string }[] = [
    { value: 4, suffix: "S", label: "SETTLEMENT TIME" },
    { value: 0.3, suffix: "%", label: "NETWORK FEE" },
    { value: 100, suffix: "%", label: "ON-CHAIN TRAIL" },
  ];

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden"
      style={{ background: INK, fontFamily: "'Inter', sans-serif", color: "#E4E9EF" }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* fine grid + scanline texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            `linear-gradient(${PANEL_BORDER} 1px, transparent 1px), linear-gradient(90deg, ${PANEL_BORDER} 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 0%, transparent 75%)",
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${CYAN}, transparent)`, opacity: 0.5 }}
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <ParticleNetwork />
      </div>
      <OrbitalCryptoLayer />

      {/* nav */}
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 md:px-12 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="flex items-center gap-2.5"
        >
          <div className="relative w-2.5 h-2.5">
            <div className="absolute inset-0 rounded-full" style={{ background: CYAN }} />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: CYAN }}
              animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
          </div>
          <span
            className="text-[15px] font-semibold tracking-[0.08em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "#E4E9EF" }}
          >
            RELIEFCHAIN
          </span>
        </motion.div>

        <motion.nav
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
          className="hidden md:flex items-center gap-8 text-[11px] font-medium tracking-[0.14em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: TEXT_MID }}
        >
          {navLinks.map((l) => (
            <a key={l} href="#" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.75 }}>
              {l}
            </a>
          ))}
        </motion.nav>

        <motion.button
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ borderColor: CYAN }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
          onClick={connectWallet}
          className="text-[11px] font-medium px-4 py-2 tracking-[0.1em]"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: "transparent",
            border: `1px solid ${wallet ? CYAN : PANEL_BORDER}`,
            color: wallet ? CYAN : "#E4E9EF",
          }}
        >
          {wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : "CONNECT WALLET"}
        </motion.button>

        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden w-9 h-9 flex items-center justify-center ml-2"
          style={{ border: `1px solid ${PANEL_BORDER}` }}
        >
          <Menu size={16} color="#E4E9EF" />
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex flex-col px-6 py-6"
            style={{ background: INK }}
          >
            <div className="flex justify-end">
              <button
                onClick={() => setMenuOpen(false)}
                className="w-9 h-9 flex items-center justify-center"
                style={{ border: `1px solid ${PANEL_BORDER}` }}
              >
                <X size={16} color="#E4E9EF" />
              </button>
            </div>
            <nav className="flex flex-col gap-6 mt-12">
              {navLinks.map((l) => (
                <a
                  key={l}
                  href="#"
                  className="text-3xl font-medium tracking-tight"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: "#E4E9EF" }}
                  onClick={() => setMenuOpen(false)}
                >
                  {l}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-12 pt-16 md:pt-24 pb-16 grid grid-cols-1 lg:grid-cols-[1.1fr,0.9fr] gap-14 items-start">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
            className="inline-flex items-center gap-2 text-[10px] font-medium tracking-[0.18em] mb-8 px-3 py-1.5"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: CYAN,
              border: `1px solid ${CYAN_DIM}`,
              background: "rgba(62,230,255,0.04)",
            }}
          >
            <Radio size={11} />
            STELLAR-SETTLED // CROSS-BORDER RELIEF
          </motion.div>

          <h1
            className="font-semibold"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(2.6rem, 6.4vw, 5rem)",
              lineHeight: 0.98,
              letterSpacing: "-0.02em",
              color: "#F2F5F9",
            }}
          >
            <HeadlineWord delay={0.8}>Aid that</HeadlineWord>
            <HeadlineWord delay={0.95}>arrives —</HeadlineWord>
            <HeadlineWord delay={1.1}>
              <span style={{ color: CYAN }}>and proves it.</span>
            </HeadlineWord>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3, ease: EASE }}
            className="mt-7 text-base md:text-lg max-w-md"
            style={{ color: TEXT_MID }}
          >
            Every donation settles on Stellar in seconds and leaves a public,
            auditable record — from a donor's wallet to a verified relief
            site. No intermediaries. No missing funds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.5, ease: EASE }}
            className="mt-10 flex flex-col gap-3"
          >
            <motion.button
              onClick={handleDonate}
              disabled={donating}
              whileHover={{ y: -1, boxShadow: `0 0 0 1px ${CYAN}, 0 0 24px -4px ${CYAN}` }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-2 px-6 py-3.5 text-[13px] font-semibold w-fit disabled:opacity-60 tracking-[0.06em]"
              style={{ background: CYAN, color: "#05070A", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {donating ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
              {wallet ? "DONATE 25 · ASSAM FLOOD RELIEF" : "CONNECT WALLET TO DONATE"}
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.8, ease: EASE }}
              className="flex flex-wrap items-center gap-2"
            >
              {[
                "BTC",
                "ETH",
                "SOL",
                "XLM",
                "USDC",
              ].map((token, index) => (
                <motion.span
                  key={token}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 1.9 + index * 0.1 }}
                  className="rounded-full border px-2 py-1 text-[9px] tracking-[0.12em] uppercase"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    borderColor: "rgba(62,230,255,0.25)",
                    color: TEXT_MID,
                    background: "rgba(11,15,22,0.6)",
                  }}
                >
                  {token}
                </motion.span>
              ))}
            </motion.div>

            {statusMsg && (
              <span
                className="text-[11px] tracking-[0.08em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: TEXT_DIM }}
              >
                {statusMsg}
              </span>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.7, ease: EASE }}
            className="mt-14 flex items-center gap-10 pt-6"
            style={{ borderTop: `1px solid ${PANEL_BORDER}` }}
          >
            {stats.map((s) => (
              <div key={s.label}>
                <div
                  className="text-xl font-semibold"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: CYAN }}
                >
                  <CountUp value={s.value} suffix={s.suffix} />
                </div>
                <div
                  className="text-[9px] tracking-[0.12em] mt-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: TEXT_DIM }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* live ledger — terminal / HUD panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
        >
          <BracketFrame>
            <div
              className="overflow-hidden"
              style={{
                background: PANEL,
                border: `1px solid ${PANEL_BORDER}`,
                boxShadow: `0 0 60px -20px rgba(62,230,255,0.15)`,
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}
              >
                <span
                  className="text-[10px] tracking-[0.16em] font-medium"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: TEXT_MID }}
                >
                  LIVE_PROOF_OF_DELIVERY.LOG
                </span>
                <span className="flex items-center gap-1.5">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: CYAN }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <span
                    className="text-[10px] tracking-[0.1em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: CYAN }}
                  >
                    TESTNET
                  </span>
                </span>
              </div>

              <div className="px-4 py-4 flex flex-col gap-2.5 min-h-[300px] max-h-[440px] overflow-y-auto">
                {loadingLedger ? (
                  <div className="flex items-center justify-center py-16" style={{ color: TEXT_DIM }}>
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                ) : ledger.length === 0 ? (
                  <div
                    className="text-[12px] py-16 text-center tracking-wide"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: TEXT_DIM }}
                  >
                    NO ENTRIES YET — BE THE FIRST TO DONATE
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {ledger.map((tx, i) => (
                      <motion.div
                        key={`${tx.timestamp}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ borderColor: CYAN_DIM }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="px-4 py-3"
                        style={{ background: "#0E131C", border: `1px solid ${PANEL_BORDER}` }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[10px]"
                            style={{ fontFamily: "'JetBrains Mono', monospace", color: TEXT_DIM }}
                          >
                            {tx.party.slice(0, 6)}...{tx.party.slice(-4)}
                          </span>
                          <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="flex items-center gap-1 text-[10px] font-medium tracking-[0.08em]"
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              color: tx.kind === "release" ? "#3FCB8C" : VIOLET,
                            }}
                          >
                            {tx.kind === "release" && <CheckCircle2 size={11} />}
                            {tx.kind.toUpperCase()}
                          </motion.span>
                        </div>
                        <div
                          className="mt-2 text-[14px] font-semibold"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: CYAN }}
                        >
                          {tx.amount} XLM
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </BracketFrame>
        </motion.div>
      </main>
    </div>
  );
}
