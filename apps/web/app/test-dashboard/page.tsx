"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  Sprout,
  Cpu,
  Activity,
  ArrowRight,
  Wallet,
  Scale,
  Wheat,
  Banknote,
  LogOut,
  ChevronRight,
  Layers,
  Users,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import "../urbangreen/urbangreen.css";

// ─── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_STATS = {
  outstandingDebt: "Rp 14.800.000",
  activeAgreements: 12,
  settlementRate: 87,
  residuOwed: "Rp 1.200.000",
};

const MOCK_HARVEST = [
  {
    id: "AGR-001",
    farmer: "Budi Santoso",
    commodity: "Gabah",
    expectedKg: 2750,
    deliveredKg: 2100,
    status: "SEBAGIAN",
    date: "12 Jul 2026",
  },
  {
    id: "AGR-002",
    farmer: "Siti Aminah",
    commodity: "Gabah",
    expectedKg: 1800,
    deliveredKg: 0,
    status: "AKTIF",
    date: "15 Jul 2026",
  },
];

const MOCK_FARMERS = [
  {
    id: "PTN-001",
    name: "Budi Santoso",
    landSize: "2.4 Ha",
    commodity: "Gabah",
    status: "AKTIF",
    wallet: "GABC...TX9F",
    verified: true,
  },
  {
    id: "PTN-002",
    name: "Siti Aminah",
    landSize: "1.8 Ha",
    commodity: "Gabah",
    status: "AKTIF",
    wallet: "GAXX...W23D",
    verified: true,
  },
  {
    id: "PTN-003",
    name: "H. Ahmad",
    landSize: "3.2 Ha",
    commodity: "Gabah",
    status: "SELESAI",
    wallet: "GABD...Y57H",
    verified: true,
  },
  {
    id: "PTN-004",
    name: "Eko Purwanto",
    landSize: "2.0 Ha",
    commodity: "Gabah",
    status: "AKTIF",
    wallet: "GAZZ...P02A",
    verified: false,
  },
];

const MOCK_AGREEMENTS = [
  {
    id: "AGR-001",
    farmer: "Budi Santoso",
    commodity: "Gabah",
    debt: "Rp 4.200.000",
    expectedVol: "2.750 Kg",
    status: "PartiallyDelivered",
  },
  {
    id: "AGR-002",
    farmer: "Siti Aminah",
    commodity: "Gabah",
    debt: "Rp 3.100.000",
    expectedVol: "1.800 Kg",
    status: "Active",
  },
  {
    id: "AGR-003",
    farmer: "H. Ahmad",
    commodity: "Gabah",
    debt: "Rp 5.500.000",
    expectedVol: "3.500 Kg",
    status: "Settled",
  },
  {
    id: "AGR-004",
    farmer: "Eko Purwanto",
    commodity: "Gabah",
    debt: "Rp 2.000.000",
    expectedVol: "1.200 Kg",
    status: "Created",
  },
];

const MOCK_TRANSACTIONS = [
  {
    id: "TX-901",
    type: "Settle Payment (Netting)",
    amount: "Rp 7.200.000",
    status: "Settled",
    hash: "GABC...TX9F",
    time: "Hari ini, 10:42",
  },
  {
    id: "TX-902",
    type: "Disburse Credit Saprotan",
    amount: "Rp 4.200.000",
    status: "Active",
    hash: "GAXX...W23D",
    time: "Kemarin, 14:15",
  },
  {
    id: "TX-903",
    type: "Settle Payment (Lunas)",
    amount: "Rp 9.600.000",
    status: "Settled",
    hash: "GABD...Y57H",
    time: "5 Jul 2026",
  },
  {
    id: "TX-904",
    type: "Logistics Dispatch",
    amount: "Rp 2.000.000",
    status: "SupplyDispatched",
    hash: "GAZZ...P02A",
    time: "2 Jul 2026",
  },
];

