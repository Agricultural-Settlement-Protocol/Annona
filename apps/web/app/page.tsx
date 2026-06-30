import { formatRupiah } from "@annona/core";
import {
  Button,
  Eyebrow,
  GradientText,
  Logo,
  SealEmblem,
  StatusBadge,
  TxHashLink,
  WheatDivider,
  WheatMark,
} from "@annona/ui";
import { ArrowRight, ShieldCheck, Sprout, Wheat } from "lucide-react";
import Link from "next/link";

/**
 * Landing. Editorial Greco-Roman treatment (Annona = Roman goddess of the
 * grain supply). Serif display + brand gradient + wheat/laurel + seal.
 * The one loud surface. No em dashes in copy.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo size={28} />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#cara" className="hover:text-foreground">
            Cara kerja
          </a>
          <a href="#angka" className="hover:text-foreground">
            Dampak
          </a>
          <Link href="/design" className="hover:text-foreground">
            Design system
          </Link>
        </nav>
        <Button variant="gradient" size="sm" rightIcon={<ArrowRight size={15} />}>
          Masuk
        </Button>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 annona-mesh opacity-60" aria-hidden />
        <div className="pointer-events-none absolute inset-0 annona-scanlines" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Eyebrow lines={false}>Dewi Annona · Lumbung Romawi, kini di Stellar</Eyebrow>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              Pencatatan panen yang <GradientText>tidak bisa dipalsukan</GradientText>.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-700">
              Annona merangkai alur kredit input ke pembelian panen (yarnen) menjadi satu buku besar
              yang adil, dengan pemotongan utang otomatis dan harga acuan HPP. Untuk Koperasi Desa
              Merah Putih, dan koperasi komoditas mana pun.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="gradient" size="lg" rightIcon={<ArrowRight size={18} />}>
                Mulai untuk Koperasi
              </Button>
              <Link href="/design">
                <Button variant="outline" size="lg">
                  Lihat design system
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-verdant-600" /> Tahan manipulasi
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Wheat size={15} className="text-verdant-600" /> Harga HPP
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sprout size={15} className="text-verdant-600" /> Reputasi petani
              </span>
            </div>
          </div>

          {/* Right: seal + a live settlement card */}
          <div className="relative">
            <div className="flex justify-center">
              <SealEmblem size={150} />
            </div>
            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-border bg-surface/90 p-5 shadow-[var(--shadow-lg)] backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Perjanjian #1024</span>
                <StatusBadge status="Settled" />
              </div>
              <div className="mt-4 space-y-2.5 text-sm">
                <Row label="Setor panen" value="2.600 kg gabah" />
                <Row label="Harga HPP" value={`${formatRupiah(650_000n)} / kg`} />
                <Row label="Bruto" value={formatRupiah(1_690_000_000n)} />
                <Row label="Potong utang input" value={`- ${formatRupiah(200_000_000n)}`} />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm font-semibold text-foreground">Petani terima</span>
                <span className="annona-gradient-text text-xl font-bold tabular-nums">
                  {formatRupiah(1_490_000_000n)}
                </span>
              </div>
              <div className="mt-3 flex justify-end">
                <TxHashLink hash="a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact numbers */}
      <section id="angka" className="mx-auto max-w-6xl px-6 py-16">
        <WheatDivider />
        <div className="mt-12 grid grid-cols-2 gap-8 lg:grid-cols-4">
          <Stat figure="83.376" label="KDMP terdaftar di Indonesia" />
          <Stat figure="Rp6.500" label="HPP gabah per kg (Inpres 4/2026)" />
          <Stat figure="Rp85,96 T" label="Estimasi risiko gagal bayar (Celios)" />
          <Stat figure="< 5 dtk" label="Settlement tercatat di Stellar" />
        </div>
      </section>

      {/* The loop */}
      <section id="cara" className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <Eyebrow className="justify-center">Empat langkah, satu buku besar</Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground">
            Dari benih sampai <GradientText>Lunas</GradientText>
          </h2>
        </div>
        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Step
            n="I"
            title="Daftar petani"
            body="Koperasi mendaftarkan petani, lahan, dan komoditas. Data pribadi tetap di luar chain."
          />
          <Step
            n="II"
            title="Perjanjian"
            body="Input diberikan sebagai kredit. Utang dan harga HPP terkunci di on-chain."
          />
          <Step
            n="III"
            title="Panen"
            body="Setoran panen dicatat dengan grade. Bukti panen (receipt) langsung terbit."
          />
          <Step
            n="IV"
            title="Lunas"
            body="Pembayaran dihitung, utang dipotong otomatis, sisanya untuk petani."
          />
        </ol>
      </section>

      {/* Closing */}
      <section className="relative mt-8 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 annona-mesh opacity-70" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center">
          <WheatMark size={32} className="mx-auto text-verdant-600" />
          <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Satu rel settlement untuk 80.000 koperasi
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-700">
            Settlement, lalu reputasi, lalu receivable, lalu likuiditas, lalu RWA. Dibangun
            bertahap, bukan janji kosong.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button variant="gradient" size="lg" rightIcon={<ArrowRight size={18} />}>
              Mulai untuk Koperasi
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <Logo size={22} />
          <p>Annona Protocol. Dibangun untuk APAC Stellar Hackathon 2026.</p>
        </div>
      </footer>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function Stat({ figure, label }: { figure: string; label: string }) {
  return (
    <div>
      <p className="annona-gradient-text font-display text-4xl font-semibold tabular-nums">
        {figure}
      </p>
      <p className="mt-2 text-sm leading-snug text-muted-foreground">{label}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-[var(--shadow-md)]">
      <span className="font-display text-3xl font-semibold text-verdant-300 transition-colors group-hover:text-verdant-500">
        {n}
      </span>
      <h3 className="mt-3 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </li>
  );
}
