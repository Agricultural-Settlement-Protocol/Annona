"use client";

/**
 * /oversight — Role-select page.
 *
 * Two large cards: Masuk sebagai Agrinas / Masuk sebagai Pemerintah.
 * Role is implied by the sub-route (/oversight/agrinas or /oversight/pemerintah).
 * Stored in localStorage as "annona.oversight.role" for UX continuity (demo mode).
 * No real auth — this is a hackathon demo.
 */

import { Logo } from "@annona/ui";
import { ArrowRight, BarChart3, Package, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function OversightRoleSelectPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-16 items-center border-b border-border bg-surface px-6">
        <Link href="/" aria-label="Kembali ke beranda">
          <Logo className="h-7 w-auto" />
        </Link>
        <span className="ml-3 text-sm text-muted-foreground">Dasbor Pengawasan</span>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mb-10 text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            <ShieldCheck size={13} />
            Annona Protocol
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Pilih peran pengawasan Anda
          </h1>
          <p className="mt-3 max-w-lg text-base text-muted-foreground">
            Agrinas mengelola operasional protokol. Pemerintah memantau data produksi
            dan kepatuhan koperasi secara read-only.
          </p>
        </div>

        <div className="grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Agrinas card */}
          <Link
            href="/oversight/agrinas"
            className="group relative flex flex-col gap-4 rounded-xl border border-aqua-200 bg-surface p-7 shadow-sm transition-all hover:border-aqua-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-aqua-100">
              <Package size={24} className="text-aqua-700" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Agrinas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Operator protokol. Kelola katalog saprotan, dispatch logistik ke
                koperasi, verifikasi remitansi residu, dan pantau kesehatan
                seluruh jaringan KMP.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-aqua-700">
              Masuk sebagai Agrinas
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </div>
            {/* Authority indicator */}
            <span className="absolute top-4 right-4 rounded-full bg-aqua-100 px-2 py-0.5 text-[10px] font-semibold text-aqua-700">
              Baca + Tulis
            </span>
          </Link>

          {/* Pemerintah card */}
          <Link
            href="/oversight/pemerintah"
            className="group relative flex flex-col gap-4 rounded-xl border border-verdant-200 bg-surface p-7 shadow-sm transition-all hover:border-verdant-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-verdant-100">
              <BarChart3 size={24} className="text-verdant-700" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Pemerintah</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Regulator read-only. Pantau produksi komoditas per kecamatan,
                leaderboard koperasi, antrean flag, dan kinerja keseluruhan
                protokol untuk keperluan regulasi dan kebijakan.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-verdant-700">
              Masuk sebagai Pemerintah
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </div>
            <span className="absolute top-4 right-4 rounded-full bg-verdant-100 px-2 py-0.5 text-[10px] font-semibold text-verdant-700">
              Hanya Baca
            </span>
          </Link>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Demo mode. Tidak ada autentikasi nyata. Data dari testnet Stellar.
        </p>
      </main>
    </div>
  );
}