const getStatusStyles = (status: string) => {
  switch (status) {
    case "Created":
    case "PENDING":
      return "bg-slate-50 text-slate-700 border-slate-200/50";
    case "SupplyDispatched":
      return "bg-indigo-50 text-indigo-700 border-indigo-200/50";
    case "Active":
    case "AKTIF":
      return "bg-[#e7fafc] text-[#0c6a78] border-[#c3f2f6]/60";
    case "PartiallyDelivered":
    case "SEBAGIAN":
      return "bg-cyan-50 text-cyan-800 border-cyan-200/50";
    case "Delivered":
      return "bg-[#ecfdf1] text-[#0c7a48] border-[#d2f9de]";
    case "Settled":
    case "SELESAI":
      return "bg-[#ebf5e9] text-[#0c7a48] border-[#d2f9de]";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

export default function TestDashboardPage() {
  const [activeTab, setActiveTab] = useState("beranda");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [chartTicks, setChartTicks] = useState<{ id: string; val: number }[]>([
    { id: "tick-0", val: 20 },
    { id: "tick-1", val: 40 },
    { id: "tick-2", val: 30 },
    { id: "tick-3", val: 60 },
    { id: "tick-4", val: 50 },
    { id: "tick-5", val: 80 },
    { id: "tick-6", val: 40 },
  ]);
  const [samplingRate, setSamplingRate] = useState(86);

  // Simulate dashboard ticking
  useEffect(() => {
    let tickCounter = 7;
    const interval = setInterval(() => {
      setChartTicks((prev) => {
        const nextVal = Math.floor(Math.random() * 100);
        const next = [
          ...prev.slice(1),
          { id: `tick-${tickCounter++}`, val: nextVal },
        ];
        return next;
      });
      setSamplingRate((prev) => (prev > 110 ? 86 : prev + 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="urbangreen-body min-h-screen flex flex-col bg-[#fcf9f8] text-gray-900 overflow-x-clip antialiased font-sans">
      {/* ─── HEADER NAVIGATION (Landing.tsx Style) ───────────────────────── */}
      <div className="sticky top-0 z-40 w-full px-4 md:px-12 py-4 pointer-events-none">
        <header className="max-w-7xl mx-auto w-full px-6 py-3 md:py-3.5 flex items-center justify-between bg-white/80 backdrop-blur-md border border-gray-100 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] pointer-events-auto transition-all">
          <div className="flex items-center gap-3 cursor-pointer">
            <img
              src="/brand/annona-wordmark-logo.png"
              alt="Annona Protocol Logo"
              className="h-8 w-auto hover:scale-105 transition-transform object-contain"
            />
            <span className="text-xl font-semibold tracking-tight hidden sm:block text-primary-dark">
              Dashboard KMP
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden px-5 py-3 rounded-full text-sm font-semibold border flex items-center gap-1.5 transition-all bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100"
            >
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              Menu
            </button>
            <button type="button" className="hidden lg:flex bg-primary-dark text-white px-5 py-3 rounded-full text-sm font-medium hover:bg-opacity-90 transition-all shadow-sm active:scale-95 items-center gap-2">
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </header>
      </div>

      {/* Slide-out Sidebar Drawer on Mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black lg:hidden pointer-events-auto"
            />
            {/* Drawer panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[80vw] bg-[#fcf9f8] p-6 shadow-2xl flex flex-col gap-6 overflow-y-auto lg:hidden pointer-events-auto border-r border-gray-100"
            >
              {/* Logo and Close Button */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/brand/annona-wordmark-logo.png"
                    alt="Annona Protocol Logo"
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* KUD Showcase Card */}
              <div className="bg-soft-green rounded-[2rem] p-6 flex flex-col gap-5 relative overflow-hidden border border-soft-green/30">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-[#d8ead0] flex items-center justify-center text-xs font-bold text-emerald-800 shadow-sm">
                    KUD
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">
                      KUD Harapan Maju
                    </span>
                    <span className="text-[10px] text-emerald-800 font-mono block opacity-85">
                      TESTNET
                    </span>
                  </div>
                </div>
                <div className="relative z-10 text-xs">
                  <span className="text-gray-700 block mb-1">
                    Kab. Cianjur, Jawa Barat
                  </span>
                  <span className="inline-block px-2 py-0.5 bg-white/50 border border-white/65 rounded text-[10px] font-mono text-emerald-900">
                    GABC...TX9F
                  </span>
                </div>
              </div>

              {/* Navigation vertical menu */}
              <nav className="flex flex-col gap-2">
                {["Beranda", "Petani", "Perjanjian", "Transaksi"].map((tab) => {
                  const tabId = tab.toLowerCase();
                  let TabIcon = Globe;
                  if (tabId === "petani") TabIcon = Users;
                  else if (tabId === "perjanjian") TabIcon = Scale;
                  else if (tabId === "transaksi") TabIcon = Banknote;

                  return (
                    <button
                      type="button"
                      key={tabId}
                      onClick={() => {
                        setActiveTab(tabId);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                        activeTab === tabId
                          ? "bg-soft-green text-gray-900 shadow-sm"
                          : "text-gray-600 hover:bg-gray-100/50"
                      }`}
                    >
                      <TabIcon className="w-5 h-5 shrink-0" />
                      <span>{tab}</span>
                    </button>
                  );
                })}
              </nav>

              {/* User profile / Logout */}
              <div className="mt-auto border-t border-gray-100 pt-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-800 border border-emerald-200">
                    HU
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">H. Usman</h4>
                    <p className="text-[10px] text-gray-500 font-mono">PENGURUS KMP</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="bg-primary-dark text-white w-full px-4 py-3 rounded-xl text-sm font-medium hover:bg-opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <main className="flex-grow flex flex-col lg:flex-row px-4 md:px-12 pt-2 lg:pt-8 pb-16 gap-8 relative max-w-7xl mx-auto w-full">
        {/* ─── LEFT SIDEBAR (Desktop Docked, Mobile Hidden) ─── */}
        <aside className="hidden lg:flex lg:w-64 flex-col gap-6 shrink-0">
          {/* KUD Showcase Card */}
          <div className="bg-soft-green rounded-[2.5rem] rounded-bl-[3.5rem] p-8 flex flex-col gap-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all border border-soft-green/30">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-full bg-white border-2 border-[#d8ead0] flex items-center justify-center text-sm font-bold text-emerald-800 shadow-sm">
                KUD
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900 block tracking-tight">
                  KUD Harapan Maju
                </span>
                <span className="text-xs text-emerald-800 font-mono mt-0.5 block opacity-80">
                  TESTNET
                </span>
              </div>
            </div>

            <div className="relative z-10">
              <span className="text-sm text-gray-700 block mb-1">
                Kab. Cianjur, Jawa Barat
              </span>
              <span className="inline-block px-3 py-1 bg-white/50 border border-white/60 rounded-lg text-xs font-mono text-emerald-900">
                GABC...TX9F
              </span>
            </div>

            {/* Decorative organic shapes */}
            <div className="absolute bottom-6 right-6 flex gap-1 pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-white opacity-80 rounded-tl-none animate-pulse" />
              <div className="w-4 h-4 rounded-full bg-white opacity-80 mt-auto" />
            </div>
          </div>

          {/* Navigation vertical menu */}
          <nav className="flex flex-col gap-1.5 bg-white border border-gray-100 rounded-[2rem] p-4 shadow-sm">
            {["Beranda", "Petani", "Perjanjian", "Transaksi"].map((tab) => {
              const tabId = tab.toLowerCase();
              let TabIcon = Globe;
              if (tabId === "petani") TabIcon = Users;
              else if (tabId === "perjanjian") TabIcon = Scale;
              else if (tabId === "transaksi") TabIcon = Banknote;

              return (
                <button
                  type="button"
                  key={tabId}
                  onClick={() => setActiveTab(tabId)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                    activeTab === tabId
                      ? "bg-soft-green text-gray-900 shadow-sm"
                      : "text-gray-600 hover:bg-gray-100/50"
                  }`}
                >
                  <TabIcon className="w-5 h-5 shrink-0" />
                  <span>{tab}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile Drawer style */}
          <div className="bg-[#ebf5e9]/90 border border-soft-green/50 rounded-[2rem] p-5 shadow-sm text-xs space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/30 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-800 border border-emerald-200">
                HU
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">
                  H. Usman
                </h4>
                <p className="text-[10px] text-gray-600 font-mono tracking-wider mt-0.5">
                  PENGURUS KMP
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar Tagline */}
          <div className="mt-auto pl-2 pb-2 pt-6">
            <svg
              className="mb-4 text-emerald-800 animate-spin-slow"
              fill="none"
              height="24"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Decorative star"
            >
              <title>Decorative star</title>
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            <p className="text-xl font-medium leading-tight text-gray-900 max-w-[180px] tracking-tight">
              Kedaulatan Finansial untuk Koperasi Desa
            </p>
          </div>
        </aside>

        {/* ─── MAIN CONTENT AREA ─────────────────────────────────────────── */}
        <section className="flex-1 flex flex-col gap-6 pt-2 lg:pt-0">
          <AnimatePresence mode="wait">
            {activeTab === "beranda" && (
              <motion.div
                key="beranda"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                {/* Hero Greeting */}
                <div className="max-w-4xl text-left">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.1] text-gray-900">
                    Selamat Datang,{" "}
                    <span className="inline-block relative my-1">
                      <span className="relative z-10 px-4 sm:px-6 py-1 text-primary-dark">
                        H. Usman
                      </span>
                      <span className="absolute inset-0 bg-[#e2f1e1] rounded-full -z-0 border border-soft-green/30" />
                    </span>
                  </h1>
                  <p className="text-gray-600 text-sm mt-3 tracking-wide max-w-xl leading-relaxed">
                    Ringkasan buku offtake and kesehatan kas koperasi minggu ini.
                    Semua transaksi tercatat otomatis dan diverifikasi secara
                    transparan di jaringan Stellar.
                  </p>
                </div>

                {/* Cash Health Banner (Bento Card) */}
                <div className="bg-[#E2F1E1] rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border border-[#d0e1cf] shadow-sm group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none transition-transform group-hover:scale-110 duration-700" />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/60 border border-white shadow-sm flex items-center justify-center text-emerald-800 shrink-0">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="inline-block px-3 py-1 bg-white border border-emerald-100 rounded-full text-[9px] font-mono tracking-widest text-emerald-800 font-bold uppercase mb-2">
                          STATUS KAS KOPERASI
                        </span>
                        <h3 className="text-2xl font-medium text-gray-900 tracking-tight">
                          Kas siap untuk panen minggu ini
                        </h3>
                        <p className="text-gray-700 text-sm leading-relaxed mt-1">
                          Perlu disiapkan Rp 4.200.000 untuk pembayaran petani. Saldo
                          kas saat ini mencukupi.
                        </p>
                      </div>
                    </div>
                    <button type="button" className="bg-primary-dark text-white px-6 py-3.5 rounded-full text-sm font-medium hover:bg-opacity-90 transition-all shadow-sm active:scale-95 flex items-center gap-2 shrink-0">
                      Isi Ulang Kas
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stat Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white rounded-[2.5rem] p-8 relative border border-gray-100 shadow-sm overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-soft-green/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <span className="text-xs font-semibold tracking-widest text-gray-400 block mb-2 uppercase">
                          UTANG SAPROTAN
                        </span>
                        <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
                          {MOCK_STATS.outstandingDebt}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-4">
                        <Scale className="w-4 h-4 text-emerald-600" />
                        Piutang petani aktif
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-8 relative border border-gray-100 shadow-sm overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-soft-green/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <span className="text-xs font-semibold tracking-widest text-gray-400 block mb-2 uppercase">
                          PERJANJIAN AKTIF
                        </span>
                        <h3 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">
                          {MOCK_STATS.activeAgreements}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-4">
                        <Wheat className="w-4 h-4 text-emerald-600" />
                        Termasuk dlm perjalanan
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#E2F1E1] rounded-[2.5rem] p-8 relative border border-[#d0e1cf] shadow-sm overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <span className="text-xs font-semibold tracking-widest text-emerald-800 block mb-2 uppercase">
                          TINGKAT PELUNASAN
                        </span>
                        <h3 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">
                          {MOCK_STATS.settlementRate}%
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-emerald-700 mt-4 font-medium">
                        <Banknote className="w-4 h-4" />
                        Kesehatan sangat baik
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-8 relative border border-gray-100 shadow-sm overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <span className="text-xs font-semibold tracking-widest text-gray-400 block mb-2 uppercase">
                          RESIDU POKOK ANNONA
                        </span>
                        <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
                          {MOCK_STATS.residuOwed}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-amber-600 mt-4 font-medium">
                        <Banknote className="w-4 h-4" />
                        Wajib setor balik
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Harvest List */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
                          Panen Minggu Ini
                        </h2>
                        <div className="w-8 h-8 rounded-full bg-[#ebf5e9] border border-soft-green/30 flex items-center justify-center text-primary-dark">
                          <Wheat className="w-4 h-4" />
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setActiveTab("perjanjian")}
                        className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 min-h-[44px] px-3"
                      >
                        Lihat Semua <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {MOCK_HARVEST.map((h) => (
                        <div
                          key={h.id}
                          className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-soft-green/5 rounded-full blur-2xl pointer-events-none" />
                          <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-base font-bold text-gray-900">
                                  {h.farmer}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {h.commodity} • Est. {h.expectedKg} kg
                                </p>
                              </div>
                              <span
                                className={`px-3.5 py-1 rounded-full text-xs font-mono tracking-widest font-bold uppercase border ${getStatusStyles(h.status)}`}
                              >
                                {h.status}
                              </span>
                            </div>

                            {/* Landing.tsx style progress bar */}
                            <div>
                              <div className="flex justify-between text-xs font-mono text-gray-500 mb-2">
                                <span>PROGRES SETORAN</span>
                                <span className="font-bold">
                                  {h.deliveredKg} / {h.expectedKg} kg
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full relative border border-gray-50 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: `${(h.deliveredKg / h.expectedKg) * 100}%`,
                                  }}
                                  transition={{
                                    duration: 1,
                                    ease: "easeOut",
                                  }}
                                  className="absolute left-0 top-0 h-full bg-[#769a8e] rounded-full"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Ledger Monitor (from Landing.tsx tech-section) */}
                  <div className="lg:col-span-6 relative flex flex-col h-full space-y-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
                        Status Ledger
                      </h2>
                      <div className="w-8 h-8 rounded-full bg-[#ebf5e9] border border-soft-green/30 flex items-center justify-center text-primary-dark">
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="relative rounded-[2.5rem] rounded-tl-[4.5rem] overflow-hidden bg-white border border-gray-100 shadow-sm w-full p-6 sm:p-8 flex flex-col flex-grow">
                      {/* Simulated Monitor Background Grid */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(118,154,142,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(118,154,142,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

                      {/* Dashboard Top Header Overlay */}
                      <div className="relative z-10 flex items-center justify-between border-b border-gray-100 pb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-800 shadow-sm">
                            <Activity className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-gray-400 block uppercase">
                              KONEKSI SOROBAN
                            </span>
                            <p className="text-sm font-semibold text-gray-900 font-mono">
                              Blok Transaksi #{samplingRate}02
                            </p>
                          </div>
                        </div>
                        <div className="hidden sm:flex gap-2">
                          <span className="text-[10px] font-mono bg-[#ebf5e9] text-emerald-800 border border-soft-green/30 px-3 py-1.5 rounded-full font-semibold shadow-sm">
                            STELLAR TESTNET
                          </span>
                        </div>
                      </div>

                      {/* Dashboard Numeric Widgets */}
                      <div className="relative z-10 grid grid-cols-2 gap-4 my-6">
                        <div className="bg-[#ebf5e9]/60 border border-soft-green/30 rounded-[1.5rem] p-5 text-center shadow-sm">
                          <span className="text-[10px] font-mono text-emerald-800/80 block uppercase mb-1">
                            KAPASITAS KREDIT
                          </span>
                          <p className="text-2xl font-mono font-bold text-emerald-900">
                            Rp 400 Jt
                          </p>
                          <span className="text-[9px] font-mono text-emerald-700/80 block mt-1 bg-white/50 py-0.5 rounded-full">
                            BATAS AMAN KUD
                          </span>
                        </div>
                        <div className="bg-gray-50/80 border border-gray-100 rounded-[1.5rem] p-5 text-center shadow-sm">
                          <span className="text-[10px] font-mono text-gray-500 block uppercase mb-1">
                            PERJANJIAN TERCATAT
                          </span>
                          <p className="text-2xl font-mono font-bold text-gray-900 font-sans">
                            12 Kontrak
                          </p>
                          <span className="text-[9px] font-mono text-emerald-600 block mt-1 font-bold bg-emerald-50 py-0.5 rounded-full">
                            TIDAK BISA DIUBAH
                          </span>
                        </div>
                      </div>

                      {/* Simulated Chart Bars */}
                      <div className="relative z-10 flex-grow flex items-end gap-2 px-2 pb-2 h-32 mt-auto">
                        {chartTicks.map((tick) => (
                          <div
                            key={tick.id}
                            className="flex-1 flex flex-col items-center justify-end h-full"
                          >
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${tick.val}%` }}
                              transition={{ type: "spring", damping: 15 }}
                              className="w-full rounded-t-md bg-[#769a8e]"
                            />
                            <span className="text-[8px] font-mono text-gray-400 mt-2">
                              {tick.id.includes("tick-6") ? "LIVE" : "HIST"}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Simulated Carbon and active counts footer */}
                      <div className="relative z-10 flex items-center justify-between border-t border-gray-100 pt-4 mt-4 text-[10px] font-mono text-gray-400">
                        <span>SMART CONTRACT: ANNONA-V1.2</span>
                        <span className="text-emerald-700 flex items-center gap-1.5 font-mono font-semibold bg-emerald-50 px-2 py-1 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          SYNC: {samplingRate} Hz
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "petani" && (
              <motion.div
                key="petani"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                {/* Hero Greeting */}
                <div className="max-w-4xl text-left">
                  <h1 className="text-4xl sm:text-5xl font-medium tracking-tight leading-[1.1] text-gray-900">
                    Daftar{" "}
                    <span className="inline-block relative my-1">
                      <span className="relative z-10 px-4 sm:px-6 py-1 text-primary-dark">
                        Petani Mitra
                      </span>
                      <span className="absolute inset-0 bg-[#e2f1e1] rounded-full -z-0 border border-soft-green/30" />
                    </span>
                  </h1>
                  <p className="text-gray-600 text-sm mt-3 tracking-wide max-w-xl leading-relaxed">
                    Daftar petani yang terdaftar dalam Koperasi Unit Desa. Data pribadi tetap aman terenkripsi secara kriptografis di jaringan Stellar.
                  </p>
                </div>

                {/* Bento grid list of Farmers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {MOCK_FARMERS.map((ptn) => (
                    <div key={ptn.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-soft-green/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="relative z-10 flex flex-col justify-between h-full gap-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-800 text-base">
                              {ptn.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-base">{ptn.name}</h4>
                              <span className="text-xs text-gray-400 font-mono">{ptn.id}</span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-mono tracking-widest font-bold uppercase border ${getStatusStyles(ptn.status)}`}>
                            {ptn.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-sm">
                          <div>
                            <span className="text-xs font-semibold text-gray-400 block uppercase mb-0.5">LUAS LAHAN</span>
                            <p className="font-bold text-gray-900 text-base">{ptn.landSize}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-400 block uppercase mb-0.5">KOMODITAS</span>
                            <p className="font-bold text-gray-900 text-base">{ptn.commodity}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 font-bold">STELLAR ADDR:</span>
                            <span className="text-gray-700 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-xs">{ptn.wallet}</span>
                          </div>
                          {ptn.verified ? (
                            <span className="text-emerald-700 flex items-center gap-1 font-semibold bg-[#ebf5e9] border border-[#d2f9de] px-2.5 py-1 rounded-md">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              AKTIF
                            </span>
                          ) : (
                            <span className="text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md">
                              PENDING
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "perjanjian" && (
              <motion.div
                key="perjanjian"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                {/* Hero Greeting */}
                <div className="max-w-4xl text-left">
                  <h1 className="text-4xl sm:text-5xl font-medium tracking-tight leading-[1.1] text-gray-900">
                    Perjanjian{" "}
                    <span className="inline-block relative my-1">
                      <span className="relative z-10 px-4 sm:px-6 py-1 text-primary-dark">
                        Offtake & Kredit
                      </span>
                      <span className="absolute inset-0 bg-[#e2f1e1] rounded-full -z-0 border border-soft-green/30" />
                    </span>
                  </h1>
                  <p className="text-gray-600 text-sm mt-3 tracking-wide max-w-xl leading-relaxed">
                    Daftar kontrak pintar (smart contract) Soroban yang mengunci saprotan debt dan kesepakatan HPP.
                  </p>
                </div>

                {/* List of agreements in cards */}
                <div className="space-y-4">
                  {MOCK_AGREEMENTS.map((agr) => (
                    <div key={agr.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-soft-green/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-[#ebf5e9] border border-soft-green/30 flex items-center justify-center text-primary-dark shrink-0">
                            <Scale className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-bold text-gray-400">{agr.id}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono tracking-widest font-bold uppercase border ${getStatusStyles(agr.status)}`}>
                                {agr.status}
                              </span>
                            </div>
                            <h4 className="font-bold text-gray-900 text-lg mt-1">Petani: {agr.farmer}</h4>
                            <p className="text-gray-500 text-sm mt-0.5">Komoditas: {agr.commodity}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-8 text-sm font-mono border-t sm:border-t-0 pt-4 sm:pt-0">
                          <div>
                            <span className="text-xs text-gray-400 block uppercase mb-0.5">UTANG SAPROTAN</span>
                            <p className="font-bold text-gray-900 text-base">{agr.debt}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400 block uppercase mb-0.5">TARGET VOL</span>
                            <p className="font-bold text-gray-900 text-base">{agr.expectedVol}</p>
                          </div>
                        </div>
                        
                        <button type="button" className="bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-700 px-5 py-3 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[44px]">
                          Detail Kontrak
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "transaksi" && (
              <motion.div
                key="transaksi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                {/* Hero Greeting */}
                <div className="max-w-4xl text-left">
                  <h1 className="text-4xl sm:text-5xl font-medium tracking-tight leading-[1.1] text-gray-900">
                    Ledger{" "}
                    <span className="inline-block relative my-1">
                      <span className="relative z-10 px-4 sm:px-6 py-1 text-primary-dark">
                        Transaksi Real-Time
                      </span>
                      <span className="absolute inset-0 bg-[#e2f1e1] rounded-full -z-0 border border-soft-green/30" />
                    </span>
                  </h1>
                  <p className="text-gray-600 text-sm mt-3 tracking-wide max-w-xl leading-relaxed">
                    Catatan transaksi on-chain yang diproses otonom oleh smart contract Soroban di jaringan Stellar.
                  </p>
                </div>

                {/* Table/list of transactions */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-6 sm:p-8">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                          <th className="pb-5">TX ID</th>
                          <th className="pb-5">TIPE TRANSAKSI</th>
                          <th className="pb-5">JUMLAH NOMINAL</th>
                          <th className="pb-5">STATUS</th>
                          <th className="pb-5">STELLAR HASH</th>
                          <th className="pb-5 text-right">WAKTU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {MOCK_TRANSACTIONS.map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-5 font-mono font-bold text-gray-900 text-sm">{tx.id}</td>
                            <td className="py-5 text-gray-800 font-semibold text-sm">{tx.type}</td>
                            <td className="py-5 font-mono font-bold text-gray-900 text-sm">{tx.amount}</td>
                            <td className="py-5">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-mono tracking-widest font-bold uppercase border ${getStatusStyles(tx.status)}`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="py-5 font-mono text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-xs">{tx.hash}</span>
                                <a href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`} className="text-emerald-700 hover:text-emerald-950 transition-colors inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100" title="View in Stellar Explorer">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            </td>
                            <td className="py-5 text-gray-500 font-mono text-right text-xs">{tx.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
