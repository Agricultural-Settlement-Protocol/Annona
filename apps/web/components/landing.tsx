"use client";

import { formatRupiah, rupiah } from "@annona/core";
import { LogoMark, WheatMark } from "@annona/ui";
import { Github, Send, Twitter } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { CountUp } from "./count-up.js";
import { CustomCursor } from "./cursor.js";
import { SettlementChart } from "./settlement-chart.js";
import { IMG } from "./urbangreen/images";
import {
  BarChartIcon,
  DiagonalArrowIcon,
  GlobeIcon,
  SparkleIcon,
} from "./urbangreen/icons";

export function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <CustomCursor />
      <div className="urbangreen-body min-h-screen flex flex-col relative">
        <Header />
        <main className="flex-grow flex flex-col">
          <Hero />
          <ScrollingMarquee />
          <Problem />
          <HowItWorks />
          <Impact />
          <Features />
          <Roadmap />
          <CtaBand />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}

/* Header */
function Header() {
  const HomeIcon = () => (
    <svg
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
      aria-hidden="true"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
  const ServiceIcon = () => (
    <svg
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
      aria-hidden="true"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
  const TechIcon = () => (
    <svg
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
      aria-hidden="true"
    >
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );

  return (
    <motion.header
      initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full px-8 py-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md border-b border-gray-200/55"
      style={{ backgroundColor: "rgba(252,249,248,0.9)" }}
    >
      <div className="flex items-center gap-3">
        <LogoMark size={28} gradient />
        <span className="text-xl font-medium tracking-tight text-primary-dark font-sans">
          Annona Protocol
        </span>
      </div>
      <nav className="hidden md:flex items-center gap-2">
        <a
          className="pill-nav active flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-gray-900"
          href="#"
        >
          Home <HomeIcon />
        </a>
        <a
          className="pill-nav flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200/50"
          href="#cara"
        >
          Cara Kerja <ServiceIcon />
        </a>
        <a
          className="pill-nav flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200/50"
          href="#angka"
        >
          Dampak &amp; Skala <TechIcon />
        </a>
      </nav>
      <div className="flex items-center gap-3">
        <Link href="/design">
          <button
            type="button"
            className="hidden sm:inline-block px-5 py-2.5 rounded-full text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Design
          </button>
        </Link>
        <button
          type="button"
          className="bg-primary-dark text-white px-6 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-colors"
        >
          Coba untuk Koperasi
        </button>
      </div>
    </motion.header>
  );
}

/* Hero */
function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
      className="flex-grow flex flex-col md:flex-row px-4 md:px-8 pt-8 pb-12 gap-8 relative max-w-[1440px] w-full mx-auto md:min-h-[700px]"
    >
      {/* Left Sidebar */}
      <aside className="w-full md:w-64 flex flex-col gap-12 md:gap-0 md:justify-between flex-shrink-0">
        {/* Brand Info */}
        <div className="flex flex-col gap-3 pl-4">
          <div className="flex items-center gap-2">
            <LogoMark size={40} gradient />
          </div>
          <span className="text-sm font-medium text-gray-700">
            Annona Protocol
          </span>
        </div>
        {/* Team Card (Koperasi Mitra) */}
        <div
          className="bg-soft-green overflow-hidden relative flex flex-col gap-6 p-8"
          style={{ borderRadius: "3rem", borderBottomLeftRadius: "4rem" }}
        >
          <div className="flex -space-x-3">
            <Image
              alt="Coop member 1"
              className="w-12 h-12 rounded-full object-cover"
              style={{
                borderWidth: 2,
                borderColor: "#d8ead0",
                borderStyle: "solid",
              }}
              src={IMG.team1}
              width={48}
              height={48}
            />
            <Image
              alt="Coop member 2"
              className="w-12 h-12 rounded-full object-cover relative z-10"
              style={{
                borderWidth: 2,
                borderColor: "#d8ead0",
                borderStyle: "solid",
              }}
              src={IMG.team2}
              width={48}
              height={48}
            />
            <Image
              alt="Coop member 3"
              className="w-12 h-12 rounded-full object-cover relative z-20"
              style={{
                borderWidth: 2,
                borderColor: "#d8ead0",
                borderStyle: "solid",
              }}
              src={IMG.team3}
              width={48}
              height={48}
            />
          </div>
          <span className="text-lg font-medium text-gray-900 leading-tight">
            83.376+ Koperasi Mitra Desa
          </span>
          <div className="absolute bottom-6 right-6 flex gap-1">
            <div
              className="w-8 h-8 rounded-full bg-white opacity-80"
              style={{ borderTopLeftRadius: 0 }}
            />
            <div className="w-4 h-4 rounded-full bg-white opacity-80 mt-auto" />
          </div>
        </div>
        {/* Bottom Left Tagline */}
        <div className="mt-auto pl-4 pb-4 md:mt-0">
          <SparkleIcon />
          <p className="text-xl font-medium leading-tight text-gray-900 max-w-[180px]">
            Membangun Kepercayaan di Tiap Panen
          </p>
        </div>
      </aside>

      {/* Center/Right Content */}
      <section className="flex-grow flex flex-col pt-4 md:pt-12 md:justify-between">
        {/* Hero Headline */}
        <div className="max-w-4xl mx-auto md:ml-0 mb-16 px-4 md:px-12 text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-gray-900 leading-tight">
            Pupuk sekarang, bayarnya pas panen.{" "}
            <span className="inline-block relative">
              <span className="relative z-10 px-8 py-2">Tercatat Rapi</span>
              <span
                className="absolute inset-0 rounded-full -z-0"
                style={{ backgroundColor: "#e2f1e1" }}
              />
            </span>
          </h1>
          <p className="mt-6 text-gray-700 text-lg leading-relaxed max-w-xl">
            Koperasi memberi benih dan pupuk lebih dulu. Saat panen dibeli,
            utang petani otomatis terpotong dan sisanya langsung jadi haknya.
            Annona mencatat semuanya dalam satu buku yang tidak bisa diubah
            siapa pun.
          </p>
        </div>

        {/* Live Settlement Card Visualized inside cover image */}
        <div
          className="w-full video-card shadow-lg mb-10 p-6 md:p-12 flex flex-col md:flex-row gap-8 items-center justify-center relative overflow-hidden"
          style={{
            backgroundImage: `url(${IMG.heroVideo})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center center",
            backgroundSize: "cover",
            minHeight: "450px",
          }}
        >
          {/* Overlay Tags */}
          <div className="absolute top-6 left-6 flex flex-wrap gap-2 z-20">
            <span className="tag-glass px-4 py-2 rounded-full text-xs font-medium tracking-wide">
              Stellar Testnet
            </span>
            <span className="tag-glass px-4 py-2 rounded-full text-xs font-medium tracking-wide">
              Harga HPP Bapanas
            </span>
            <span className="tag-glass px-4 py-2 rounded-full text-xs font-medium tracking-wide">
              Anti-Manipulasi
            </span>
          </div>
          {/* Top Right Globe Icon */}
          <div
            className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full flex items-center justify-center text-white backdrop-blur-sm"
            style={{ border: "1px solid rgba(255,255,255,0.4)" }}
          >
            <GlobeIcon />
          </div>

          {/* Floating Settlement Card */}
          <motion.div
            className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-md text-gray-900"
            animate={{
              y: [0, -12, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                <LogoMark size={20} gradient /> Perjanjian #1024
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Terbayar (Settled)
              </span>
            </div>
            <div className="mt-5 space-y-2.5 text-sm text-gray-800">
              <div className="flex justify-between">
                <span className="text-gray-500">Setoran panen</span>
                <span className="font-medium text-gray-900">
                  2.600 kg gabah
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Harga HPP</span>
                <span className="font-medium text-gray-900">
                  {formatRupiah(rupiah(6500))} / kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nilai panen</span>
                <span className="font-medium text-gray-900">
                  {formatRupiah(rupiah(16900000))}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Biaya koperasi (5%)</span>
                <span className="font-medium">
                  - {formatRupiah(rupiah(845000))}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Potong utang saprotan</span>
                <span className="font-medium">
                  - {formatRupiah(rupiah(2200000))}
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
              <span className="text-sm font-semibold text-gray-900">
                Diterima petani
              </span>
              <span className="text-xl font-bold tabular-nums text-emerald-800">
                {formatRupiah(rupiah(13855000))}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-gray-400">Tercatat di Stellar</span>
              <a
                href="https://stellar.org"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-emerald-700 hover:underline inline-flex items-center gap-1"
              >
                a1b2c3d4... <DiagonalArrowIcon />
              </a>
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 px-4 pr-12 pb-8">
          <a
            className="px-6 py-3 rounded-full border border-gray-300 text-gray-800 font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
            href="#cara"
          >
            Lihat cara kerjanya <DiagonalArrowIcon />
          </a>
          <button
            type="button"
            className="px-6 py-3 rounded-full bg-primary-dark text-white font-medium hover:opacity-90 transition-colors"
          >
            Coba untuk Koperasi
          </button>
        </div>
      </section>
    </motion.section>
  );
}

/* Trust Marquee */
function ScrollingMarquee() {
  const items = [
    "Stellar / Soroban Ledger",
    "Freighter Wallet Integration",
    "Harga HPP Bapanas",
    "Open Source Protocol",
    "Auto-Netting Settlement",
    "dIDR Stablecoin Settlement",
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full mt-auto mb-16"
    >
      <div
        className="marquee-container group cursor-default"
        style={{ backgroundColor: "#fcf9f8" }}
      >
        <div className="marquee-content group-hover:[animation-play-state:paused] text-4xl md:text-5xl font-medium text-gray-900">
          {items.map((item, idx) => (
            <div key={`${item}-${idx}`} className="inline-flex items-center">
              <span className="mx-8">{item}</span>
              <Image
                alt="Leaf separator"
                className="rounded-2xl object-cover mx-4 opacity-80"
                src={idx % 2 === 0 ? IMG.marqueeLeaf1 : IMG.marqueeLeaf2}
                width={48}
                height={48}
              />
            </div>
          ))}
          {/* Repeat once for infinite scrolling loop */}
          {items.map((item, idx) => (
            <div
              key={`${item}-dup-${idx}`}
              className="inline-flex items-center"
            >
              <span className="mx-8">{item}</span>
              <Image
                alt="Leaf separator"
                className="rounded-2xl object-cover mx-4 opacity-80"
                src={idx % 2 === 0 ? IMG.marqueeLeaf2 : IMG.marqueeLeaf3}
                width={48}
                height={48}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/*Problem */
function Problem() {
  return (
    <motion.section
      id="cara"
      initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full bg-white py-24 border-t border-gray-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 mb-12">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
            Kendala Lapangan
          </h2>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-emerald-800"
            style={{ backgroundColor: "#E2F1E1" }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontFamily: "'Material Symbols Outlined'" }}
            >
              warning
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Large Visual Card */}
          <div className="lg:col-span-7 relative">
            <div
              className="relative overflow-hidden bg-gray-100 w-full"
              style={{
                borderRadius: "2rem",
                borderBottomLeftRadius: "6rem",
                aspectRatio: "4/3",
              }}
            >
              <Image
                alt="Indonesian paddy field crop"
                className="object-cover"
                src={IMG.verticalForest}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
              />
              <div
                className="absolute bottom-6 left-8 rounded-2xl p-4 shadow-sm z-10"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.4)",
                }}
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Fokus Utama
                </p>
                <p className="text-sm font-medium text-gray-900">
                  Pembukuan Koperasi Desa Merah Putih
                </p>
              </div>
            </div>
            <div
              className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full flex items-center justify-center overflow-hidden z-0"
              style={{ backgroundColor: "#d8ead0" }}
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center -mr-4 -mb-4" />
            </div>
          </div>

          {/* Right Side: Bento Grid */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Bento Card 1: Catatan Tercecer */}
            <div
              className="bg-white border border-gray-200 p-8 md:p-10 flex flex-col justify-between shadow-sm relative"
              style={{ borderRadius: "2rem" }}
            >
              <div>
                <h3 className="text-3xl font-medium text-gray-900 mb-4 leading-tight">
                  Catatan Tercecer
                </h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-bold text-primary-dark">
                    3+
                  </span>
                  <span className="text-xl text-gray-500">Sumber Data</span>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  Utang pupuk di buku, hasil panen di Excel, kesepakatan di chat
                  WA. Tidak ada satu sumber data yang dipercaya bersama.
                </p>
              </div>
            </div>
            {/* Bento Card 2: Gampang Bocor */}
            <div
              className="p-8 md:p-10 flex flex-col justify-between relative overflow-hidden"
              style={{ backgroundColor: "#E2F1E1", borderRadius: "2rem" }}
            >
              <div className="relative z-10">
                <h3 className="text-4xl md:text-5xl font-medium text-gray-900 mb-2 leading-tight">
                  Rawan Selisih
                </h3>
                <p className="text-xl font-medium text-gray-800 mb-2">
                  Risiko Kebocoran Data
                </p>
                <p className="text-gray-700 text-base leading-relaxed">
                  Selisih antara timbangan panen dan utang saprotan mudah
                  terjadi di lapangan. Susah dibuktikan dan memicu sengketa.
                </p>
              </div>
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-2xl"
                style={{ backgroundColor: "rgba(255,255,255,0.4)" }}
              />
            </div>
            {/* Bento Card 3: Quote Card */}
            <div
              className="bg-primary-dark text-white p-8 flex flex-col justify-center"
              style={{ borderRadius: "2rem" }}
            >
              <p className="text-lg font-medium italic leading-relaxed mb-4">
                &ldquo;Tanpa bukti transaksi yang jelas dan tepercaya, lembaga
                keuangan ragu untuk menyalurkan permodalan ke koperasi.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                />
                <span className="text-sm font-semibold">
                  Tantangan Permodalan
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* Step Illustrations */
function Step1Illustration() {
  return (
    <svg
      width="180"
      height="120"
      viewBox="0 0 180 120"
      fill="none"
      className="overflow-visible"
    >
      {/* Grid background */}
      <motion.path
        d="M20 20 h140 M20 50 h140 M20 80 h140 M40 10 v100 M90 10 v100 M140 10 v100"
        stroke="#E6EBE0"
        strokeWidth="1"
        strokeDasharray="3 3"
        animate={{ strokeDashoffset: [0, -20] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      {/* Floating ID Card */}
      <motion.g
        animate={{ y: [0, -5, 0], rotate: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{
          y: -10,
          rotate: -5,
          scale: 1.1,
          transition: { type: "spring", stiffness: 300 },
        }}
      >
        {/* Card base */}
        <rect
          x="45"
          y="25"
          width="90"
          height="60"
          rx="8"
          fill="white"
          stroke="#c3f2f6"
          strokeWidth="2"
          className="shadow-sm"
        />
        {/* Profile picture slot */}
        <rect x="55" y="37" width="22" height="22" rx="4" fill="#E2F1E1" />
        <circle cx="66" cy="45" r="5" fill="#10b3c4" />
        <path d="M58 59 c0 -4 4 -6 8 -6 s8 2 8 6" fill="#10b3c4" />

        {/* Text lines */}
        <motion.rect
          x="85"
          y="40"
          width="40"
          height="4"
          rx="2"
          fill="#bcc4b3"
          animate={{ width: [40, 30, 40] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.rect
          x="85"
          y="48"
          width="30"
          height="4"
          rx="2"
          fill="#dde3d6"
          animate={{ width: [30, 45, 30] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        <rect x="85" y="56" width="20" height="4" rx="2" fill="#dde3d6" />
      </motion.g>

      {/* Floating badge checkmark */}
      <motion.circle
        cx="130"
        cy="35"
        r="12"
        fill="#14b866"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{
          scale: 1.25,
          rotate: 360,
          transition: { type: "spring" },
        }}
      />
      <motion.path
        d="M125 35 l3 3 l6 -6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ y: [0, -4, 0], pathLength: [0, 1, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

function Step2Illustration() {
  return (
    <svg
      width="180"
      height="120"
      viewBox="0 0 180 120"
      fill="none"
      className="overflow-visible"
    >
      {/* Sprout and bag */}
      <motion.g
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{
          scale: 1.1,
          rotate: [-4, 4, -4],
          transition: { duration: 0.5, repeat: Infinity },
        }}
      >
        {/* Fertilizer box / bag */}
        <rect
          x="35"
          y="35"
          width="45"
          height="55"
          rx="6"
          fill="white"
          stroke="#0c7a48"
          strokeWidth="2"
        />
        {/* Sprout motif on bag */}
        <path d="M57 70 c0 -8 8 -8 8 -8 s0 8 -8 8" fill="#14b866" />
        <path d="M57 70 c0 -8 -8 -8 -8 -8 s0 8 8 8" fill="#14b866" />
        <line
          x1="57"
          y1="62"
          x2="57"
          y2="76"
          stroke="#0c7a48"
          strokeWidth="2"
        />
        {/* Label line */}
        <motion.rect
          x="45"
          y="45"
          width="25"
          height="5"
          rx="2"
          fill="#a8f0c2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.g>

      {/* Lock */}
      <motion.g
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.05 }}
      >
        {/* Lock shackle */}
        <motion.path
          d="M103 45 v-10 c0 -8 6 -14 14 -14 s14 6 14 14 v10"
          stroke="#0c6a78"
          strokeWidth="3.5"
          strokeLinecap="round"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ y: 2 }}
        />
        {/* Lock body */}
        <rect
          x="92"
          y="43"
          width="50"
          height="40"
          rx="8"
          fill="#c3f2f6"
          stroke="#0c6a78"
          strokeWidth="2"
        />
        {/* Keyhole */}
        <circle cx="117" cy="58" r="4" fill="#0d555f" />
        <path d="M117 62 l2 10 h-4 z" fill="#0d555f" />

        {/* Glow effect inside keyhole */}
        <motion.circle
          cx="117"
          cy="58"
          r="2"
          fill="#fff"
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.g>
    </svg>
  );
}

function Step3Illustration() {
  return (
    <svg
      width="180"
      height="120"
      viewBox="0 0 180 120"
      fill="none"
      className="overflow-visible"
    >
      {/* Stand for scales */}
      <path d="M90 90 v-35" stroke="#dde3d6" strokeWidth="4" />
      <path
        d="M75 90 h30"
        stroke="#dde3d6"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Pivot point */}
      <circle cx="90" cy="55" r="3" fill="#939e8a" />

      {/* Swaying beam and pans */}
      <motion.g
        animate={{ rotate: [-4, 4, -4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{
          rotate: [-10, 10, -10],
          transition: { duration: 1, repeat: Infinity },
        }}
        style={{ originX: "90px", originY: "55px" }}
      >
        {/* Beam */}
        <line
          x1="40"
          y1="55"
          x2="140"
          y2="55"
          stroke="#939e8a"
          strokeWidth="3"
        />

        {/* Left pan strings and pan */}
        <path
          d="M40 55 L30 75 h20 Z"
          stroke="#939e8a"
          strokeWidth="1"
          fill="none"
        />
        <line
          x1="30"
          y1="75"
          x2="50"
          y2="75"
          stroke="#939e8a"
          strokeWidth="2.5"
        />

        {/* Rice Sack in left pan */}
        <g transform="translate(10, 32)">
          <path
            d="M30 30 c-3 0 -6 3 -6 6 v12 c0 3 3 3 6 3 h10 c3 0 6 0 6 -3 v-12 c0 -3 -3 -6 -6 -6 z"
            fill="#fff"
            stroke="#0c7a48"
            strokeWidth="1.5"
          />
          <ellipse
            cx="35"
            cy="32"
            rx="4"
            ry="1.5"
            fill="#dde3d6"
            stroke="#0c7a48"
            strokeWidth="1"
          />
        </g>

        {/* Right pan strings and pan */}
        <path
          d="M140 55 L130 75 h20 Z"
          stroke="#939e8a"
          strokeWidth="1"
          fill="none"
        />
        <line
          x1="130"
          y1="75"
          x2="150"
          y2="75"
          stroke="#939e8a"
          strokeWidth="2.5"
        />

        {/* Weight in right pan */}
        <g transform="translate(118, 55)">
          <path d="M10 20 h10 l-2 -10 h-6 z" fill="#0c7a48" />
          <circle cx="15" cy="8" r="2" fill="#0c7a48" />
        </g>
      </motion.g>

      {/* Floating Ledger Sheet */}
      <motion.g
        animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{
          y: -15,
          scale: 1.1,
          rotate: -2,
          transition: { type: "spring" },
        }}
      >
        <rect
          x="115"
          y="10"
          width="40"
          height="50"
          rx="4"
          fill="white"
          stroke="#10b3c4"
          strokeWidth="2"
          className="shadow-sm"
        />
        <motion.line
          x1="123"
          y1="22"
          x2="147"
          y2="22"
          stroke="#8fe6ec"
          strokeWidth="2"
          animate={{ x2: [123, 147] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.line
          x1="123"
          y1="30"
          x2="143"
          y2="30"
          stroke="#dde3d6"
          strokeWidth="1.5"
          animate={{ x2: [123, 143] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
        />
        <motion.line
          x1="123"
          y1="38"
          x2="138"
          y2="38"
          stroke="#dde3d6"
          strokeWidth="1.5"
          animate={{ x2: [123, 138] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
        />

        {/* Checkmark when weighed */}
        <motion.circle
          cx="142"
          cy="42"
          r="4.5"
          fill="#14b866"
          animate={{ scale: [0, 1, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.path
          d="M140 42 l1 1 l2 -2"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </motion.g>
    </svg>
  );
}

function Step4Illustration({ isDark }: { isDark?: boolean }) {
  return (
    <svg
      width="180"
      height="120"
      viewBox="0 0 180 120"
      fill="none"
      className="overflow-visible"
    >
      {/* Central Node */}
      <motion.g
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle
          cx="90"
          cy="40"
          r="16"
          fill={isDark ? "#14b866" : "#E2F1E1"}
          stroke={isDark ? "#2fd07e" : "#0c7a48"}
          strokeWidth="2.5"
        />
        <text
          x="90"
          y="45"
          textAnchor="middle"
          fill={isDark ? "#fff" : "#0c7a48"}
          fontSize="13"
          fontWeight="bold"
        >
          Rp
        </text>
        <motion.circle
          cx="90"
          cy="40"
          r="22"
          stroke={isDark ? "#2fd07e" : "#0c7a48"}
          strokeWidth="1"
          strokeDasharray="4 4"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ originX: "90px", originY: "40px" }}
        />
      </motion.g>

      {/* Left Node: Farmer */}
      <motion.g
        whileHover={{ scale: 1.1 }}
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect
          x="20"
          y="65"
          width="50"
          height="35"
          rx="6"
          fill={isDark ? "rgba(255,255,255,0.06)" : "#fff"}
          stroke={isDark ? "#2bcad9" : "#0c6a78"}
          strokeWidth="2"
        />
        <circle cx="45" cy="82" r="7" fill={isDark ? "#2bcad9" : "#8fe6ec"} />
        <text
          x="45"
          y="86"
          textAnchor="middle"
          fill={isDark ? "#0f1410" : "#0c6a78"}
          fontSize="11"
          fontWeight="bold"
        >
          ✓
        </text>
      </motion.g>

      {/* Right Node: Payback */}
      <motion.g
        whileHover={{ scale: 1.1 }}
        animate={{ y: [0, -2, 0] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      >
        <rect
          x="110"
          y="65"
          width="50"
          height="35"
          rx="6"
          fill={isDark ? "rgba(255,255,255,0.06)" : "#fff"}
          stroke={isDark ? "#f59e0b" : "#e08600"}
          strokeWidth="2"
        />
        <line
          x1="128"
          y1="82"
          x2="142"
          y2="82"
          stroke={isDark ? "#f59e0b" : "#e08600"}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <motion.line
          x1="128"
          y1="82"
          x2="142"
          y2="82"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.g>

      {/* Connecting paths */}
      <path
        d="M80 50 L50 63"
        stroke={isDark ? "#2bcad9" : "#0c6a78"}
        strokeWidth="2.5"
        strokeDasharray="4 4"
      />
      <motion.path
        d="M80 50 L50 63"
        stroke={isDark ? "#fff" : "#10b3c4"}
        strokeWidth="2.5"
        strokeDasharray="4 4"
        animate={{ strokeDashoffset: [0, -16] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <path
        d="M100 50 L130 63"
        stroke={isDark ? "#f59e0b" : "#e08600"}
        strokeWidth="2.5"
        strokeDasharray="4 4"
      />
      <motion.path
        d="M100 50 L130 63"
        stroke={isDark ? "#fff" : "#f59e0b"}
        strokeWidth="2.5"
        strokeDasharray="4 4"
        animate={{ strokeDashoffset: [0, 16] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />

      {/* Moving Coins */}
      <motion.circle
        cx="90"
        cy="40"
        r="4"
        fill={isDark ? "#2bcad9" : "#0c6a78"}
        animate={{
          cx: [90, 45],
          cy: [40, 82],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />
      <motion.circle
        cx="90"
        cy="40"
        r="4"
        fill="#f59e0b"
        animate={{
          cx: [90, 135],
          cy: [40, 82],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeOut",
          delay: 0.75,
        }}
      />
    </svg>
  );
}

/* ─────────────────────── How It Works ─────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "I",
      title: "Daftar Petani",
      body: "Koperasi mendaftarkan petani, luas lahan, dan komoditas. Data pribadi tetap aman, tidak ikut ke catatan publik.",
    },
    {
      n: "II",
      title: "Kunci Kredit Saprotan",
      body: "Pupuk dan benih diberikan di awal. Nilai utang dan harga beli HPP langsung dikunci dalam perjanjian.",
    },
    {
      n: "III",
      title: "Catat Hasil Panen",
      body: "Saat panen masuk, beratnya dan mutunya dicatat. Bukti panen langsung terbit di Stellar dan tidak bisa diubah.",
    },
    {
      n: "IV",
      title: "Potong Utang Otomatis",
      body: "Nilai panen dihitung, utang terpotong otomatis, sisanya jadi hak petani. Semua pihak lihat angka yang sama.",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full py-24 border-t border-gray-200"
      style={{ backgroundColor: "#fcf9f8" }}
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-12 lg:px-16">
        <div className="flex items-center gap-6 mb-12">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
            Cara Kerja Protokol
          </h2>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-emerald-800"
            style={{ backgroundColor: "#E2F1E1" }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontFamily: "'Material Symbols Outlined'" }}
            >
              settings_suggest
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 md:pt-4 md:pb-12">
          {steps.map((s, idx) => {
            const isDark = idx === 3;
            const isGreen = idx === 1;

            // Offset alignment for staggered wave effect
            const transformClass = idx % 2 === 0 ? "" : "md:translate-y-12";

            // Varying background and text
            let cardBgClass = "bg-white border border-gray-200 text-gray-900";
            let badgeClass = "bg-gray-100 text-gray-500";
            let bodyTextClass = "text-gray-700";
            let numColorClass = "text-verdant-950/[0.04]";
            const cardStyle: React.CSSProperties = {
              borderRadius: "3rem",
            };

            if (isGreen) {
              cardBgClass = "bg-[#E2F1E1] text-gray-900";
              badgeClass = "bg-white text-emerald-800";
              bodyTextClass = "text-gray-800";
              numColorClass = "text-emerald-950/[0.04]";
            } else if (isDark) {
              cardBgClass = "bg-primary-dark text-white";
              badgeClass = "bg-white/20 text-emerald-200";
              bodyTextClass = "text-emerald-100/90";
              numColorClass = "text-white/[0.05]";
            }

            // Asymmetric border-radius
            if (idx === 0) cardStyle.borderRadius = "3rem 1rem 3rem 3rem";
            else if (idx === 1) cardStyle.borderRadius = "1rem 3rem 3rem 3rem";
            else if (idx === 2) cardStyle.borderRadius = "3rem 3rem 1rem 3rem";
            else if (idx === 3) cardStyle.borderRadius = "3rem 3rem 3rem 1rem";

            return (
              <motion.div
                key={s.n}
                className={`${cardBgClass} p-10 md:p-12 shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${transformClass}`}
                style={cardStyle}
                initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover="hover"
                variants={{
                  hover: { y: -8, scale: 1.02 },
                }}
                transition={{ type: "spring", stiffness: 180, damping: 20 }}
              >
                {/* Decorative Hover Circles */}
                {!isDark && !isGreen && (
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundColor: "#fcf9f8" }}
                  />
                )}
                {isGreen && (
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundColor: "rgba(255,255,255,0.4)" }}
                  />
                )}
                {isDark && (
                  <div
                    className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                  />
                )}

                {/* Roman Numeral Watermark */}
                <span
                  className={`font-display text-[8rem] font-bold absolute bottom-0 right-4 pointer-events-none select-none z-0 transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-105 ${numColorClass}`}
                >
                  {s.n}
                </span>

                <div className="relative z-10 flex flex-col h-full">
                  <div>
                    <span
                      className={`inline-block px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-8 ${badgeClass}`}
                    >
                      Langkah {s.n}
                    </span>
                    <h3
                      className={`text-3xl font-medium mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {s.title}
                    </h3>
                    <p
                      className={`${bodyTextClass} text-lg leading-relaxed mb-6`}
                    >
                      {s.body}
                    </p>
                  </div>
                  <div className="mt-auto pt-6 flex justify-center w-full">
                    {idx === 0 && <Step1Illustration />}
                    {idx === 1 && <Step2Illustration />}
                    {idx === 2 && <Step3Illustration />}
                    {idx === 3 && <Step4Illustration isDark={isDark} />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

function Impact() {
  return (
    <motion.section
      id="angka"
      initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full bg-white py-24 border-t border-gray-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 mb-12">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
            Dampak &amp; Skala Nyata
          </h2>
          <motion.div
            animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-emerald-800"
            style={{ backgroundColor: "#E2F1E1" }}
          >
            <BarChartIcon />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Stats Bento Grid */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Metric 1 */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-white border border-gray-200 p-10 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md cursor-default transition-shadow"
              style={{ borderRadius: "3rem" }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 pointer-events-none"
                style={{ backgroundColor: "#fcf9f8" }}
              />
              <div className="relative z-10">
                <h3 className="text-2xl font-medium text-gray-900 mb-2 leading-tight">
                  Koperasi Mitra
                </h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-primary-dark">
                    <CountUp to={83376} />
                  </span>
                </div>
                <p className="text-gray-600 text-sm">
                  Koperasi Desa Merah Putih terdaftar dalam ekosistem pendanaan
                  saprotan.
                </p>
              </div>
            </motion.div>

            {/* Metric 2 */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="p-10 flex flex-col justify-between relative overflow-hidden group hover:shadow-md cursor-default transition-shadow"
              style={{ backgroundColor: "#E2F1E1", borderRadius: "3rem" }}
            >
              <motion.div
                animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 right-0 w-48 h-48 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"
                style={{ backgroundColor: "rgba(255,255,255,0.4)" }}
              />
              <div className="relative z-10">
                <h3 className="text-2xl font-medium text-gray-900 mb-1 leading-tight">
                  Harga HPP Acuan
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-emerald-900">
                    <CountUp to={6500} prefix="Rp" />
                  </span>
                  <span className="text-gray-700 text-sm">/ kg</span>
                </div>
                <p className="text-gray-700 text-sm">
                  Mengikuti patokan Harga Pembelian Pemerintah (Bapanas) untuk
                  transparansi mutlak.
                </p>
              </div>
            </motion.div>

            {/* Metric 3 */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-white border border-gray-200 p-10 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md cursor-default transition-shadow"
              style={{ borderRadius: "3rem" }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 pointer-events-none"
                style={{ backgroundColor: "#fcf9f8" }}
              />
              <div className="relative z-10">
                <h3 className="text-2xl font-medium text-gray-900 mb-2 leading-tight">
                  Mitigasi Gagal Bayar
                </h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-primary-dark">
                    <CountUp
                      to={85.96}
                      format={(n) => n.toFixed(2)}
                      prefix="Rp"
                      suffix=" T"
                    />
                  </span>
                </div>
                <p className="text-gray-600 text-sm">
                  Estimasi risiko gagal bayar kredit input nasional yang
                  termitigasi oleh auto-netting.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Side: Settlement Chart */}
          <div className="lg:col-span-7 relative">
            <div
              className="relative overflow-hidden bg-white border border-gray-200 w-full p-10 hover:shadow-md group transition-shadow"
              style={{ borderRadius: "3rem", borderTopLeftRadius: "6rem" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Visualisasi Jaringan
                  </p>
                  <h3 className="text-2xl font-medium text-gray-900">
                    Nilai Panen Tercatat:{" "}
                    <span className="text-emerald-800 font-bold">Rp1,2 M</span>
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 self-start sm:self-auto">
                  Tercatat &lt; 5 dtk
                </span>
              </div>
              <div className="w-full mt-4 h-64 md:h-80 relative">
                <SettlementChart />
              </div>
              {/* Overlay Label */}
              <motion.div
                whileHover={{ y: -5 }}
                className="absolute bottom-6 right-6 rounded-2xl p-4 shadow-sm flex items-center gap-4 z-10 bg-white/90 border border-gray-200 backdrop-blur-md cursor-default"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-emerald-800 relative"
                  style={{ backgroundColor: "#E2F1E1" }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="absolute inset-0 rounded-full bg-emerald-300 pointer-events-none"
                  />
                  <span
                    className="material-symbols-outlined relative z-10"
                    style={{ fontFamily: "'Material Symbols Outlined'" }}
                  >
                    hub
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    Jaringan Stellar
                    <motion.span
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="w-2 h-2 rounded-full bg-emerald-500 inline-block"
                    />
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    Soroban Contract Active
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* Features */
function Features() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full py-24 border-t border-gray-200"
      style={{ backgroundColor: "#fcf9f8" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 mb-12">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
            Kenapa Annona?
          </h2>
          <motion.div
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-emerald-800"
            style={{ backgroundColor: "#E2F1E1" }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontFamily: "'Material Symbols Outlined'" }}
            >
              security
            </span>
          </motion.div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Large feature card */}
          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden transition-shadow hover:shadow-md cursor-default"
            style={{ backgroundColor: "#E2F1E1", borderRadius: "2rem" }}
          >
            <div className="relative z-10">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold text-emerald-800 bg-white/60 mb-6 uppercase tracking-wider">
                Fitur Utama
              </span>
              <h3 className="text-3xl md:text-4xl font-medium text-gray-900 mb-6 leading-tight">
                Potong Utang Otomatis (Auto-Netting)
              </h3>
              <p className="text-gray-800 text-lg md:text-xl leading-relaxed max-w-xl">
                Begitu koperasi membeli hasil panen, utang pupuk/saprotan petani
                langsung dikurangi di dalam smart contract. Sisa bersih
                diserahkan otomatis, menghilangkan selisih pembukuan.
              </p>
            </div>
            <div className="mt-12 flex flex-wrap gap-3 relative z-10">
              <motion.span
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="px-5 py-2 rounded-full text-sm font-medium bg-white/40 backdrop-blur-sm"
              >
                On-Chain Settlement
              </motion.span>
              <motion.span
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
                className="px-5 py-2 rounded-full text-sm font-medium bg-white/40 backdrop-blur-sm"
              >
                Zero-Leakage Guarantee
              </motion.span>
            </div>
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.1, 1] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full blur-3xl pointer-events-none"
              style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
            />
          </motion.div>

          {/* Right: Two smaller cards */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <motion.div
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-white border border-gray-200 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden hover:shadow-md transition-shadow cursor-default group"
              style={{ borderRadius: "2rem" }}
            >
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{ backgroundColor: "#fcf9f8" }}
              />
              <div className="relative z-10">
                <h3 className="text-2xl font-medium text-gray-900 mb-4">
                  Bukti Panen Abadi
                </h3>
                <p className="text-gray-700 leading-relaxed text-sm">
                  Setiap setoran panen tercatat permanen di blockchain Stellar.
                  Menjadi dokumen digital berharga bagi petani untuk membuktikan
                  kapasitas produksinya.
                </p>
              </div>
              <div className="mt-6 relative z-10">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                  Stellar SEP-41 Metadata
                </span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-white border border-gray-200 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden hover:shadow-md transition-shadow cursor-default group"
              style={{ borderRadius: "2rem" }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{ backgroundColor: "#fcf9f8" }}
              />
              <div className="relative z-10">
                <h3 className="text-2xl font-medium text-gray-900 mb-4">
                  Reputasi yang Membuka Modal
                </h3>
                <p className="text-gray-700 leading-relaxed text-sm">
                  Semakin rajin melunasi utang saprotan via panen, skor reputasi
                  petani meningkat. Memudahkan mereka meminjam dana darurat atau
                  modal tambahan di masa depan.
                </p>
              </div>
              <div className="mt-6 relative z-10">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                  Credit Scoring Terbuka
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* Roadmap */
function Roadmap() {
  const layers = [
    {
      level: "L1",
      name: "Settlement",
      note: "Catatan panen & netting otomatis di Stellar Soroban",
      active: true,
      style: "green" as const,
    },
    {
      level: "L2",
      name: "Reputasi",
      note: "Identitas tepercaya & credit scoring terdesentralisasi bagi petani",
      active: false,
      style: "white" as const,
    },
    {
      level: "L3",
      name: "Receivable",
      note: "Piutang panen diakui sebagai kolateral aset digital cair",
      active: false,
      style: "white" as const,
    },
    {
      level: "L4",
      name: "Likuiditas",
      note: "Akses permodalan saprotan yang lebih cepat via pools",
      active: false,
      style: "white" as const,
    },
    {
      level: "L5",
      name: "RWA Integration",
      note: "Penyaluran modal investor institusi global ke desa",
      active: false,
      style: "white" as const,
    },
  ];

  return (
    <motion.section
      id="alur"
      initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full bg-white py-24 border-t border-gray-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Decorative Background */}
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl -z-0 pointer-events-none"
          style={{ backgroundColor: "rgba(226,241,225,0.4)" }}
        />
        <div
          className="absolute top-1/2 right-0 w-64 h-64 rounded-full blur-2xl -z-0 pointer-events-none"
          style={{ backgroundColor: "rgba(216,234,208,0.3)" }}
        />

        {/* Ambient looping background elements representing 'flow' */}
        <motion.div
          animate={{ y: [0, -30, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[30%] w-6 h-6 rounded-full bg-emerald-200 blur-sm -z-0 pointer-events-none hidden md:block"
        />
        <motion.div
          animate={{ y: [0, 40, 0], x: [0, 20, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[30%] right-[20%] w-8 h-8 rounded-full bg-emerald-300 blur-md -z-0 pointer-events-none hidden md:block"
        />
        <motion.div
          animate={{ y: [0, -50, 0], x: [0, -30, 0], opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[60%] left-[50%] w-12 h-12 rounded-full bg-emerald-100 blur-lg -z-0 pointer-events-none hidden md:block"
        />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-20">
            <h2 className="text-5xl md:text-7xl font-medium tracking-tight text-gray-900 leading-tight">
              Roadmap{" "}
              <span className="inline-block relative">
                <span className="relative z-10 px-8 py-2">Protokol</span>
                <span
                  className="absolute inset-0 rounded-full -z-0"
                  style={{ backgroundColor: "#e2f1e1" }}
                />
              </span>
            </h2>
            <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center text-emerald-800 shadow-sm mb-2 relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-200 pointer-events-none"
              />
              <span
                className="material-symbols-outlined text-3xl relative z-10"
                style={{ fontFamily: "'Material Symbols Outlined'" }}
              >
                timeline
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 relative">
            {/* Connecting dashed line in background (visible on desktop) */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px border-l-2 border-dashed border-emerald-100 -translate-x-1/2 z-0" />

            {/* Left column */}
            <div className="flex flex-col gap-8 relative z-10">
              <RoadmapCard item={layers[0]!} index={0} />
              <div className="md:mt-6">
                <RoadmapCard item={layers[2]!} index={2} />
              </div>
              <div className="md:mt-6">
                <RoadmapCard item={layers[4]!} index={4} />
              </div>
            </div>
            {/* Right column (offset) */}
            <div className="flex flex-col gap-8 md:pt-24 relative z-10">
              <RoadmapCard item={layers[1]!} index={1} />
              <div className="md:mt-6">
                <RoadmapCard item={layers[3]!} index={3} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function RoadmapCard({
  item,
  index,
}: {
  item: {
    level: string;
    name: string;
    note: string;
    active: boolean;
    style: "green" | "white";
  };
  index: number;
}) {
  const isGreen = item.active;

  const badgeClass = isGreen
    ? "bg-white text-emerald-800 shadow-sm"
    : "bg-gray-100 text-gray-500";

  const cardStyle: React.CSSProperties = {
    borderRadius: "3rem",
    ...(isGreen ? { backgroundColor: "#E2F1E1" } : {}),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`p-10 md:p-12 shadow-sm relative overflow-hidden group ${isGreen ? "border border-emerald-300" : "bg-white border border-gray-200 hover:shadow-md cursor-default"}`}
      style={cardStyle}
    >
      {/* Active Pulse Border Effect */}
      {isGreen && (
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 border-2 border-emerald-400/50 rounded-[3rem] pointer-events-none"
        />
      )}

      {/* Decorative inner elements */}
      {!isGreen && (
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 pointer-events-none"
          style={{ backgroundColor: "#fcf9f8" }}
        />
      )}
      {isGreen && (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none"
            style={{ backgroundColor: "rgba(255,255,255,0.4)" }}
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], rotate: [360, 180, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -top-12 -left-12 w-32 h-32 rounded-full blur-2xl pointer-events-none"
            style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
          />
        </>
      )}

      <div className="relative z-10">
        <span
          className={`inline-block px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-8 ${badgeClass}`}
        >
          {item.level} {isGreen ? "(Aktif Sekarang)" : ""}
        </span>
        <h3 className="text-3xl font-medium text-gray-900 mb-4">{item.name}</h3>
        <p
          className={`text-lg leading-relaxed ${isGreen ? "text-gray-800" : "text-gray-700"}`}
        >
          {item.note}
        </p>
      </div>
    </motion.div>
  );
}

/* CTA Band */
function CtaBand() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full bg-white py-24 border-t border-gray-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="bg-primary-dark text-center relative overflow-hidden p-12 md:p-24"
          style={{ borderRadius: "3rem" }}
        >
          {/* Decorative Background */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl pointer-events-none"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], rotate: [360, 180, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none"
            style={{ backgroundColor: "rgba(118,154,142,0.2)" }}
          />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-12 h-12 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center text-emerald-300"
            >
              <WheatMark size={24} />
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-medium text-white mb-8 tracking-tight leading-tight">
              Satu rel pembayaran untuk 80.000 koperasi desa.
            </h2>
            <p
              className="text-xl mb-12 leading-relaxed"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              Mulai dari koperasi Anda. Catat satu panen, rasakan transparansi
              mutlaknya.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: [
                    "0px 0px 0px rgba(216,234,208,0)",
                    "0px 0px 20px rgba(216,234,208,0.4)",
                    "0px 0px 0px rgba(216,234,208,0)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                type="button"
                className="px-8 py-4 rounded-full font-semibold text-lg transition-colors text-primary-dark w-full sm:w-auto cursor-pointer"
                style={{ backgroundColor: "#d8ead0" }}
              >
                Coba untuk Koperasi
              </motion.button>
              <Link href="/design" className="w-full sm:w-auto block">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  className="px-8 py-4 rounded-full font-semibold text-lg text-white transition-colors border border-white/40 hover:bg-white/10 w-full cursor-pointer"
                >
                  Lihat Design System
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* Footer */
function Footer() {
  const cols = [
    {
      title: "Produk",
      links: [
        { label: "Cara kerja", href: "#cara" },
        { label: "Dampak", href: "#angka" },
        { label: "Roadmap", href: "#alur" },
        { label: "Design system", href: "/design" },
      ],
    },
    {
      title: "Protokol",
      links: [
        { label: "Smart contract", href: "/design" },
        { label: "SDK", href: "/design" },
        { label: "Dokumentasi", href: "/design" },
        { label: "Open source", href: "https://github.com/annona-protocol" },
      ],
    },
    {
      title: "Tentang",
      links: [
        { label: "APAC Stellar Hackathon", href: "https://stellar.org" },
        { label: "Kontak", href: "mailto:hello@annona.finance" },
        { label: "Kebijakan privasi", href: "/privacy" },
      ],
    },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full py-16 border-t border-gray-200"
      style={{ backgroundColor: "#fcf9f8" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Testnet status banner */}
        <div className="mb-12 flex flex-col md:flex-row items-center justify-between gap-6 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                Testnet Aktif di Stellar Soroban
              </p>
              <p className="text-xs text-gray-500">
                Ingin melihat smart contract atau deploy langsung? Kami terbuka.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href="https://github.com/annona-protocol"
              target="_blank"
              rel="noreferrer"
            >
              <button
                type="button"
                className="px-5 py-2.5 rounded-full text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                GitHub Repo
              </button>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand Column */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="flex items-center gap-3">
              <LogoMark size={28} gradient />
              <span className="text-xl font-medium tracking-tight text-gray-900">
                Annona Protocol
              </span>
            </div>
            <p className="text-gray-700 font-medium max-w-[280px] text-sm">
              Rel pembayaran dan settlement panen untuk koperasi desa. Pupuk
              dulu, bayar pas panen, semua tercatat rapi.
            </p>
            <div className="flex gap-3 text-gray-500">
              <a
                href="https://github.com/annona-protocol"
                className="hover:text-emerald-800 transition-colors"
                aria-label="GitHub"
              >
                <Github size={20} />
              </a>
              <a
                href="https://x.com/annonaprotocol"
                className="hover:text-emerald-800 transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://t.me/annonaprotocol"
                className="hover:text-emerald-800 transition-colors"
                aria-label="Telegram"
              >
                <Send size={20} />
              </a>
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-4 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      className="text-gray-700 hover:text-emerald-800 transition-colors"
                      href={link.href}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            © 2026 Annona Protocol. Dibangun untuk APAC Stellar Hackathon.
          </p>
          <div className="flex gap-8 text-sm text-gray-500">
            <a className="hover:text-gray-900" href="/privacy">
              Kebijakan Privasi
            </a>
            <p className="inline-flex items-center gap-1">
              <span
                className="material-symbols-outlined text-sm text-emerald-800"
                style={{ fontFamily: "'Material Symbols Outlined'" }}
              >
                workspace_premium
              </span>
              Catatan yang bisa dipercaya
            </p>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
