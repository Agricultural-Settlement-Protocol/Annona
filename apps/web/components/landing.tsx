"use client";

import { formatRupiah } from "@annona/core";
import {
  Button,
  GradientText,
  Highlight,
  Logo,
  LogoMark,
  StatusBadge,
  TxHashLink,
  WheatMark,
} from "@annona/ui";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  FileCheck2,
  Github,
  Layers,
  Lock,
  MessageSquareWarning,
  ReceiptText,
  ScrollText,
  Send,
  Sprout,
  TrendingUp,
  Twitter,
} from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import Link from "next/link";
import type { ComponentType } from "react";
import { CountUp } from "./count-up.js";
import { CustomCursor } from "./cursor.js";
import { FloatingNav } from "./floating-nav.js";
import { Reveal, RevealGroup, RevealItem } from "./reveal.js";
import { SettlementChart } from "./settlement-chart.js";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <CustomCursor />
      <FloatingNav />
      <main className="overflow-x-clip bg-background">
        <Hero />
        <TrustStrip />
        <Problem />
        <HowItWorks />
        <Impact />
        <Features />
        <Roadmap />
        <CtaBand />
        <Footer />
      </main>
    </MotionConfig>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36">
      <div className="pointer-events-none absolute inset-0 annona-mesh opacity-70" aria-hidden />
      <div className="pointer-events-none absolute inset-0 annona-scanlines" aria-hidden />
      {/* soft floating blobs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-verdant-300/30 blur-3xl"
        animate={{ y: [0, 18, 0] }}
        transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-40 h-80 w-80 rounded-full bg-aqua-300/30 blur-3xl"
        animate={{ y: [0, -22, 0] }}
        transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium text-verdant-700 backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-verdant-500" />
            Untuk Koperasi Desa Merah Putih
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
            className="mt-5 font-display text-[2.7rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl"
          >
            Pupuk sekarang, bayarnya pas panen. Semuanya <Highlight>tercatat rapi</Highlight>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14, ease: EASE }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-ink-700"
          >
            Koperasi memberi benih dan pupuk lebih dulu. Saat panen dibeli, utang petani otomatis
            terpotong dan sisanya langsung jadi haknya. Annona mencatat semuanya dalam satu buku
            yang tidak bisa diam-diam diubah siapa pun.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: EASE }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button variant="gradient" size="lg" rightIcon={<ArrowRight size={18} />}>
              Coba untuk koperasi
            </Button>
            <a href="#cara">
              <Button variant="outline" size="lg">
                Lihat cara kerjanya
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.34 }}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            <Trust icon={Lock} text="Tidak bisa dipalsukan" />
            <Trust icon={WheatMark} text="Harga acuan HPP" />
            <Trust icon={Sprout} text="Reputasi petani tumbuh" />
          </motion.div>
        </div>

        {/* Live settlement card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          className="relative"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="mx-auto max-w-sm rounded-3xl border border-border bg-surface/90 p-6 shadow-[var(--shadow-lg)] backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <LogoMark size={22} gradient /> Perjanjian #1024
              </span>
              <StatusBadge status="Settled" />
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <Row label="Setoran panen" value="2.600 kg gabah" />
              <Row label="Harga HPP" value={`${formatRupiah(650_000n)} / kg`} />
              <Row label="Nilai panen" value={formatRupiah(1_690_000_000n)} />
              <Row label="Biaya tangani koperasi (5%)" value={`- ${formatRupiah(84_500_000n)}`} muted />
              <Row label="Potong utang saprotan" value={`- ${formatRupiah(220_000_000n)}`} muted />
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
              <span className="text-sm font-semibold text-foreground">Diterima petani</span>
              <span className="font-display text-2xl font-bold tabular-nums text-verdant-700">
                {formatRupiah(1_385_500_000n)}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tercatat di Stellar</span>
              <TxHashLink hash="a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Trust({
  icon: Icon,
  text,
}: { icon: ComponentType<{ size?: number; className?: string }>; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={15} className="text-verdant-600" />
      {text}
    </span>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${muted ? "text-ink-500" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

/* ─────────────────────── Trust strip ─────────────────────── */
function TrustStrip() {
  const items = ["Stellar / Soroban", "Freighter Wallet", "Harga HPP Bapanas", "Open source"];
  return (
    <section className="border-y border-border bg-surface/50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-6 text-sm font-medium text-muted-foreground">
        <span className="text-ink-400">Dibangun di atas</span>
        {items.map((i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-verdant-400" />
            {i}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Problem ───────────────────────── */
function Problem() {
  const pains = [
    {
      icon: ScrollText,
      title: "Catatan tercecer",
      body: "Utang pupuk di buku, hasil panen di Excel, kesepakatan di chat WA. Tidak ada satu sumber yang dipercaya semua pihak.",
    },
    {
      icon: MessageSquareWarning,
      title: "Gampang bocor",
      body: "Selisih antara panen dan utang mudah hilang di tengah jalan. Susah dibuktikan, gampang jadi sengketa.",
    },
    {
      icon: Lock,
      title: "Bank jadi ragu",
      body: "Tanpa bukti transaksi yang jelas, bank sulit percaya untuk menyalurkan modal ke koperasi.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-verdant-700">
          Masalahnya
        </p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground">
          Koperasi sudah jadi penampung panen. Yang belum ada,{" "}
          <Highlight color="amber">catatan yang bisa dipercaya</Highlight>.
        </h2>
      </Reveal>
      <RevealGroup className="mt-12 grid gap-5 md:grid-cols-3">
        {pains.map((p) => (
          <RevealItem key={p.title}>
            <div className="h-full rounded-2xl border border-border bg-surface p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <p.icon size={20} />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

/* ─────────────────────── How it works ─────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "I",
      title: "Daftar petani",
      body: "Koperasi mendaftarkan petani, luas lahan, dan komoditas. Data pribadi tetap aman, tidak ikut ke catatan publik.",
    },
    {
      n: "II",
      title: "Beri pupuk sebagai kredit",
      body: "Pupuk dan benih diberikan dulu. Nilai utang dan harga beli HPP langsung dikunci dalam perjanjian.",
    },
    {
      n: "III",
      title: "Catat panen",
      body: "Saat panen masuk, beratnya dan mutunya dicatat. Bukti panen langsung terbit dan tidak bisa diubah.",
    },
    {
      n: "IV",
      title: "Selesai, semua jelas",
      body: "Nilai panen dihitung, utang terpotong otomatis, sisanya jadi hak petani. Semua pihak lihat angka yang sama.",
    },
  ];
  return (
    <section id="cara" className="relative bg-surface/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-verdant-700">
            Cara kerja
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground">
            Empat langkah, satu buku besar
          </h2>
          <p className="mt-3 text-muted-foreground">
            Dari benih sampai pembayaran, semuanya nyambung dan ketahuan jejaknya.
          </p>
        </Reveal>
        <RevealGroup className="relative mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <RevealItem key={s.n}>
              <div className="group h-full rounded-2xl border border-border bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-md)]">
                <div className="flex items-center gap-3">
                  <span className="font-display text-4xl font-semibold text-verdant-300 transition-colors group-hover:text-verdant-500">
                    {s.n}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ───────────────────────── Impact ───────────────────────── */
function Impact() {
  return (
    <section id="angka" className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-verdant-700">
            Dampak
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground">
            Skalanya nyata, masalahnya <Highlight color="aqua">triliunan rupiah</Highlight>.
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Puluhan ribu koperasi desa baru dibentuk serentak. Tanpa catatan yang rapi, risikonya
            menumpuk. Annona membuat tiap transaksi panen terlihat dan terbukti.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6">
            <Metric value={<CountUp to={83376} />} label="KDMP terdaftar" />
            <Metric value={<CountUp to={6500} prefix="Rp" />} label="HPP gabah / kg" />
            <Metric
              value={<CountUp to={85.96} format={(n) => n.toFixed(2)} prefix="Rp" suffix=" T" />}
              label="Estimasi risiko gagal bayar"
            />
            <Metric value="< 5 dtk" label="Tercatat di Stellar" />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nilai panen tercatat</p>
                <p className="font-display text-2xl font-semibold text-foreground">
                  <GradientText>Rp1,2 M</GradientText>{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    / musim (contoh)
                  </span>
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-verdant-100 px-2.5 py-0.5 text-xs font-semibold text-verdant-700">
                <TrendingUp size={12} /> tumbuh
              </span>
            </div>
            <div className="mt-4">
              <SettlementChart />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-sm leading-snug text-muted-foreground">{label}</p>
    </div>
  );
}

/* ───────────────────────── Features ───────────────────────── */
function Features() {
  const feats = [
    {
      icon: TrendingUp,
      title: "Potong utang otomatis",
      body: "Begitu panen dibeli, utang pupuk langsung dikurangi. Tidak ada lagi selisih yang bisa hilang.",
    },
    {
      icon: ReceiptText,
      title: "Bukti panen abadi",
      body: "Tiap setoran panen punya bukti yang tidak bisa diubah. Bisa dipakai petani untuk apa saja nanti.",
    },
    {
      icon: BadgeCheck,
      title: "Reputasi yang membuka pintu",
      body: "Makin rajin dan jujur, reputasi petani naik. Sampai akhirnya bisa pinjam tunai, bukan cuma pupuk.",
    },
    {
      icon: Boxes,
      title: "Bisa dipakai koperasi lain",
      body: "Bukan cuma gabah. Kopi, ikan, atau komoditas apa pun bisa jalan di atas rel yang sama.",
    },
  ];
  return (
    <section className="bg-surface/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-verdant-700">
            Kenapa Annona
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground">
            Adil buat petani, aman buat koperasi
          </h2>
        </Reveal>
        <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2">
          {feats.map((f) => (
            <RevealItem key={f.title}>
              <div className="flex h-full gap-4 rounded-2xl border border-border bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-md)]">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-verdant-100 text-verdant-700">
                  <f.icon size={22} />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ───────────────────────── Roadmap ───────────────────────── */
function Roadmap() {
  const layers = [
    { name: "Settlement", note: "Catatan panen", active: true },
    { name: "Reputasi", note: "Identitas petani" },
    { name: "Receivable", note: "Panen jadi aset" },
    { name: "Likuiditas", note: "Modal lebih cepat" },
    { name: "RWA", note: "Investor masuk" },
  ];
  return (
    <section id="alur" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-verdant-700">
          Roadmap
        </p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground">
          Dibangun bertahap, bukan janji kosong
        </h2>
        <p className="mt-3 text-muted-foreground">
          Mulai dari mencatat. Tiap tahap baru mungkin karena data dari tahap sebelumnya.
        </p>
      </Reveal>
      <RevealGroup className="relative mt-14 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {layers.map((l, i) => (
          <RevealItem key={l.name}>
            <div
              className={`relative h-full rounded-2xl border p-5 ${l.active ? "border-verdant-300 bg-verdant-50" : "border-border bg-surface"}`}
            >
              <span className="font-mono text-xs text-muted-foreground">{`L${i + 1}`}</span>
              <h3 className="mt-1 text-lg font-semibold text-foreground">{l.name}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{l.note}</p>
              {l.active ? (
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-verdant-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  Sekarang
                </span>
              ) : null}
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

/* ───────────────────────── CTA band ───────────────────────── */
function CtaBand() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 annona-mesh opacity-80" aria-hidden />
      <div className="pointer-events-none absolute inset-0 annona-scanlines" aria-hidden />
      <Reveal className="relative mx-auto max-w-4xl px-6 py-24 text-center">
        <WheatMark size={34} className="mx-auto text-verdant-600" />
        <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Satu rel pembayaran untuk <GradientText>80.000 koperasi</GradientText>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-700">
          Mulai dari koperasi Anda. Catat satu panen, rasakan bedanya.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="gradient" size="lg" rightIcon={<ArrowRight size={18} />}>
            Coba untuk koperasi
          </Button>
          <Link href="/design">
            <Button variant="outline" size="lg">
              Lihat design system
            </Button>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ───────────────────────── Footer ───────────────────────── */
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
  const socials = [
    { icon: Twitter, label: "X / Twitter", href: "https://x.com/annonaprotocol" },
    { icon: Github, label: "GitHub", href: "https://github.com/annona-protocol" },
    { icon: Send, label: "Telegram", href: "https://t.me/annonaprotocol" },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface">
      <div
        className="annona-gradient pointer-events-none absolute inset-x-0 top-0 h-px opacity-60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-verdant-300/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-64 w-64 rounded-full bg-aqua-300/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-16">
        {/* status + CTA strip */}
        <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface/80 p-6 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-verdant-200 bg-verdant-50 px-3 py-1 text-xs font-medium text-verdant-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdant-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-verdant-500" />
              </span>
              Testnet aktif di Stellar
            </span>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Ingin coba Annona untuk koperasi Anda, atau lihat kontraknya langsung? Kami balas
              cepat.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="gradient" rightIcon={<ArrowRight size={16} />}>
              Coba untuk koperasi
            </Button>
            <Link href="/design">
              <Button variant="outline">Lihat design system</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo size={24} gradient />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Rel pembayaran panen untuk koperasi desa. Pupuk dulu, bayar pas panen, semua tercatat
              rapi dan tidak bisa dipalsukan.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <Layers size={13} className="text-verdant-600" /> Dibangun di atas Stellar
            </div>
            <div className="mt-5 flex items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-verdant-300 hover:text-verdant-700"
                >
                  <s.icon size={15} />
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-semibold text-foreground">{c.title}</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="group inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      {l.label}
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border py-6 text-sm text-muted-foreground sm:flex-row">
          <p>© 2026 Annona Protocol. Dibangun untuk APAC Stellar Hackathon.</p>
          <p className="inline-flex items-center gap-1.5">
            <FileCheck2 size={14} className="text-verdant-600" /> Catatan yang bisa dipercaya
          </p>
        </div>

        {/* oversized wordmark watermark */}
        <div aria-hidden className="relative -mb-6 select-none pt-4 text-center">
          <span className="annona-gradient-text font-display text-[18vw] font-bold leading-none tracking-tight opacity-[0.07]">
            Annona
          </span>
        </div>
      </div>
    </footer>
  );
}
