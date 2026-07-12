"use client";

/**
 * Screen: Financier Ringkasan (Overview).
 * Pool health stat cards + compact queue preview.
 * Client component: fetches via useApi to avoid bigint across server/client
 * boundary on any interactive sub-tree.
 */

import { PageHeader } from "@/components/kmp/page-header";
import {
  fetchFinancierOverview,
  fetchFinancierQueue,
  type ApiFundingRequestRow,
  type RiskBadge,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatRupiah } from "@annona/core";
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  RupiahAmount,
  StatCard,
} from "@annona/ui";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  TrendingDown,
  Wallet,
} from "lucide-react";
import Link from "next/link";

function shortHash(h: string): string {
  if (h.length <= 12) return h;
  return `${h.slice(0, 6)}...${h.slice(-4)}`;
}

function riskBadgeClass(badge: RiskBadge): string {
  if (badge === "Rendah") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (badge === "Sedang") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function QueuePreviewRow({ req }: { req: ApiFundingRequestRow }) {
  return (
    <Link
      href={`/financier/${req.id}`}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 transition-colors hover:border-amber-200 hover:bg-amber-50/30"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{req.coopName}</p>
        <p className="mt-0.5 text-xs text-gray-500 font-mono truncate">
          Bukti: {shortHash(req.backingHash)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskBadgeClass(req.riskBadge)}`}>
          {req.riskBadge}
        </span>
        <span className="text-sm font-semibold tabular-nums text-gray-800">
          {formatRupiah(req.amountRequested)}
        </span>
        <ArrowRight size={14} className="text-gray-400 shrink-0" />
      </div>
    </Link>
  );
}

export default function FinancierHomePage() {
  const { data: ov, loading: ovLoading, error: ovError } = useApi(fetchFinancierOverview);
  const { data: queue, loading: qLoading } = useApi(fetchFinancierQueue);

  const totals = ov?.totals;
  const financier = ov?.financier;
  const topQueue = (queue ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ringkasan Portofolio"
        description="Kesehatan pool dana, permohonan masuk, dan rekonsiliasi berjalan."
      />

      {ovError && (
        <Alert tone="warning" title="Gagal memuat data">
          {ovError}
        </Alert>
      )}

      {/* Hero stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Saldo Pool Dana"
          value={
            financier ? (
              <RupiahAmount smallest={financier.poolBalance} className="text-3xl font-bold" />
            ) : (
              <span className="text-3xl font-bold text-gray-300">Memuat...</span>
            )
          }
          hint="Dana tersedia untuk dicairkan"
          tone="good"
          icon={<Coins size={18} />}
        />
        <StatCard
          label="Total Diajukan"
          value={
            totals ? (
              <RupiahAmount smallest={totals.totalRequested} className="text-3xl font-bold" />
            ) : (
              <span className="text-3xl font-bold text-gray-300">{ovLoading ? "..." : "-"}</span>
            )
          }
          hint={`${totals?.requestCount ?? 0} permohonan, ${totals?.pendingCount ?? 0} menunggu`}
          icon={<Banknote size={18} />}
        />
        <StatCard
          label="Total Dicairkan"
          value={
            totals ? (
              <RupiahAmount smallest={totals.totalDisbursed} className="text-3xl font-bold" />
            ) : (
              <span className="text-3xl font-bold text-gray-300">{ovLoading ? "..." : "-"}</span>
            )
          }
          hint="Dana yang sudah dikirim ke koperasi"
          icon={<Wallet size={18} />}
        />
        <StatCard
          label="Total Direkonsiliasi"
          value={
            totals ? (
              <RupiahAmount smallest={totals.totalReconciled} className="text-3xl font-bold" />
            ) : (
              <span className="text-3xl font-bold text-gray-300">{ovLoading ? "..." : "-"}</span>
            )
          }
          hint="Sudah dikembalikan oleh koperasi"
          tone="good"
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label="Sisa Talangan Berjalan"
          value={
            totals ? (
              <RupiahAmount smallest={totals.outstanding} className="text-3xl font-bold" />
            ) : (
              <span className="text-3xl font-bold text-gray-300">{ovLoading ? "..." : "-"}</span>
            )
          }
          hint="Dicairkan belum direkonsiliasi"
          tone={totals && totals.outstanding > 0n ? "warn" : "good"}
          icon={<TrendingDown size={18} />}
        />
        <StatCard
          label="Menunggu Persetujuan"
          value={String(totals?.pendingCount ?? (ovLoading ? "..." : "0"))}
          hint="Permohonan status Requested"
          tone={totals && totals.pendingCount > 0 ? "warn" : "good"}
          icon={<ClipboardCheck size={18} />}
        />
      </div>

      {/* Queue preview */}
      <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
        <CardHeader
          title="Antrean Menunggu Persetujuan"
          description="Permohonan talangan yang belum disetujui atau ditolak."
          action={
            <Link
              href="/financier/antrean"
              className="flex items-center gap-1 text-sm font-semibold text-amber-700 hover:underline"
            >
              Lihat semua
              <ArrowRight size={14} />
            </Link>
          }
          className="pb-3"
        />
        <CardContent className="space-y-2 pt-3">
          {qLoading && (
            <p className="py-4 text-center text-sm text-gray-400">Memuat antrean...</p>
          )}
          {!qLoading && topQueue.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">
              Tidak ada permohonan menunggu persetujuan.
            </p>
          )}
          {topQueue.map((req) => (
            <QueuePreviewRow key={req.id} req={req} />
          ))}
          {!qLoading && (queue?.length ?? 0) > 5 && (
            <div className="pt-2 text-center">
              <Link
                href="/financier/antrean"
                className="text-sm font-semibold text-amber-700 hover:underline"
              >
                Lihat {(queue?.length ?? 0) - 5} permohonan lainnya
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
