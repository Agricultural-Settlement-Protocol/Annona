"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Play,
  X,
  Sprout,
  ArrowRight,
  Activity,
  Globe,
  Users,
  Award,
  Clock,
  Sparkles,
  Send,
  Layers,
  Cpu,
  Zap,
  Calendar,
  TrendingUp,
  Droplets,
  Thermometer,
  Sun,
  Menu,
} from "lucide-react";

import { TEAM_MEMBERS, ROADMAP_ITEMS, TELEMETRY_CITIES } from "./data";
import type { TeamMember, RoadmapItem } from "./types";

// Components
import LiveTelemetryModal from "./LiveTelemetryModal";
import ProjectProposalModal from "./ProjectProposalModal";
import MicroClimateSimulator from "./MicroClimateSimulator";
import TechSpecsModal from "./TechSpecsModal";

// High-Fidelity Looping Interactive Animations using motion for Protocol Steps
const SmartContractAnimation = () => {
  return (
    <div className="w-full h-48 rounded-[2rem] bg-[#ebf5e9]/70 relative overflow-hidden flex items-center justify-center p-6 border border-soft-green/20">
      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(#0d3128 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      {/* Decorative Rotating Orbit */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
        className="absolute w-44 h-44 rounded-full border border-dashed border-emerald-800/20 flex items-center justify-center pointer-events-none"
      >
        <div className="absolute -top-1.5 w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
        <div className="absolute -bottom-1.5 w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
      </motion.div>

      <div className="flex items-center gap-8 z-10 w-full max-w-md justify-between">
        {/* Node 1: KUD */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm relative">
            <Users className="w-6 h-6 text-emerald-800" />
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-2xl border border-emerald-400 pointer-events-none"
            />
          </div>
          <span className="text-[9px] font-mono font-bold text-emerald-950 mt-1.5">
            KUD DATA
          </span>
        </div>

        {/* Center: Smart Contract Document with Floating Lock */}
        <div className="relative flex-grow flex justify-center">
          {/* Connecting lines */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-100 via-emerald-400 to-emerald-100 -translate-y-1/2 -z-10" />

          {/* Animated data packet traveling from Left to Right */}
          <motion.div
            animate={{ x: [-80, 80] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow flex items-center justify-center pointer-events-none"
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          </motion.div>

          <motion.div
            animate={{ y: [-3, 3, -3] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="w-20 h-24 rounded-xl bg-white border border-gray-100 shadow-md flex flex-col p-2.5 justify-between relative"
          >
            {/* Document lines */}
            <div className="space-y-1.5">
              <div className="w-full h-1.5 bg-emerald-100 rounded-full" />
              <div className="w-4/5 h-1.5 bg-gray-100 rounded-full" />
              <div className="w-11/12 h-1.5 bg-gray-100 rounded-full" />
            </div>

            {/* Small Spinning Gears inside contract */}
            <div className="flex justify-between items-center mt-1">
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              >
                <Cpu className="w-4 h-4 text-emerald-800" />
              </motion.div>
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-600" />
              </div>
            </div>

            {/* Float Lock Badge */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-primary-dark border border-emerald-950 flex items-center justify-center shadow-sm text-white"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </motion.div>
          </motion.div>
        </div>

        {/* Node 2: Stellar */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-dark flex items-center justify-center shadow-md relative">
            <Globe className="w-6 h-6 text-emerald-300 animate-pulse" />
          </div>
          <span className="text-[9px] font-mono font-bold text-emerald-900 mt-1.5">
            STELLAR
          </span>
        </div>
      </div>
    </div>
  );
};

const RegisterFarmerAnimation = () => {
  return (
    <div className="w-full h-48 rounded-[2rem] bg-white relative overflow-hidden flex items-center justify-center p-4 shadow-inner border border-gray-100">
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="w-11/12 max-w-[200px] bg-very-soft-green border border-soft-green/40 rounded-2xl p-3.5 shadow-sm relative flex flex-col gap-3"
      >
        {/* Avatar and Shield Area */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-white text-xs font-bold font-mono">
              P1
            </div>
            <div>
              <div className="w-16 h-1.5 bg-gray-900/10 rounded-full mb-1" />
              <div className="w-12 h-1 bg-gray-900/5 rounded-full" />
            </div>
          </div>
          {/* Glowing Shield badge representing privacy */}
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 border border-emerald-200"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </motion.div>
        </div>

        {/* Dynamic Fields */}
        <div className="space-y-2 pt-1 border-t border-gray-900/5">
          <div className="flex justify-between items-center text-[9px] font-mono text-gray-500">
            <span>PERSONAL DATA</span>
            <span className="text-emerald-700 font-bold flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
              ENCRYPTED
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-medium text-gray-800">
            <span>Land Acreage:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-100 text-[9px]">
              2.4 Ha
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-medium text-gray-800">
            <span>Commodity:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-100 text-emerald-800 text-[9px]">
              Paddy
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const LockCreditAnimation = () => {
  return (
    <div className="w-full h-48 rounded-[2rem] bg-[#ebf5e9]/70 relative overflow-hidden flex items-center justify-center p-4 border border-soft-green/20">
      <div className="flex items-center gap-6 justify-center w-full max-w-[220px]">
        {/* Fertilizer Sack container */}
        <div className="relative">
          <motion.div
            animate={{ scale: [0.95, 1.02, 0.95] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-16 h-20 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col items-center justify-between p-2.5 relative"
          >
            <div className="w-10 h-10 rounded-xl bg-pale-mint flex items-center justify-center">
              <Sprout className="w-6 h-6 text-emerald-800" />
            </div>
            <div className="text-center">
              <span className="text-[7px] font-mono text-gray-400 block uppercase">
                INPUTS
              </span>
              <span className="text-[9px] font-bold text-gray-900 leading-none">
                FERTILIZER
              </span>
            </div>
          </motion.div>
          {/* Little glowing stars */}
          <motion.div
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
            className="absolute -top-2 -right-2 text-amber-500"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
          </motion.div>
        </div>

        {/* Lock and Key Agreement Container */}
        <div className="relative">
          {/* Padlock */}
          <motion.div
            animate={{ y: [-3, 3, -3] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="w-16 h-20 rounded-2xl bg-primary-dark border border-emerald-950 flex flex-col items-center justify-center gap-1 shadow-md text-white relative"
          >
            {/* Padlock hook animation */}
            <motion.div
              animate={{ y: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -top-3 w-7 h-8 border-3 border-emerald-300 border-b-0 rounded-t-full -z-10"
            />

            <svg
              className="w-6 h-6 text-emerald-300"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>

            <span className="text-[7px] font-mono text-emerald-200 tracking-wider font-bold">
              CONTRACT
            </span>
            <span className="text-[9px] font-bold text-emerald-300 font-mono">
              LOCKED
            </span>
          </motion.div>

          {/* Locked badge ring */}
          <motion.div
            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-2xl border-2 border-emerald-400 -m-1 pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
};

const RecordHarvestAnimation = () => {
  return (
    <div className="w-full h-48 rounded-[2rem] bg-white relative overflow-hidden flex items-center justify-center p-4 border border-gray-100 shadow-inner">
      <div className="flex flex-col items-center w-full max-w-[200px] relative">
        {/* Scale Platform */}
        <div className="w-36 h-2 bg-gray-300 rounded-full relative mb-1" />
        <div className="w-24 h-1 bg-gray-200 rounded-full mb-6" />

        {/* Animated sack dropping onto scale */}
        <motion.div
          animate={{
            y: [-50, 0, -8, 0],
            scaleY: [1.15, 0.85, 1.05, 1],
            scaleX: [0.85, 1.15, 0.95, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut",
            times: [0, 0.4, 0.6, 0.8],
          }}
          className="absolute bottom-9 w-14 h-16 rounded-2xl bg-[#769a8e] border-2 border-white shadow flex flex-col items-center justify-center text-white"
        >
          <div className="w-1.5 h-1.5 bg-white/20 rounded-full mb-1" />
          <span className="text-[14px] font-bold leading-none">🌾</span>
          <span className="text-[8px] font-mono tracking-wider uppercase mt-1">
            HARVEST
          </span>
        </motion.div>

        {/* Weight Screen & Block Ledger Issuance popup */}
        <div className="flex items-center gap-4 w-full justify-between mt-1">
          <div className="bg-gray-900 text-emerald-400 px-2 py-1 rounded-lg font-mono text-[10px] border border-gray-800 shadow-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>420 KG</span>
          </div>

          {/* Stellar Receipt popup */}
          <motion.div
            animate={{
              y: [20, -5, 0],
              opacity: [0, 1, 1],
              scale: [0.8, 1.05, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              times: [0, 0.5, 0.8],
            }}
            className="bg-primary-dark text-white border border-emerald-950 rounded-xl px-2.5 py-1.5 shadow-md text-[8px] font-mono flex flex-col"
          >
            <span className="text-[7px] text-emerald-300">
              RECORDED ON STELLAR
            </span>
            <span className="font-bold">TX#OK</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const AutoDeductAnimation = () => {
  return (
    <div className="w-full h-48 rounded-[2rem] bg-[#ebf5e9]/70 relative overflow-hidden flex items-center justify-center p-4 border border-soft-green/20">
      <div className="w-full max-w-[200px] flex flex-col gap-4">
        {/* Math Calculation visual bar */}
        <div className="space-y-1 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center text-[9px] font-mono text-gray-400">
            <span>NETTING VALUE</span>
            <span className="text-emerald-700 font-bold">100% SYNCED</span>
          </div>
          <div className="w-full h-6 bg-gray-100 rounded-lg overflow-hidden flex relative border border-gray-50">
            {/* Debt repayment portion (Left) */}
            <motion.div
              animate={{ width: ["100%", "35%", "35%"] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="h-full bg-red-400 flex items-center justify-center text-white text-[8px] font-mono font-bold shrink-0"
            >
              Debt
            </motion.div>

            {/* Farmer profit portion (Right) */}
            <motion.div
              animate={{ width: ["0%", "65%", "65%"] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="h-full bg-emerald-500 flex items-center justify-center text-white text-[8px] font-mono font-bold"
            >
              Net Profit
            </motion.div>
          </div>
        </div>

        {/* Coins flying into balance wallet */}
        <div className="flex justify-between items-center px-1">
          <div className="text-[10px] font-bold text-gray-800">
            Disbursement:{" "}
            <span className="font-mono text-emerald-800">Rp 7.2M</span>
          </div>

          {/* Balance wallet with glowing coin flow */}
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary-dark text-white flex items-center justify-center shadow">
              <svg
                className="w-5 h-5 text-emerald-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </div>
            {/* Flying gold coin */}
            <motion.div
              animate={{
                x: [-40, 0],
                y: [-15, 0],
                opacity: [0, 1, 0],
                scale: [0.6, 1.1, 0.6],
              }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
              className="absolute -top-3 -left-4 w-4 h-4 rounded-full bg-amber-400 border border-amber-500 shadow-sm flex items-center justify-center text-[8px] font-mono font-bold text-amber-950"
            >
              $
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Landing() {
  const router = useRouter();

  // Modal states
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isTechSpecsOpen, setIsTechSpecsOpen] = useState(false);
  const [selectedTelemetryCity, setSelectedTelemetryCity] = useState("cianjur");

  // Interactive UI states
  const [activeTab, setActiveTab] = useState<
    "home" | "service" | "tech" | "dashboard"
  >("home");
  const [energyEfficiency, setEnergyEfficiency] = useState(80); // Slider (50% to 95%)
  const [canopyDensity, setCanopyDensity] = useState(72); // Slider (30% to 95%)
  const [samplingRate, setSamplingRate] = useState(86); // Slider (10Hz to 120Hz)
  const [activeHotspot, setActiveHotspot] = useState<
    "canopy" | "sensors" | "hydric"
  >("canopy");
  const [activeTeamMember, setActiveTeamMember] = useState<TeamMember | null>(
    null,
  );
  const [selectedRoadmapQuarter, setSelectedRoadmapQuarter] =
    useState<string>("L3");

  // Actuators & simulation states
  const [isIrrigationActive, setIsIrrigationActive] = useState(false);
  const [irrigationStatus, setIrrigationStatus] = useState<
    "idle" | "watering" | "completed"
  >("idle");
  const [carbonCounter, setCarbonCounter] = useState(12500); // 12.5k tons starting
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Live Chart ticks for Dashboard Simulation
  const [chartTicks, setChartTicks] = useState<number[]>([
    42, 55, 48, 62, 58, 70, 64, 78, 81,
  ]);

  // Simulate dashboard ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setChartTicks((prev) => {
        const nextTicks = [...prev.slice(1)];
        const lastVal = prev[prev.length - 1] ?? 50;
        const change = Math.round((Math.random() - 0.5) * 10);
        const newVal = Math.max(20, Math.min(100, lastVal + change));
        return [...nextTicks, newVal];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Simulate carbon sequestration ticking up
  useEffect(() => {
    const interval = setInterval(() => {
      setCarbonCounter((prev) => prev + 0.12);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Irrigation actuator sequence
  const triggerWatering = () => {
    if (isIrrigationActive) return;
    setIsIrrigationActive(true);
    setIrrigationStatus("watering");
    setTimeout(() => {
      setIrrigationStatus("completed");
      setIsIrrigationActive(false);
      setTimeout(() => setIrrigationStatus("idle"), 3000);
    }, 4000);
  };

  // Newsletter submission
  const handleNewsletterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.includes("@")) {
      setNewsletterSubscribed(true);
      setNewsletterEmail("");
      setTimeout(() => setNewsletterSubscribed(false), 5000);
    }
  };

  // Scrolling helpers
  const scrollToSection = (id: string) => {
    if (activeTab === "dashboard") {
      let targetTab: "home" | "service" | "tech" = "home";
      if (id === "how-it-works-section" || id === "solutions-section")
        targetTab = "service";
      if (
        id === "tech-section" ||
        id === "sustainability-section" ||
        id === "roadmap-section"
      )
        targetTab = "tech";

      setActiveTab(targetTab);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 50);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-gray-900 overflow-x-clip antialiased font-sans">
      {/* HEADER NAVIGATION */}
      <div className="sticky top-0 z-40 w-full px-4 md:px-12 py-4 pointer-events-none">
        <header
          id="main-header"
          className="max-w-7xl mx-auto w-full px-6 py-3 md:py-3.5 flex items-center justify-between bg-white/80 backdrop-blur-md border border-gray-100 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] pointer-events-auto"
        >
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => router.push("/kmp")}
          >
            <img
              src="/brand/annona-wordmark-logo.png"
              alt="Annona Protocol Logo"
              className="h-8 w-auto hover:scale-105 transition-transform object-contain"
            />
            <span className="text-xl font-semibold tracking-tight">
              Annona Protocol
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1.5 bg-gray-100/60 p-1 rounded-full border border-gray-200/50">
            <button
              onClick={() => {
                setActiveTab("home");
                scrollToSection("hero-section");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === "home"
                  ? "bg-soft-green text-gray-900 shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/30"
              }`}
            >
              Home
              <Globe className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setActiveTab("service");
                scrollToSection("how-it-works-section");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === "service"
                  ? "bg-soft-green text-gray-900 shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/30"
              }`}
            >
              Protocol Workflow
              <Sprout className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setActiveTab("tech");
                scrollToSection("tech-section");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === "tech"
                  ? "bg-soft-green text-gray-900 shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/30"
              }`}
            >
              Impact & Scale
              <Cpu className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                router.push("/kmp");
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all text-gray-600 hover:bg-gray-200/30"
            >
              Cooperative Dashboard
              <Activity className="w-3.5 h-3.5" />
            </button>
          </nav>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => {
                router.push("/kmp");
              }}
              className="md:hidden px-4 py-2.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100"
            >
              <Activity className="w-3.5 h-3.5" />
              Dashboard
            </button>

            <button
              onClick={() => setIsProposalOpen(true)}
              className="bg-primary-dark text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-opacity-90 transition-all shadow-sm hover:shadow active:scale-95"
              id="contact-us-header-btn"
            >
              Apply for Partnership
            </button>
          </div>
        </header>
      </div>

      <>
        {/* MAIN LAYOUT */}
        <main
          id="hero-section"
          className="flex-grow flex flex-col lg:flex-row px-4 md:px-12 pt-6 lg:pt-12 pb-16 gap-8 relative max-w-7xl mx-auto w-full"
        >
          {/* Left Sidebar */}
          <aside
            id="left-sidebar"
            className="w-full lg:w-64 flex flex-col gap-10 shrink-0"
          >
            {/* Team Showcase Interactive Card */}
            <div
              id="team-showcase-card"
              className="bg-soft-green rounded-[2.5rem] rounded-bl-[3.5rem] p-8 flex flex-col gap-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all border border-soft-green/30"
            >
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

              <div className="flex -space-x-3">
                {TEAM_MEMBERS.slice(0, 3).map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setActiveTeamMember(member)}
                    className="w-12 h-12 rounded-full border-2 border-[#d8ead0] object-cover relative z-10 hover:scale-110 active:scale-95 transition-all outline-none"
                    title={`View ${member.name}`}
                  >
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </button>
                ))}
                <button
                  onClick={() => setActiveTeamMember(TEAM_MEMBERS[3]!)}
                  className="w-12 h-12 rounded-full bg-white border-2 border-[#d8ead0] flex items-center justify-center text-xs font-semibold text-emerald-800 relative z-20 hover:scale-110 hover:bg-emerald-50 active:scale-95 transition-all outline-none"
                >
                  +1
                </button>
              </div>

              <div>
                <span className="text-lg font-semibold text-gray-900 block">
                  Board & Advisors
                </span>
                <span className="text-xs text-gray-700 font-light mt-0.5 block">
                  Click avatar for full profile
                </span>
              </div>

              {/* Decorative organic shapes */}
              <div className="absolute bottom-6 right-6 flex gap-1 pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-white opacity-80 rounded-tl-none animate-pulse" />
                <div className="w-4 h-4 rounded-full bg-white opacity-80 mt-auto" />
              </div>
            </div>

            {/* Active Team Member Drawer / Popover */}
            <AnimatePresence>
              {activeTeamMember && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="bg-[#ebf5e9]/90 border border-soft-green/50 rounded-3xl p-5 shadow-sm text-xs space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={activeTeamMember.avatarUrl}
                        alt={activeTeamMember.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {activeTeamMember.name}
                        </h4>
                        <p className="text-[10px] text-gray-500">
                          {activeTeamMember.role}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTeamMember(null)}
                      className="w-5 h-5 rounded-full bg-white/60 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-gray-600 leading-relaxed font-light">
                    {activeTeamMember.bio}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sidebar Tagline */}
            <div className="mt-auto pl-2 pb-2">
              <svg
                className="mb-4 text-emerald-800 animate-spin-slow"
                fill="none"
                height="24"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
              <p className="text-xl font-medium leading-tight text-gray-900 max-w-[180px] tracking-tight">
                Financial Sovereignty for Rural Cooperatives
              </p>
            </div>
          </aside>

          {/* Hero Banner / Video content */}
          <section
            id="hero-content"
            className="flex-1 flex flex-col pt-2 lg:pt-6"
          >
            <div className="max-w-4xl mb-12 text-center lg:text-left">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.1] text-gray-900">
                Fertilizer Received Early,{" "}
                <span className="inline-block relative my-1">
                  <span className="relative z-10 px-6 sm:px-8 py-1 sm:py-2 text-primary-dark">
                    Pay at Harvest.
                  </span>
                  <span className="absolute inset-0 bg-[#e2f1e1] rounded-full -z-0 border border-soft-green/30" />
                </span>{" "}
                Transparently Recorded.
              </h1>
            </div>

            {/* Interactive Video Feature */}
            <div
              id="hero-video-card"
              onClick={() => {
                setSelectedTelemetryCity("cianjur");
                setIsTelemetryOpen(true);
              }}
              className="w-full rounded-[4rem] sm:rounded-[6rem] aspect-[21/9] min-h-[220px] shadow-lg mb-8 relative overflow-hidden group cursor-pointer border border-gray-100"
              style={{
                background:
                  "url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80') no-repeat center center/cover",
              }}
            >
              {/* Video overlay and hover effect */}
              <div className="absolute inset-0 bg-black/15 group-hover:bg-black/20 transition-colors duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Overlay Tags */}
              <div className="absolute top-6 left-6 sm:top-8 sm:left-8 flex flex-wrap gap-2 z-20">
                <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-1.5 rounded-full text-xs font-medium tracking-wide">
                  Cooperative
                </span>
                <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-1.5 rounded-full text-xs font-medium tracking-wide">
                  Transparent
                </span>
                <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-1.5 rounded-full text-xs font-medium tracking-wide">
                  Blockchain
                </span>
              </div>

              {/* Top Right Globe Telemetry Trigger */}
              <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-20 w-11 h-11 rounded-full border border-white/40 flex items-center justify-center text-white backdrop-blur-sm hover:scale-110 active:scale-95 transition-all">
                <Globe className="w-5 h-5 animate-spin-slow" />
              </div>

              {/* Animated Play Button */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 bg-white/25 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 group-hover:bg-white/35 transition-colors shadow-lg"
                >
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-white ml-1" />
                </motion.button>
              </div>

              {/* Video Telemetry caption */}
              <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-10 text-white z-10">
                <span className="text-[10px] font-mono tracking-widest text-emerald-300 block mb-0.5">
                  REAL-TIME PANEL
                </span>
                <h3 className="text-lg sm:text-xl font-medium tracking-tight">
                  Monitor Cooperative (KUD) Transactions
                </h3>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 px-4 sm:pr-8 pb-4">
              <button
                onClick={() => scrollToSection("solutions-section")}
                className="w-full sm:w-auto px-6 py-3 rounded-full border border-gray-300 text-gray-800 font-medium hover:bg-gray-50 hover:border-gray-400 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                Explore Cooperative Solutions
                <ArrowUpRight className="w-4 h-4 rotate-45" />
              </button>
              <button
                onClick={() => setIsProposalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-primary-dark text-white font-medium hover:bg-opacity-90 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                Apply for Partnership
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        </main>

        {/* CONTINUOUS MARQUEE TICKER */}
        <div className="w-full bg-[#fcf9f8] border-t border-b border-gray-200/60 py-5 overflow-hidden">
          <div className="flex whitespace-nowrap no-scrollbar relative w-full">
            <div className="animate-marquee inline-flex items-center gap-10 shrink-0">
              <span className="text-3xl sm:text-4xl md:text-5xl font-medium text-gray-900">
                Automated Settlement Netting
              </span>
              <img
                alt="Leaf separator"
                className="w-14 h-14 rounded-2xl object-cover opacity-80 border border-soft-green/30"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVdErRD-qfsCkLgy2jx3T22obQbulRhaHRT6fFxonaKICgqFltFIDKj99cyAML60R9cc4ERl33PUnDuOBE30GueiqTJabYgfzEP1cszosCdXOdIEYjf-HU8vg4hv11JMY3TwPZTmmNQTnDHk4RzCj96rNjMrV2Ue0VefH2NsepIbLxmBbNpRveV5i8eyUA3pzrkvLr2rsd-CTHgiop_UUFExoA_phZFByNkjh7kM4XWJimsFP7YR2Y"
              />
              <span className="text-3xl sm:text-4xl md:text-5xl font-medium text-gray-900">
                Rupiah Digital Settlement (dIDR)
              </span>
              <img
                alt="Leaf separator"
                className="w-14 h-14 rounded-2xl object-cover opacity-80 border border-soft-green/30"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvLBvg1VJwMLmcrw1zi-CNQ_Ds-3DopWEZTL_doAlsgJAKYwWXS1l3TXko4cbcS1CXUPrahPt__Acs0B8-PelQ-62jonKE4C25iz-2FiRv5y_fm1J67Q5kI3V7z_QYu79yuZ1wEogfmzIrLVhJwbWNQ7ELMOSFtsiDIlN7cKFQnh_C7sSOXB1uOsBBTpYNX7EkEMJ9P4AQJWhuifiRwHdWqWHdC3GyCZ_ucZVRoHz1xLVxVYuQQn84"
              />
              <span className="text-3xl sm:text-4xl md:text-5xl font-medium text-gray-900">
                Stellar Network Protocol
              </span>
              <img
                alt="Leaf separator"
                className="w-14 h-14 rounded-2xl object-cover opacity-80 border border-soft-green/30"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTH6Ko8ALdCkfMB08Nm9RkD4zNKNAKceNVFqhHIyJdD6tduyi7KUDm2f1lTW7as2PtuJvs5j1rFeLazappOu53e6_2nap8RVMPGZqzR4Gu8XvkDcVP8WI7Px1XebwdFUxbZ3dQwXNJ_E5Z6r_ylEI2NQQYejWeP7M6ovYDxB68Rpixn6GAssNBXKKe4KRp9DQO1l3_f5JcC9ISHCBnCMBDcUQpAXsXfNmt3-mit4fHJ4d1evI3NqyR"
              />
            </div>
            {/* Duplicated block for perfect infinite scroll */}
            <div
              className="animate-marquee inline-flex items-center gap-10 shrink-0"
              aria-hidden="true"
            >
              <span className="text-3xl sm:text-4xl md:text-5xl font-medium text-gray-900">
                Automated Settlement Netting
              </span>
              <img
                alt="Leaf separator"
                className="w-14 h-14 rounded-2xl object-cover opacity-80 border border-soft-green/30"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVdErRD-qfsCkLgy2jx3T22obQbulRhaHRT6fFxonaKICgqFltFIDKj99cyAML60R9cc4ERl33PUnDuOBE30GueiqTJabYgfzEP1cszosCdXOdIEYjf-HU8vg4hv11JMY3TwPZTmmNQTnDHk4RzCj96rNjMrV2Ue0VefH2NsepIbLxmBbNpRveV5i8eyUA3pzrkvLr2rsd-CTHgiop_UUFExoA_phZFByNkjh7kM4XWJimsFP7YR2Y"
              />
              <span className="text-3xl sm:text-4xl md:text-5xl font-medium text-gray-900">
                Rupiah Digital Settlement (dIDR)
              </span>
              <img
                alt="Leaf separator"
                className="w-14 h-14 rounded-2xl object-cover opacity-80 border border-soft-green/30"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvLBvg1VJwMLmcrw1zi-CNQ_Ds-3DopWEZTL_doAlsgJAKYwWXS1l3TXko4cbcS1CXUPrahPt__Acs0B8-PelQ-62jonKE4C25iz-2FiRv5y_fm1J67Q5kI3V7z_QYu79yuZ1wEogfmzIrLVhJwbWNQ7ELMOSFtsiDIlN7cKFQnh_C7sSOXB1uOsBBTpYNX7EkEMJ9P4AQJWhuifiRwHdWqWHdC3GyCZ_ucZVRoHz1xLVxVYuQQn84"
              />
              <span className="text-3xl sm:text-4xl md:text-5xl font-medium text-gray-900">
                Stellar Network Protocol
              </span>
              <img
                alt="Leaf separator"
                className="w-14 h-14 rounded-2xl object-cover opacity-80 border border-soft-green/30"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTH6Ko8ALdCkfMB08Nm9RkD4zNKNAKceNVFqhHIyJdD6tduyi7KUDm2f1lTW7as2PtuJvs5j1rFeLazappOu53e6_2nap8RVMPGZqzR4Gu8XvkDcVP8WI7Px1XebwdFUxbZ3dQwXNJ_E5Z6r_ylEI2NQQYejWeP7M6ovYDxB68Rpixn6GAssNBXKKe4KRp9DQO1l3_f5JcC9ISHCBnCMBDcUQpAXsXfNmt3-mit4fHJ4d1evI3NqyR"
              />
            </div>
          </div>
        </div>

        {/* SOLUTIONS SECTION */}
        <section
          id="solutions-section"
          className="w-full bg-white py-24 border-b border-gray-100"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-12">
            <div className="flex items-center gap-4 mb-12">
              <h2 className="text-3xl sm:text-5xl font-light text-gray-900 tracking-tight">
                Explore Our Solutions
              </h2>
              <ArrowRight className="w-8 h-8 text-gray-400 rotate-45" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Side: Main Visual */}
              <div className="lg:col-span-7 relative">
                <div className="relative rounded-[2rem] rounded-tr-[5rem] overflow-hidden bg-gray-100 aspect-[4/3] w-full border border-gray-100 shadow-sm">
                  <img
                    alt="Modern Village Cooperative"
                    className="w-full h-full object-cover"
                    src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                  />
                </div>
                {/* Decorative element bottom left */}
                <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-[#e2f1e1] rounded-full flex items-center justify-center overflow-hidden border border-[#d2e3d1]">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center -mr-5">
                    <div className="w-8 h-8 bg-[#e2f1e1] rounded-full" />
                  </div>
                </div>
              </div>

              {/* Right Side: Bento Grid Controls */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Top controls & images row */}
                <div className="flex items-center justify-between border border-gray-100 rounded-full p-2 pl-6 bg-white shadow-sm">
                  <div className="flex items-center gap-4 flex-grow">
                    <span className="text-base font-semibold font-mono text-gray-900">
                      02
                    </span>
                    <div className="h-1.5 bg-gray-100 flex-grow rounded-full relative mr-6 border border-gray-50">
                      <div
                        className="absolute left-0 top-0 h-full bg-[#769a8e] rounded-full transition-all duration-300"
                        style={{
                          width: `${((energyEfficiency - 50) / 45) * 100}%`,
                        }}
                      />
                      <input
                        type="range"
                        min="50"
                        max="95"
                        step="1"
                        value={energyEfficiency}
                        onChange={(e) =>
                          setEnergyEfficiency(parseInt(e.target.value))
                        }
                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                        title="Adjust Netting Targets"
                      />
                      {/* Floating thumb mimic */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 bg-[#5a8072] rounded-full border-2 border-white shadow-sm pointer-events-none transition-all duration-300"
                        style={{
                          left: `calc(${((energyEfficiency - 50) / 45) * 100}% - 9px)`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <img
                      alt="Padi siap panen"
                      className="w-16 h-12 object-cover rounded-2xl rounded-tr-sm border border-gray-100"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtBEHHkF01BhMXZRgkhsFaMv5u3j-CYp3KX9eI3NtkEISGT6xxDUubovyiwkKQHuVWDFt41JaTMeIQlFO72bG84TkdSe0Li5gosms0ZSrWsx3lydQYY1lgrBI9MxG0gPDi5O1h9CNfsB_7WmOH2kPIWGByCummAWMkrbgElkNl6lApHqrc_W4jmSpkduLHwXRyQYP0lo6lJNseSiaNr30z_v4ytOBJ4pT38mLgwi_lwGx2V5KL3h0J"
                    />
                    <img
                      alt="Setoran hasil tani"
                      className="w-16 h-12 object-cover rounded-2xl rounded-tl-sm rounded-br-[1.5rem] border border-gray-100"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCknNguSxYWmmDCuBVXM_6ubPOdH_BgV-iy9xRy1so6S-xKbyP3tl_32dSxyyUJD4s9FKzRMf_r98-SfwTFnQEyQeLKIwPiTcXpBkSfc8qiWetVQ9S5saTtZATzh55z1JojAGaADdwRIiI4fqYH9aHh3CRpKwvg_TYGt4Z2tKdt6cC4_498L0R2f_1KWc1rJFwko0tOxISnpoAYRKA72EHR3CkzxpOvzMC0zhtifvPCukRwK75FPq_A"
                    />
                  </div>
                </div>

                {/* Energy Efficiency Card */}
                <div className="bg-[#E2F1E1] rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between flex-grow relative border border-[#d0e1cf] shadow-sm overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <span className="text-[10px] font-mono tracking-widest text-emerald-800 block mb-1">
                      QUALITY METRIC
                    </span>
                    <h3 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-4 tracking-tight leading-tight">
                      {energyEfficiency}% Automated Netting Ratio
                    </h3>
                    <p className="text-gray-700 text-sm leading-relaxed max-w-sm">
                      Annona's automated netting algorithm matches harvest
                      deposits directly with fertilizer invoices. Adjust the
                      parameters above to simulate capital efficiency gains
                      compared to manual billing.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsTechSpecsOpen(true)}
                    className="absolute bottom-6 right-6 w-11 h-11 rounded-full border border-gray-900 flex items-center justify-center hover:bg-gray-900 hover:text-white active:scale-90 transition-all shadow-sm"
                    title="View Technical Specs"
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Testimonial Bubble */}
                <div className="flex items-end mt-2 relative pl-4">
                  <div className="absolute left-0 bottom-0 w-24 h-24 bg-[#d8ead0] rounded-full -z-10 border border-[#c4dbbb]" />
                  <img
                    alt="Camilla Hoff"
                    className="w-20 h-20 rounded-full object-cover border-4 border-white ml-2 z-10 shadow-sm hover:scale-105 transition-transform cursor-pointer"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZg0FGVQMBZmQ10GPVfaGWXsP6w8KgBKJ0qeGKFpoxVutm4XODKvg8nZo8rSXSX0wxoQKSKHtB8CdBg7MWqdy2MoBrrNofqCWCAOe6S99pjrPdarnlpZLTNOW_sPfdObtBG8XzfD7ig4yH7sj5_49ti9yeRU2Km5RuhWtnZmDnWV5L-epyN6_4-4GEm0bkyr6gtvY-hfc6iHJgcbizPWD66sgymtVjmwdPuOMVSRZ6it5xZyR9DpZD"
                    onClick={() => setActiveTeamMember(TEAM_MEMBERS[0]!)}
                  />
                  <div className="bg-white border border-gray-100 rounded-[2rem] rounded-bl-sm p-5 ml-[-12px] flex-grow shadow-sm z-0 pl-7">
                    <p className="text-gray-900 text-sm font-medium leading-relaxed mb-3">
                      "Our mission is to empower rural cooperatives through
                      trusted financial technology to improve farmers'
                      livelihoods."
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-900 font-bold">
                        Camilla Hoff, Cooperative Partnerships
                      </p>
                      <span className="text-[10px] text-gray-400 font-mono">
                        ANNONA 2026
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CARA KERJA PROTOKOL SECTION */}
        <section
          id="how-it-works-section"
          className="w-full bg-white py-24 border-b border-gray-100"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div className="flex items-center gap-4">
                <h2 className="text-3xl sm:text-5xl font-light text-gray-900 tracking-tight flex flex-wrap items-center gap-2">
                  Protocol{" "}
                  <span className="inline-block relative">
                    <span className="relative z-10 px-6 py-1 text-primary-dark font-medium">
                      Workflow
                    </span>
                    <span className="absolute inset-0 bg-pale-mint rounded-full -z-0 border border-soft-green/30" />
                  </span>
                </h2>
                <div className="w-10 h-10 rounded-full bg-[#ebf5e9] border border-soft-green/30 flex items-center justify-center text-primary-dark shadow-sm">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <p className="text-gray-500 font-mono text-xs tracking-widest max-w-sm">
                STELLAR LEDGER & SOROBAN SMART CONTRACT INTEGRATION
              </p>
            </div>

            {/* 5-Card Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {/* Card 1: Smart Contract (Row 1, Span 2 on Desktop) */}
              <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-soft-green/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-6">
                  {/* Thumbnail Animation */}
                  <SmartContractAnimation />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3.5 py-1 bg-[#ebf5e9] border border-soft-green/40 rounded-full text-[10px] font-mono tracking-widest text-emerald-800 font-bold uppercase">
                        Smart Contract
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase">
                        ACTIVE SYNC
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-medium text-gray-900 tracking-tight">
                      Transparently automated on Soroban
                    </h3>
                    <p className="text-gray-700 text-sm leading-relaxed max-w-2xl font-light">
                      All rules, netting ratios, and automated calculations are
                      executed instantly and autonomously by the decentralized
                      Stellar Soroban network, eliminating manual intervention,
                      reducing bias, and drastically lowering operational costs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Langkah I (Row 1, Span 1) */}
              <div className="bg-[#E2F1E1] rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border border-[#d0e1cf] shadow-sm group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-6">
                  {/* Thumbnail Animation */}
                  <RegisterFarmerAnimation />

                  <div className="space-y-3">
                    <span className="inline-block px-3.5 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-mono tracking-widest text-emerald-800 font-bold uppercase">
                      Step I
                    </span>
                    <h3 className="text-2xl font-medium text-gray-900 tracking-tight">
                      Farmer Registration
                    </h3>
                    <p className="text-gray-800 text-sm leading-relaxed font-light">
                      The cooperative registers the farmer, land acreage, and
                      crop type. Personal identity data remains cryptographically
                      secured and encrypted, never exposed on the public ledger.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Langkah II (Row 2, Span 1) */}
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-soft-green/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-6">
                  {/* Thumbnail Animation */}
                  <LockCreditAnimation />

                  <div className="space-y-3">
                    <span className="inline-block px-3.5 py-1 bg-[#ebf5e9] border border-soft-green/40 rounded-full text-[10px] font-mono tracking-widest text-emerald-800 font-bold uppercase">
                      Step II
                    </span>
                    <h3 className="text-2xl font-medium text-gray-900 tracking-tight">
                      Lock Input Credit
                    </h3>
                    <p className="text-gray-700 text-sm leading-relaxed font-light">
                      Fertilizer and seed inputs are distributed at the start of the
                      planting season. The input credit value and the minimum floor
                      purchase price are locked in the smart contract.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 4: Langkah III (Row 2, Span 1) */}
              <div className="bg-[#E2F1E1] rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border border-[#d0e1cf] shadow-sm group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-6">
                  {/* Thumbnail Animation */}
                  <RecordHarvestAnimation />

                  <div className="space-y-3">
                    <span className="inline-block px-3.5 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-mono tracking-widest text-emerald-800 font-bold uppercase">
                      Step III
                    </span>
                    <h3 className="text-2xl font-medium text-gray-900 tracking-tight">
                      Record Harvest Yield
                    </h3>
                    <p className="text-gray-800 text-sm leading-relaxed font-light">
                      Upon harvest delivery, the crop weight and quality parameters
                      are recorded digitally. A permanent, immutable receipt is
                      immediately minted on the Stellar ledger.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 5: Langkah IV (Row 2, Span 1) */}
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-soft-green/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-6">
                  {/* Thumbnail Animation */}
                  <AutoDeductAnimation />

                  <div className="space-y-3">
                    <span className="inline-block px-3.5 py-1 bg-[#ebf5e9] border border-soft-green/40 rounded-full text-[10px] font-mono tracking-widest text-emerald-800 font-bold uppercase">
                      Step IV
                    </span>
                    <h3 className="text-2xl font-medium text-gray-900 tracking-tight">
                      Automated Netting Settlement
                    </h3>
                    <p className="text-gray-700 text-sm leading-relaxed font-light">
                      The crop value is calculated, the input credit balance is
                      automatically deducted, and the remaining net profit is
                      instantly transferred to the farmer. All parties view the
                      same transparent ledger.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INTEGRASI SISTEM SECTION - Annona Protocol Agricultural Cooperative Technology */}
        <section
          id="integration-section"
          className="w-full bg-[#fcf9f8] py-24 border-b border-gray-100"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-12">
            <div className="flex items-center gap-4 mb-12">
              <h2 className="text-3xl sm:text-5xl font-light text-gray-900 tracking-tight flex flex-wrap items-center gap-2">
                Technology{" "}
                <span className="inline-block relative">
                  <span className="relative z-10 px-6 py-1.5 text-primary-dark">
                    Integration
                  </span>
                  <span className="absolute inset-0 bg-[#e2f1e1] rounded-full -z-0 border border-soft-green/30" />
                </span>
              </h2>
              <ArrowRight className="w-8 h-8 text-gray-400 rotate-45" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Side: Interactive Hotspots on Architecture Diagram */}
              <div className="lg:col-span-7 relative">
                <div className="relative rounded-[2.5rem] rounded-tr-[5rem] overflow-hidden bg-gray-100 aspect-[4/3] w-full border border-gray-100 shadow-sm">
                  <img
                    alt="Modern Cooperative Digital Scale"
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                  />

                  {/* Overlay vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                  {/* Hotspot 1: Stellar Gate */}
                  <div className="absolute top-[25%] right-[30%] z-20">
                    <span className="absolute -left-2 -top-2 w-12 h-12 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
                    <button
                      onClick={() => setActiveHotspot("canopy")}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        activeHotspot === "canopy"
                          ? "bg-emerald-500 text-white scale-110 shadow-lg ring-4 ring-white/50"
                          : "bg-white/90 text-gray-800 shadow-md hover:scale-105"
                      }`}
                      title="Soroban Contract Hotspot"
                    >
                      <Cpu className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Hotspot 2: Digital Scale Sensors */}
                  <div className="absolute top-[50%] left-[35%] z-20">
                    <span className="absolute -left-2 -top-2 w-12 h-12 rounded-full bg-sky-400/30 animate-ping pointer-events-none" />
                    <button
                      onClick={() => setActiveHotspot("sensors")}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        activeHotspot === "sensors"
                          ? "bg-sky-500 text-white scale-110 shadow-lg ring-4 ring-white/50"
                          : "bg-white/90 text-gray-800 shadow-md hover:scale-105"
                      }`}
                      title="IoT Scale Hotspot"
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Hotspot 3: dIDR Wallet */}
                  <div className="absolute bottom-[28%] right-[45%] z-20">
                    <span className="absolute -left-2 -top-2 w-12 h-12 rounded-full bg-blue-400/30 animate-ping pointer-events-none" />
                    <button
                      onClick={() => setActiveHotspot("hydric")}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        activeHotspot === "hydric"
                          ? "bg-blue-500 text-white scale-110 shadow-lg ring-4 ring-white/50"
                          : "bg-white/90 text-gray-800 shadow-md hover:scale-105"
                      }`}
                      title="dIDR Wallet Hotspot"
                    >
                      <Droplets className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dynamic Floating Glassmorphic Card */}
                  <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-white/40 rounded-2xl p-4 sm:p-5 shadow-lg max-w-sm z-10">
                    <AnimatePresence mode="wait">
                      {activeHotspot === "canopy" && (
                        <motion.div
                          key="canopy"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <span className="text-[9px] font-mono text-emerald-700 uppercase tracking-wider block mb-1">
                            MODULE 01 • SMART CONTRACT
                          </span>
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">
                            Stellar Soroban Smart Contracts
                          </h4>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            Stellar Soroban smart contracts secure the digital
                            agreement between cooperatives, farmers, and input
                            suppliers in a decentralized manner.
                          </p>
                        </motion.div>
                      )}
                      {activeHotspot === "sensors" && (
                        <motion.div
                          key="sensors"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <span className="text-[9px] font-mono text-sky-700 uppercase tracking-wider block mb-1">
                            MODULE 02 • IOT EDGE VERIFICATION
                          </span>
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">
                            IoT Digital Scales
                          </h4>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            Internet-connected scales transmit real-time crop
                            weight directly to the ledger, preventing weight
                            tampering or manual entry errors.
                          </p>
                        </motion.div>
                      )}
                      {activeHotspot === "hydric" && (
                        <motion.div
                          key="hydric"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <span className="text-[9px] font-mono text-blue-700 uppercase tracking-wider block mb-1">
                            MODULE 03 • SETTLEMENT GATEWAY
                          </span>
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">
                            dIDR Digital Wallet
                          </h4>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            Direct dIDR payouts are routed to the partner farmer's
                            account following automated netting deduction, with
                            complete transparency.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Decorative design sphere behind the card */}
                <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-[#e2f1e1] rounded-full flex items-center justify-center overflow-hidden border border-[#d2e3d1]">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center -mr-5">
                    <div className="w-8 h-8 bg-[#e2f1e1] rounded-full" />
                  </div>
                </div>
              </div>

              {/* Right Side: Bento Grid Controls & Sliders */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Top control slider with mini-photos */}
                <div className="flex items-center justify-between border border-gray-100 rounded-full p-2 pl-6 bg-white shadow-sm">
                  <div className="flex items-center gap-4 flex-grow">
                    <span className="text-base font-semibold font-mono text-gray-900">
                      03
                    </span>
                    <div className="h-1.5 bg-gray-100 flex-grow rounded-full relative mr-6 border border-gray-50">
                      <div
                        className="absolute left-0 top-0 h-full bg-[#769a8e] rounded-full transition-all duration-300"
                        style={{
                          width: `${((canopyDensity - 30) / 65) * 100}%`,
                        }}
                      />
                      <input
                        type="range"
                        min="30"
                        max="95"
                        step="1"
                        value={canopyDensity}
                        onChange={(e) =>
                          setCanopyDensity(parseInt(e.target.value))
                        }
                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                        title="Adjust Reputational Score Targets"
                      />
                      {/* Slider Thumb */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 bg-[#5a8072] rounded-full border-2 border-white shadow-sm pointer-events-none transition-all duration-300"
                        style={{
                          left: `calc(${((canopyDensity - 30) / 65) * 100}% - 9px)`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <img
                      alt="Padi sehat subur"
                      className="w-16 h-12 object-cover rounded-2xl rounded-tr-sm border border-gray-100"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVdErRD-qfsCkLgy2jx3T22obQbulRhaHRT6fFxonaKICgqFltFIDKj99cyAML60R9cc4ERl33PUnDuOBE30GueiqTJabYgfzEP1cszosCdXOdIEYjf-HU8vg4hv11JMY3TwPZTmmNQTnDHk4RzCj96rNjMrV2Ue0VefH2NsepIbLxmBbNpRveV5i8eyUA3pzrkvLr2rsd-CTHgiop_UUFExoA_phZFByNkjh7kM4XWJimsFP7YR2Y"
                    />
                    <img
                      alt="Petani panen padi"
                      className="w-16 h-12 object-cover rounded-2xl rounded-tl-sm rounded-br-[1.5rem] border border-gray-100"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTH6Ko8ALdCkfMB08Nm9RkD4zNKNAKceNVFqhHIyJdD6tduyi7KUDm2f1lTW7as2PtuJvs5j1rFeLazappOu53e6_2nap8RVMPGZqzR4Gu8XvkDcVP8WI7Px1XebwdFUxbZ3dQwXNJ_E5Z6r_ylEI2NQQYejWeP7M6ovYDxB68Rpixn6GAssNBXKKe4KRp9DQO1l3_f5JcC9ISHCBnCMBDcUQpAXsXfNmt3-mit4fHJ4d1evI3NqyR"
                    />
                  </div>
                </div>

                {/* Stat Bento Card matching the solutions green background and typography */}
                <div className="bg-[#E2F1E1] rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between flex-grow relative border border-[#d0e1cf] shadow-sm overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="relative z-10">
                    <span className="text-[10px] font-mono tracking-widest text-emerald-800 block mb-1">
                      MINIMUM REPUTATION SCORE
                    </span>
                    <h3 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-4 tracking-tight leading-tight">
                      {canopyDensity}% Repayment History Target
                    </h3>
                    <p className="text-gray-700 text-sm leading-relaxed max-w-sm">
                      Setting a minimum reputation threshold protects the cooperative's
                      liquidity pool from defaults. Adjust the slider above to
                      simulate dynamic credit adjustments.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsTechSpecsOpen(true)}
                    className="absolute bottom-6 right-6 w-11 h-11 rounded-full border border-gray-900 flex items-center justify-center hover:bg-gray-900 hover:text-white active:scale-90 transition-all shadow-sm"
                    title="View Technical Specs"
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Structural Advisor Testimonial Bubble */}
                <div className="flex items-end mt-2 relative pl-4">
                  <div className="absolute left-0 bottom-0 w-24 h-24 bg-[#d8ead0] rounded-full -z-10 border border-[#c4dbbb]" />
                  <img
                    alt="Elena Rostova"
                    className="w-20 h-20 rounded-full object-cover border-4 border-white ml-2 z-10 shadow-sm hover:scale-105 transition-transform cursor-pointer"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVE8eXQ8JDwVbMrHg2GmPBRl6yAWrChbIjLa2piWXWHLsgBjxz-bS4OANJh51un54rHoZeVEBTVGVuzqSYYtBQhON1t256yx1UFki1mawnW2T6mZAUkS2iHfCg721yU78riqYj32ddGjc9i18239G8Gl4QXWeLD8aEzKk-ZLmBqf4s3EI7g1kf1DUcfHTWnrpvkSPfnS-7-h-7fwLlFC4nokNPvOxEz5rRnVrd0HBSa1hA-VWLxPwG"
                    onClick={() => setActiveTeamMember(TEAM_MEMBERS[2]!)}
                  />
                  <div className="bg-white border border-gray-100 rounded-[2rem] rounded-bl-sm p-5 ml-[-12px] flex-grow shadow-sm z-0 pl-7">
                    <p className="text-gray-900 text-sm font-medium leading-relaxed mb-3">
                      "The robust Stellar Soroban architecture processes thousands
                      of weighing transactions daily with gas fees costing fractions
                      of a cent per transaction."
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-900 font-bold">
                        Elena Rostova, Lead Ledger Architect
                      </p>
                      <span className="text-[10px] text-gray-400 font-mono">
                        STELLAR ANCHOR
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TECH STACK & LIVE METRICS DIAGRAMS */}
        <section
          id="tech-section"
          className="w-full bg-[#fcf9f8] py-24 border-b border-gray-100"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-12">
            <div className="flex items-center gap-4 mb-12">
              <h2 className="text-3xl sm:text-5xl font-light text-gray-900 tracking-tight flex flex-wrap items-center gap-2">
                Financial{" "}
                <span className="inline-block relative">
                  <span className="relative z-10 px-6 py-1.5 text-primary-dark">
                    Protocol
                  </span>
                  <span className="absolute inset-0 bg-[#e2f1e1] rounded-full -z-0 border border-soft-green/30" />
                </span>
              </h2>
              <ArrowRight className="w-8 h-8 text-gray-400 rotate-45" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Side: Bento Grid Controls & Sliders */}
              <div className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
                {/* Top control slider with mini-photos */}
                <div className="flex items-center justify-between border border-gray-100 rounded-full p-2 pl-6 bg-white shadow-sm">
                  <div className="flex items-center gap-4 flex-grow">
                    <span className="text-base font-semibold font-mono text-gray-900">
                      04
                    </span>
                    <div className="h-1.5 bg-gray-100 flex-grow rounded-full relative mr-6 border border-gray-50">
                      <div
                        className="absolute left-0 top-0 h-full bg-[#769a8e] rounded-full transition-all duration-300"
                        style={{
                          width: `${((samplingRate - 10) / 110) * 100}%`,
                        }}
                      />
                      <input
                        type="range"
                        min="10"
                        max="120"
                        step="1"
                        value={samplingRate}
                        onChange={(e) =>
                          setSamplingRate(parseInt(e.target.value))
                        }
                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                        title="Adjust Reputation Limit"
                      />
                      {/* Slider Thumb */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 bg-[#5a8072] rounded-full border-2 border-white shadow-sm pointer-events-none transition-all duration-300"
                        style={{
                          left: `calc(${((samplingRate - 10) / 110) * 100}% - 9px)`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <img
                      alt="Padi subur hijau"
                      className="w-16 h-12 object-cover rounded-2xl rounded-tr-sm border border-gray-100"
                      src="https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
                    />
                    <img
                      alt="Rapat koperasi desa"
                      className="w-16 h-12 object-cover rounded-2xl rounded-tl-sm rounded-br-[1.5rem] border border-gray-100"
                      src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
                    />
                  </div>
                </div>

                {/* Stat Bento Card matching the solutions green background and typography */}
                <div className="bg-[#E2F1E1] rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between flex-grow relative border border-[#d0e1cf] shadow-sm overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="relative z-10">
                    <span className="text-[10px] font-mono tracking-widest text-emerald-800 block mb-1">
                      REPUTATION CREDIT SCORE
                    </span>
                    <h3 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-4 tracking-tight leading-tight">
                      Minimum Reputation: {samplingRate * 5 + 250}
                    </h3>
                    <p className="text-gray-700 text-sm leading-relaxed max-w-sm">
                      Setting a minimum credit score threshold to access
                      collateral-free fertilizer capital. Adjust the slider
                      above to simulate automated risk-eligibility adjustments.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsTechSpecsOpen(true)}
                    className="absolute bottom-6 right-6 w-11 h-11 rounded-full border border-gray-900 flex items-center justify-center hover:bg-gray-900 hover:text-white active:scale-90 transition-all shadow-sm"
                    title="View Technical Specs"
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Dr. Aaron Veridias Testimonial Bubble */}
                <div className="flex items-end mt-2 relative pl-4">
                  <div className="absolute left-0 bottom-0 w-24 h-24 bg-[#d8ead0] rounded-full -z-10 border border-[#c4dbbb]" />
                  <img
                    alt="Dr. Aaron Veridias"
                    className="w-20 h-20 rounded-full object-cover border-4 border-white ml-2 z-10 shadow-sm hover:scale-105 transition-transform cursor-pointer"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXXfI18yZ7eodjUVxfBCOgJomRsgxgdpI02i5h1SH9R4ziAVha6m7om_IbfUY7rAlqCnLeQrerGHdvFRQvbsNQFu0fINrs6jsZLUB57uIA5L8b0GTCULAzzdhsWoEQQaDP7MbIuTXd4awS6V2PkcTdOAhVRJTThQllQk78VyAl8FPMU5SGrCQlBFEeZreTDmkruqLHZcAAoxwVEkQtNdJrlKW6ZT96eqY29nJNjZM3357M8gEpshR_"
                    onClick={() => setActiveTeamMember(TEAM_MEMBERS[1]!)}
                  />
                  <div className="bg-white border border-gray-100 rounded-[2rem] rounded-bl-sm p-5 ml-[-12px] flex-grow shadow-sm z-0 pl-7">
                    <p className="text-gray-900 text-sm font-medium leading-relaxed mb-3">
                      "Leveraging machine learning to convert historical harvest
                      data into trusted reputation scores instantly without
                      bureaucratic overhead."
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-900 font-bold">
                        Aaron Veridias, Fintech Credit Advisor
                      </p>
                      <span className="text-[10px] text-gray-400 font-mono">
                        ML MODEL
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: LIVE DATA TICKING METRICS DASHBOARD */}
              <div className="lg:col-span-7 relative order-1 lg:order-2">
                <div className="relative rounded-[2rem] rounded-tl-[5rem] overflow-hidden bg-white border border-gray-100 shadow-md aspect-[4/3] w-full p-6 sm:p-8 flex flex-col justify-between">
                  {/* Simulated Monitor Background Grid */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(118,154,142,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(118,154,142,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

                  {/* Dashboard Top Header Overlay */}
                  <div className="relative z-10 flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-800">
                        <Activity className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-gray-400 block uppercase">
                          LEDGER TRANSACTION MONITOR
                        </span>
                        <p className="text-xs font-semibold text-gray-900 font-mono">
                          Transaction Block #{samplingRate}02
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[9px] font-mono bg-[#ebf5e9] text-emerald-800 border border-soft-green/30 px-2.5 py-1 rounded-md">
                        NETWORK: STELLAR MAINNET
                      </span>
                    </div>
                  </div>

                  {/* Dashboard Numeric Widgets */}
                  <div className="relative z-10 grid grid-cols-3 gap-3 my-4">
                    <div className="bg-[#ebf5e9]/40 border border-soft-green/15 rounded-xl p-3 text-center">
                      <span className="text-[9px] font-mono text-emerald-800/80 block uppercase mb-1">
                        CAPITAL DISBURSED
                      </span>
                      <p className="text-lg font-mono font-bold text-emerald-900 font-sans">
                        1.48B IDR
                      </p>
                      <span className="text-[8px] font-mono text-emerald-700/80 block mt-0.5 font-sans">
                        COOPERATIVE LIMIT
                      </span>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                      <span className="text-[9px] font-mono text-gray-400 block uppercase mb-1">
                        NETTING INTEREST
                      </span>
                      <p className="text-lg font-mono font-bold text-gray-950 font-sans">
                        0.0%
                      </p>
                      <span className="text-[8px] font-mono text-emerald-600 block mt-0.5 font-bold">
                        INTEREST-FREE
                      </span>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                      <span className="text-[9px] font-mono text-gray-400 block uppercase mb-1">
                        ACTIVE FARMERS
                      </span>
                      <p className="text-lg font-mono font-bold text-gray-950 font-sans">
                        142 FARMERS
                      </p>
                      <span className="text-[8px] font-mono text-orange-600 block mt-0.5 font-bold">
                        CIANJUR COOP
                      </span>
                    </div>
                  </div>

                  {/* Simulated Chart Bars */}
                  <div className="relative z-10 flex-grow flex items-end gap-1.5 px-2 pb-2 h-32">
                    {chartTicks.map((val, idx) => (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end h-full"
                      >
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${val}%` }}
                          transition={{ type: "spring", damping: 15 }}
                          className={`w-full rounded-t-sm ${
                            idx === chartTicks.length - 1
                              ? "bg-emerald-600 shadow-[0_4px_12px_rgba(5,150,105,0.2)]"
                              : val > 75
                                ? "bg-emerald-500"
                                : val > 50
                                  ? "bg-[#769a8e]"
                                  : "bg-emerald-100"
                          }`}
                        />
                        <span className="text-[8px] font-mono text-gray-400 mt-2">
                          {idx === chartTicks.length - 1
                            ? "LIVE"
                            : `T-${chartTicks.length - 1 - idx}`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Simulated Carbon and active counts footer */}
                  <div className="relative z-10 flex items-center justify-between border-t border-gray-100 pt-3 text-[10px] font-mono text-gray-400">
                    <span>CREDIT MODEL: ANNONA-V1.2</span>
                    <span className="text-emerald-700 flex items-center gap-1 font-mono font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      PULSE RATE: {samplingRate} Hz
                    </span>
                  </div>
                </div>

                {/* Decorative design sphere behind the card, matching hero and solutions styles */}
                <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-[#e2f1e1] rounded-full flex items-center justify-center overflow-hidden border border-[#d2e3d1]">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center -mr-5">
                    <div className="w-8 h-8 bg-[#e2f1e1] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL & SUSTAINABILITY IMPACT */}
        <section
          id="sustainability-section"
          className="w-full bg-white py-24 border-b border-gray-100"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-12">
            <div className="flex items-center gap-4 mb-12">
              <h2 className="text-3xl sm:text-5xl font-light text-gray-900 tracking-tight">
                Sustainability Impact
              </h2>
              <div className="w-10 h-10 rounded-full bg-pale-mint/80 border border-soft-green/30 flex items-center justify-center text-primary-dark shadow-sm">
                <Sprout className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Side: Large Visual Card */}
              <div className="lg:col-span-7 relative">
                <div className="relative rounded-[2.5rem] rounded-bl-[5rem] overflow-hidden bg-gray-100 aspect-[4/3] w-full border border-gray-100 shadow-sm">
                  <img
                    alt="Pertanian sawah padi hijau"
                    className="w-full h-full object-cover filter saturate-[0.85]"
                    src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1200&q=80"
                  />
                  <div className="absolute bottom-6 left-6 bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/40 z-10">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">
                      COOP PARTNERSHIP
                    </span>
                    <p className="text-xs font-semibold text-gray-900">
                      Digitalizing the Cianjur Rice Value Chain
                    </p>
                  </div>
                </div>
                {/* Decorative overlay bottom right */}
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-[#d8ead0] rounded-full flex items-center justify-center overflow-hidden z-0 border border-[#c6dcc0]">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center -mr-4 -mb-4" />
                </div>
              </div>

              {/* Right Side: Stats Bento */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Capital Ticker Card */}
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-2xl" />
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-emerald-800 block mb-1">
                      ACTIVE CAPITAL ALLOCATION
                    </span>
                    <h3 className="text-xl font-medium text-gray-900 mb-3 tracking-tight">
                      Working Capital Disbursement
                    </h3>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-5xl font-mono font-bold text-gradient">
                        IDR{" "}
                        {(carbonCounter * 12).toLocaleString(undefined, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </span>
                      <span className="text-base text-gray-500 font-light font-mono">
                        M
                      </span>
                    </div>
                    <p className="text-gray-700 text-xs leading-relaxed max-w-sm">
                      Total revolving working capital disbursed transparently to partner
                      farming groups via Stellar smart contracts without physical collateral.
                    </p>
                  </div>
                </div>

                {/* Cost Efficiency Card */}
                <div className="bg-[#E2F1E1] rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden border border-[#d0e1cf] shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="relative z-10">
                    <span className="text-[10px] font-mono tracking-widest text-emerald-800 block mb-1">
                      OPERATIONAL EFFICIENCY
                    </span>
                    <h3 className="text-4xl font-mono font-bold text-gray-950 mb-2 leading-none">
                      30%
                    </h3>
                    <p className="text-sm font-semibold text-gray-800 mb-1">
                      Farmer Margin Increase
                    </p>
                    <p className="text-gray-700 text-xs leading-relaxed">
                      Eliminating traditional intermediary margins through automated dIDR
                      price matching and guaranteed direct purchase contracts.
                    </p>
                  </div>
                </div>

                {/* Quote from Sustainability Board */}
                <div className="bg-primary-dark text-white rounded-[2.5rem] p-8 flex flex-col justify-center border border-emerald-950/40 shadow-sm relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
                  <p className="text-base font-medium italic leading-relaxed mb-4 text-gray-100">
                    "We are not just building digital financial technology; we are
                    strengthening local food security directly from the grassroots."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                      <Award className="w-4 h-4 text-soft-green" />
                    </div>
                    <span className="text-xs font-semibold text-gray-300 font-mono">
                      Cooperative Supervisory Board
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CORE FEATURES & THE INTERACTIVE EXPERIMENT */}
        <section
          id="features-section"
          className="w-full bg-[#fcf9f8] py-24 border-b border-gray-200/60"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-12">
            <div className="flex items-center gap-4 mb-12">
              <h2 className="text-3xl sm:text-5xl font-light text-gray-900 tracking-tight">
                Interactive Simulator
              </h2>
              <div className="w-10 h-10 rounded-full bg-pale-mint/80 border border-soft-green/30 flex items-center justify-center text-primary-dark shadow-sm">
                <Sprout className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Card: Climate Simulator Card */}
              <div className="lg:col-span-7 bg-[#E2F1E1] rounded-[2.5rem] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden border border-[#d2e3d1] shadow-sm">
                <div className="relative z-10 max-w-xl">
                  <span className="text-[10px] font-mono tracking-widest text-emerald-800 block mb-1">
                    CREDIT & REPUTATION
                  </span>
                  <h3 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-4 tracking-tight leading-tight">
                    Score & Capital Limit Simulation
                  </h3>
                  <p className="text-gray-800 text-sm leading-relaxed mb-6">
                    Adjust the repayment history, harvest yield capacity, and market price variables
                    below to simulate how the algorithm calculates credit scores and working
                    capital limits in real time.
                  </p>
                </div>

                {/* Embedded credit reputation interactive simulator */}
                <MicroClimateSimulator />

                {/* Status footer chips */}
                <div className="mt-8 flex flex-wrap gap-2.5 relative z-10">
                  <span className="px-4 py-1.5 rounded-full bg-white/40 border border-emerald-950/10 text-xs font-medium text-emerald-950">
                    Instant Calculation
                  </span>
                  <span className="px-4 py-1.5 rounded-full bg-white/40 border border-emerald-950/10 text-xs font-medium text-emerald-950">
                    Secure & Transparent
                  </span>
                </div>
              </div>

              {/* Right Stack: Actuator & Diagnostic Cards */}
              <div className="lg:col-span-5 flex flex-col gap-8">
                {/* Autonomous Irrigation with Actuator */}
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-2xl" />
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-emerald-800 block mb-1">
                      AUTOMATED NETTING
                    </span>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      Instant dIDR Settlement
                    </h3>
                    <p className="text-gray-700 text-xs leading-relaxed mb-6">
                      An instant netting mechanism that automatically settles fertilizer and
                      seed capital when verified harvest digital weights are uploaded to the
                      Stellar Soroban ledger.
                    </p>
                  </div>

                  {/* Simulated Actuator Trigger Button */}
                  <div className="space-y-3">
                    <button
                      onClick={triggerWatering}
                      disabled={isIrrigationActive}
                      className={`w-full py-3 px-5 rounded-2xl border text-xs font-semibold font-mono tracking-wider transition-all flex items-center justify-center gap-2 ${
                        irrigationStatus === "watering"
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : irrigationStatus === "completed"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 active:scale-98"
                      }`}
                    >
                      {irrigationStatus === "watering" && (
                        <Droplets className="w-4 h-4 text-blue-500 animate-bounce" />
                      )}
                      {irrigationStatus === "completed" && (
                        <Check className="w-4 h-4 text-emerald-500" />
                      )}
                      {irrigationStatus === "watering"
                        ? "PERFORMING dIDR NETTING..."
                        : irrigationStatus === "completed"
                          ? "NETTING COMPLETE (0% DISPUTES!)"
                          : "SIMULATE MANUAL NETTING"}
                    </button>
                    <p className="text-[10px] text-gray-400 font-mono text-center">
                      {irrigationStatus === "watering"
                        ? "Broadcasting settlement transaction to Soroban Smart Contract..."
                        : "System ready to ingest digital scale telemetry."}
                    </p>
                  </div>
                </div>

                {/* Diagnostics Health card */}
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-emerald-800 block mb-1">
                      COOPERATIVE TELEMETRY
                    </span>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      Cash Flow & Live Transactions
                    </h3>
                    <p className="text-gray-700 text-xs leading-relaxed mb-6">
                      Access the transaction monitor dashboard to track locked netting funds,
                      harvest success rates, and partner reputation indexes across cooperatives.
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setSelectedTelemetryCity("cianjur");
                        setIsTelemetryOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-full border border-gray-300 text-xs font-medium hover:bg-gray-50 hover:border-gray-400 flex items-center gap-2 transition-all active:scale-95"
                    >
                      Open Coop Monitor
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ROADMAP SECTION */}
        <section
          id="roadmap-section"
          className="w-full bg-white py-24 border-b border-gray-100 relative"
        >
          {/* Background decorations */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#E2F1E1]/30 rounded-full blur-3xl -z-0 pointer-events-none" />
          <div className="absolute top-1/2 right-0 w-64 h-64 bg-[#d8ead0]/20 rounded-full blur-2xl -z-0 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 md:px-12 relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 mb-16">
              <h2 className="text-4xl sm:text-6xl font-medium tracking-tight leading-none text-gray-900">
                Protocol{" "}
                <span className="inline-block relative">
                  <span className="relative z-10 px-6 py-1">Roadmap</span>
                  <span className="absolute inset-0 bg-[#e2f1e1] rounded-full -z-0 border border-soft-green/30" />
                </span>
              </h2>
              <div className="w-12 h-12 rounded-full bg-white border border-gray-100 flex items-center justify-center text-emerald-800 shadow-sm">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Left Column: L1 / L3 */}
              <div className="flex flex-col gap-8">
                {/* L1 */}
                <div
                  onClick={() => setSelectedRoadmapQuarter("L1")}
                  className={`border rounded-[2.5rem] p-8 shadow-sm transition-all relative overflow-hidden group cursor-pointer ${
                    selectedRoadmapQuarter === "L1"
                      ? "bg-zinc-50 border-gray-300 ring-1 ring-gray-200"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="inline-block px-4 py-1.5 rounded-full bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest font-mono">
                        L1 Horizon
                      </span>
                      <span className="text-[11px] font-mono text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> ACTIVE
                      </span>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      {ROADMAP_ITEMS[0]!.title}
                    </h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {ROADMAP_ITEMS[0]!.description}
                    </p>
                  </div>

                  {/* Expanded Details drawer */}
                  <AnimatePresence>
                    {selectedRoadmapQuarter === "L1" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 pt-5 border-t border-gray-200/60 text-xs font-mono text-gray-600 space-y-2"
                      >
                        <p className="font-semibold text-gray-800">
                          MILESTONES ACHIEVED:
                        </p>
                        {ROADMAP_ITEMS[0]!.details.map((detail, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-emerald-700 font-bold">
                              •
                            </span>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* L3 */}
                <div
                  onClick={() => setSelectedRoadmapQuarter("L3")}
                  className={`border rounded-[2.5rem] p-8 shadow-sm transition-all relative overflow-hidden group cursor-pointer ${
                    selectedRoadmapQuarter === "L3"
                      ? "bg-zinc-50 border-gray-300 ring-1 ring-gray-200"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="inline-block px-4 py-1.5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-widest font-mono">
                        L3 Horizon
                      </span>
                      <span className="text-[11px] font-mono text-orange-600 font-semibold flex items-center gap-1 animate-pulse">
                        • IN ACTIVE DEVELOPMENT
                      </span>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      {ROADMAP_ITEMS[2]!.title}
                    </h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {ROADMAP_ITEMS[2]!.description}
                    </p>
                  </div>

                  {/* Expanded Details drawer */}
                  <AnimatePresence>
                    {selectedRoadmapQuarter === "L3" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 pt-5 border-t border-gray-200/60 text-xs font-mono text-gray-600 space-y-2"
                      >
                        <p className="font-semibold text-gray-800">
                          ACTIVE SPRINTS:
                        </p>
                        {ROADMAP_ITEMS[2]!.details.map((detail, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-orange-600 font-bold">•</span>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Column: L2 / L4 */}
              <div className="flex flex-col gap-8 md:pt-16">
                {/* L2 */}
                <div
                  onClick={() => setSelectedRoadmapQuarter("L2")}
                  className={`rounded-[2.5rem] p-8 shadow-sm transition-all relative overflow-hidden group cursor-pointer border ${
                    selectedRoadmapQuarter === "L2"
                      ? "bg-zinc-50 border-gray-300 ring-1 ring-gray-200"
                      : "bg-[#E2F1E1] border-transparent hover:bg-[#d4e6d3]"
                  }`}
                >
                  <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/30 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="inline-block px-4 py-1.5 rounded-full bg-white text-green-800 text-[10px] font-bold uppercase tracking-widest font-mono border border-green-200/50">
                        L2 Horizon
                      </span>
                      <span className="text-[11px] font-mono text-emerald-950 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> ACTIVE
                      </span>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      {ROADMAP_ITEMS[1]!.title}
                    </h3>
                    <p className="text-gray-800 text-sm leading-relaxed">
                      {ROADMAP_ITEMS[1]!.description}
                    </p>
                  </div>

                  {/* Expanded Details drawer */}
                  <AnimatePresence>
                    {selectedRoadmapQuarter === "L2" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 pt-5 border-t border-gray-200/60 text-xs font-mono text-emerald-950 space-y-2"
                      >
                        <p className="font-semibold text-emerald-900">
                          MILESTONES ACHIEVED:
                        </p>
                        {ROADMAP_ITEMS[1]!.details.map((detail, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-emerald-800 font-bold">
                              •
                            </span>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* L4 */}
                <div
                  onClick={() => setSelectedRoadmapQuarter("L4")}
                  className={`border rounded-[2.5rem] p-8 shadow-sm transition-all relative overflow-hidden group cursor-pointer ${
                    selectedRoadmapQuarter === "L4"
                      ? "bg-zinc-50 border-gray-300 ring-1 ring-gray-200"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="inline-block px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest font-mono">
                        L4 Horizon
                      </span>
                      <span className="text-[11px] font-mono text-gray-500 font-semibold flex items-center gap-1">
                        • FUTURE HORIZON
                      </span>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      {ROADMAP_ITEMS[3]!.title}
                    </h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {ROADMAP_ITEMS[3]!.description}
                    </p>
                  </div>

                  {/* Expanded Details drawer */}
                  <AnimatePresence>
                    {selectedRoadmapQuarter === "L4" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 pt-5 border-t border-gray-200/60 text-xs font-mono text-gray-600 space-y-2"
                      >
                        <p className="font-semibold text-gray-800">
                          DEVELOPMENT SCOPE:
                        </p>
                        {ROADMAP_ITEMS[3]!.details.map((detail, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-gray-400 font-bold">•</span>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="absolute bottom-6 right-6 opacity-20 pointer-events-none group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-14 h-14 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section
          id="cta-section"
          className="w-full bg-white py-24 border-b border-gray-100"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-12">
            <div className="bg-primary-dark rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden border border-emerald-950/40 shadow-xl">
              {/* Background design accents */}
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#769a8e]/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl mx-auto space-y-8">
                <h2 className="text-3xl sm:text-6xl font-medium text-white tracking-tight leading-tight">
                  Ready to Empower Your Cooperative?
                </h2>
                <p className="text-lg text-white/80 max-w-lg mx-auto font-light leading-relaxed">
                  Begin digitalizing transactions, establishing reputation scores without
                  physical collateral, and leveraging automated netting efficiency with
                  Annona.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <button
                    onClick={() => setIsProposalOpen(true)}
                    className="w-full sm:w-auto px-8 py-4 bg-[#d8ead0] hover:bg-white text-primary-dark rounded-full font-semibold text-base transition-all active:scale-95 shadow"
                  >
                    Apply for Coop Partnership
                  </button>
                  <button
                    onClick={() => setIsTechSpecsOpen(true)}
                    className="w-full sm:w-auto px-8 py-4 border border-white/30 text-white rounded-full font-semibold text-base hover:bg-white/10 transition-all active:scale-95"
                  >
                    View Protocol Specs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>

      {/* FOOTER */}
      <footer id="main-footer" className="w-full bg-surface py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand column */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center relative">
                  <div className="w-3.5 h-3.5 bg-white rounded-full absolute -right-0.5 bottom-0.5" />
                </div>
                <span className="text-xl font-semibold tracking-tight text-gray-900">
                  Annona Protocol
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed max-w-[220px]">
                Digital financial infrastructure and automated netting for
                rural agricultural cooperatives.
              </p>
            </div>

            {/* Links columns */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-mono mb-5">
                Platform
              </h4>
              <ul className="flex flex-col gap-3 text-sm">
                <li>
                  <button
                    onClick={() => scrollToSection("solutions-section")}
                    className="text-gray-600 hover:text-primary-dark hover:underline transition-colors text-left"
                  >
                    Cooperative Solutions
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("how-it-works-section")}
                    className="text-gray-600 hover:text-primary-dark hover:underline transition-colors text-left"
                  >
                    Protocol Workflow
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("sustainability-section")}
                    className="text-gray-600 hover:text-primary-dark hover:underline transition-colors text-left"
                  >
                    Sustainability Impact
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("tech-section")}
                    className="text-gray-600 hover:text-primary-dark hover:underline transition-colors text-left"
                  >
                    Financial Protocol
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("roadmap-section")}
                    className="text-gray-600 hover:text-primary-dark hover:underline transition-colors text-left"
                  >
                    Roadmap
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-mono mb-5">
                Partnerships
              </h4>
              <ul className="flex flex-col gap-3 text-sm">
                <li>
                  <button
                    onClick={() => scrollToSection("team-showcase-card")}
                    className="text-gray-600 hover:text-primary-dark hover:underline transition-colors text-left"
                  >
                    Specialist Team
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setIsProposalOpen(true)}
                    className="text-gray-600 hover:text-primary-dark hover:underline transition-colors text-left"
                  >
                    Apply for Partnership
                  </button>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-primary-dark hover:underline transition-colors"
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>

            {/* Subscribe newsletter column */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-mono mb-5">
                Stay Connected
              </h4>
              <p className="text-gray-700 text-xs leading-relaxed mb-4">
                Get the latest updates on protocol specifications and coop integrations.
              </p>

              {newsletterSubscribed ? (
                <div className="bg-pale-mint/50 border border-soft-green/30 rounded-2xl p-3 text-center">
                  <p className="text-xs font-semibold text-emerald-800">
                    Successfully Subscribed!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Email address"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="flex-grow px-4 py-2.5 rounded-full border border-gray-200 text-xs focus:outline-none focus:border-primary-dark focus:ring-1 focus:ring-primary-dark"
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 bg-primary-dark text-white rounded-full flex items-center justify-center hover:bg-opacity-95 transition-all shadow-sm shrink-0"
                    title="Subscribe"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Bottom links copyright */}
          <div className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 font-mono">
            <span>© 2026 Annona Protocol. All Rights Reserved.</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-gray-900">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-gray-900">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* MODALS GATEWAY */}
      <LiveTelemetryModal
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        initialCityId={selectedTelemetryCity}
      />
      <ProjectProposalModal
        isOpen={isProposalOpen}
        onClose={() => setIsProposalOpen(false)}
      />
      <TechSpecsModal
        isOpen={isTechSpecsOpen}
        onClose={() => setIsTechSpecsOpen(false)}
      />
    </div>
  );
}
