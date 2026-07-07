"use client";

/**
 * Screen G: Pengawasan Regional (Pemerintah view).
 *
 * STRICTLY read-only. Zero write buttons.
 * - Macro row: total produksi, produktivitas per kecamatan, rata-rata reputasi,
 *   rasio panen sukses vs gagal panen.
 * - Koperasi leaderboard: settlement rate + residu compliance, red floats up,
 *   sortable.
 * - Commodity distribution: CSS bar chart.
 * - Flag queue: read-only list. Local "Tandai sudah ditinjau" checkbox only
 *   (no chain write).
 */

import { OversightPageHeader } from "@/components/oversight/page-header";
import { ScrollArea } from "@/components/scroll-area";
import {
  COMMODITY_DIST,
  FLAG_QUEUE_ITEMS,
  type FlagQueueItem,
  MOCK_COOP_PROFILES,
  buildRegionalData,
  protocolMetrics,
} from "@/lib/oversight-data";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  ReputationBadge,
  RupiahAmount,
  StatCard,
} from "@annona/ui";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CloudRain,
  Leaf,
  Lock,
  Map as MapIcon,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wheat,
} from "lucide-react";
import { useMemo, useState } from "react";

// ─── Flag reason labels ───────────────────────────────────────────────────────

const FLAG_REASON_META: Record<
  string,
  { label: string; tone: "warning" | "danger" | "neutral" }
> = {
  Warning: { label: "Peringatan Ringan", tone: "warning" },
  PartialDelivery: { label: "Setoran Sebagian", tone: "warning" },
  Suspected: { label: "Perlu Investigasi", tone: "danger" },
  ForceMajeure: { label: "Gagal Panen", tone: "neutral" },
};

// ─── Leaderboard table ────────────────────────────────────────────────────────

type SortKey = "settlement" | "residu" | "name";
type SortDir = "asc" | "desc";

function LeaderboardTable() {
  const [sortKey, setSortKey] = useState<SortKey>("settlement");
  const [sortDir, setSortDir] = useState<SortDir>("asc"); // asc = worst first (reds float up)

  const sorted = useMemo(() => {
    return [...MOCK_COOP_PROFILES].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "settlement") {
        cmp = a.settlementRatePct - b.settlementRatePct; // lower = worse, floats up
      } else if (sortKey === "residu") {
        cmp = a.residuCompliancePct - b.residuCompliancePct;
      } else {
        cmp = a.name.localeCompare(b.name);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortHeader({
    label,
    sk,
  }: {
    label: string;
    sk: SortKey;
  }) {
    const active = sortKey === sk;
    return (
      <button
        type="button"
        onClick={() => handleSort(sk)}
        className="flex items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <TrendingDown size={12} />
          ) : (
            <TrendingUp size={12} />
          )
        ) : null}
      </button>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-sm">
        <thead className="border-b border-border bg-surface-muted text-left">
          <tr>
            <th className="px-4 py-3">
              <SortHeader label="Koperasi" sk="name" />
            </th>
            <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Kabupaten
            </th>
            <th className="px-4 py-3">
              <SortHeader label="Settlement Rate" sk="settlement" />
            </th>
            <th className="px-4 py-3">
              <SortHeader label="Kepatuhan Residu" sk="residu" />
            </th>
            <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Perjanjian Aktif
            </th>
            <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Total Produksi
            </th>
            <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((coop) => {
            const isProblem = coop.settlementRatePct < 50;
            const isFrozen = coop.reputation.frozen;
            return (
              <tr
                key={coop.id}
                className={
                  isFrozen
                    ? "bg-red-50/60"
                    : isProblem
                      ? "bg-amber-50/40"
                      : "hover:bg-surface-muted/60"
                }
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{coop.name}</p>
                  <p className="text-xs text-muted-foreground">{coop.kecamatan}</p>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {coop.kabupaten}, {coop.provinsi}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className={`h-full rounded-full ${coop.settlementRatePct >= 70 ? "bg-emerald-500" : coop.settlementRatePct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${coop.settlementRatePct}%` }}
                      />
                    </div>
                    <span
                      className={`font-semibold tabular-nums ${coop.settlementRatePct >= 70 ? "text-emerald-700" : coop.settlementRatePct >= 50 ? "text-amber-700" : "text-red-700"}`}
                    >
                      {coop.settlementRatePct}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className={`h-full rounded-full ${coop.residuCompliancePct >= 80 ? "bg-emerald-500" : coop.residuCompliancePct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${coop.residuCompliancePct}%` }}
                      />
                    </div>
                    <span
                      className={`font-semibold tabular-nums ${coop.residuCompliancePct >= 80 ? "text-emerald-700" : coop.residuCompliancePct >= 50 ? "text-amber-700" : "text-red-700"}`}
                    >
                      {coop.residuCompliancePct}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-foreground">
                  {coop.activeAgreementCount}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {coop.totalProducedKg.toLocaleString("id-ID")} kg
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {isFrozen && (
                      <Badge tone="danger" icon={<Lock size={10} />}>
                        Dibekukan
                      </Badge>
                    )}
                    {isProblem && !isFrozen && (
                      <Badge tone="warning" icon={<AlertTriangle size={10} />}>
                        Bermasalah
                      </Badge>
                    )}
                    {!isProblem && !isFrozen && (
                      <Badge tone="success" icon={<CheckCircle2 size={10} />}>
                        Baik
                      </Badge>
                    )}
                    {coop.flagQueue > 0 && (
                      <Badge tone="warning">
                        {coop.flagQueue} flag
                      </Badge>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Flag queue ───────────────────────────────────────────────────────────────

function FlagQueue({ items }: { items: FlagQueueItem[] }) {
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setReviewed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Flag adalah indikator untuk peninjauan manusia, bukan tuduhan otomatis.
        "Tandai sudah ditinjau" hanya tersimpan di perangkat ini.
      </p>
      {items.map((item) => {
        const meta = FLAG_REASON_META[item.reason] ?? {
          label: item.reason,
          tone: "neutral" as const,
        };
        const isReviewed = reviewed.has(item.id);
        return (
          <div
            key={item.id}
            className={`rounded-lg border p-4 transition-colors ${isReviewed ? "border-border bg-surface-muted/50 opacity-60" : "border-border bg-surface"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{item.farmerName}</p>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.coopName}, perjanjian {item.agreementId}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Setoran {item.deliveredKg.toLocaleString("id-ID")} kg dari{" "}
                  {item.expectedKg.toLocaleString("id-ID")} kg yang diperkirakan
                  ({item.deliveredPct}%). Ditandai: {item.flaggedAt}.
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={isReviewed}
                  onChange={() => toggle(item.id)}
                  className="h-4 w-4 rounded border-border accent-verdant-600"
                />
                Sudah ditinjau
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PengawasanRegionalPage() {
  const metrics = useMemo(() => protocolMetrics(), []);
  const regional = useMemo(() => buildRegionalData(), []);

  const totalSuccessHarvest = regional.reduce(
    (s, r) => s + r.successfulHarvestCount,
    0,
  );
  const totalFailedHarvest = regional.reduce(
    (s, r) => s + r.failedHarvestCount,
    0,
  );
  const totalFarmers = regional.reduce((s, r) => s + r.activeFarmers, 0);
  const successRatePct =
    totalSuccessHarvest + totalFailedHarvest === 0
      ? 0
      : Math.round(
          (totalSuccessHarvest / (totalSuccessHarvest + totalFailedHarvest)) * 100,
        );

  return (
    <div className="space-y-6">
      <OversightPageHeader
        title="Pengawasan Regional"
        description="Data produksi komoditas dan kinerja koperasi di seluruh jaringan Annona Protocol. Tampilan hanya baca untuk keperluan regulasi dan kebijakan."
      />

      {/* Read-only indicator */}
      <div className="flex items-center gap-2 rounded-lg border border-verdant-200 bg-verdant-50 px-4 py-3">
        <ShieldCheck size={16} className="text-verdant-600" />
        <p className="text-sm font-medium text-verdant-800">
          Mode pengawasan: Anda melihat data sebagai regulator. Tidak ada tindakan
          tulis yang tersedia.
        </p>
      </div>

      {/* Macro stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Produksi"
          value={`${metrics.totalProducedKg.toLocaleString("id-ID")} kg`}
          hint="Seluruh komoditas, semua koperasi terdaftar"
          icon={<Wheat size={18} />}
        />
        <StatCard
          label="Total Petani Aktif"
          value={String(totalFarmers)}
          hint="Petani dengan perjanjian aktif di jaringan"
          icon={<Leaf size={18} />}
        />
        <StatCard
          label="Rasio Panen Sukses"
          value={`${successRatePct}%`}
          hint={`${totalSuccessHarvest} sukses dari ${totalSuccessHarvest + totalFailedHarvest} total tertutup`}
          tone={successRatePct >= 70 ? "good" : successRatePct >= 50 ? "warn" : "bad"}
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label="Gagal Panen Tercatat"
          value={String(totalFailedHarvest)}
          hint="Flagged + ForceMajeure di seluruh koperasi"
          tone={totalFailedHarvest > 5 ? "warn" : "neutral"}
          icon={<CloudRain size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Leaderboard */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Leaderboard Koperasi"
              description="Urutkan berdasarkan settlement rate atau kepatuhan residu. KMP bermasalah muncul di atas secara default."
              action={<BarChart3 size={16} className="text-verdant-400" />}
            />
            <CardContent className="p-0">
              <LeaderboardTable />
            </CardContent>
          </Card>
        </div>

        {/* Commodity distribution */}
        <div>
          <Card>
            <CardHeader
              title="Distribusi Komoditas"
              description="Komposisi produksi berdasarkan jenis komoditas. Sumber: data perjanjian aktif."
              action={<Wheat size={16} className="text-verdant-400" />}
            />
            <CardContent className="space-y-4">
              {COMMODITY_DIST.map((c) => (
                <div key={c.code}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {c.pct}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-verdant-400"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.kgTotal.toLocaleString("id-ID")} kg total
                  </p>
                </div>
              ))}
              <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
                Sumber: perjanjian diselesaikan (Settled), data off-chain per
                koperasi.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Regional breakdown */}
      <Card>
        <CardHeader
          title="Produktivitas Per Kabupaten"
          description="Rata-rata yield berdasarkan tabel KATAM Balitbangtan dan BPS. Digunakan sebagai acuan estimasi transparan pada perjanjian."
          action={<MapIcon size={16} className="text-aqua-400" />}
        />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="border-b border-border bg-surface-muted text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Kabupaten
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Provinsi
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Petani Aktif
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Total Produksi
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Rata-rata Yield
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Settlement Rate
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Panen Sukses
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Gagal Panen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {regional.map((r) => (
                  <tr
                    key={r.kabupaten}
                    className="transition-colors hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {r.kabupaten}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.provinsi}</td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {r.activeFarmers}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {r.totalKg.toLocaleString("id-ID")} kg
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {r.avgYieldTPerHa} t/ha
                      <span className="ml-1 text-[10px]">(BPS/KATAM)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold tabular-nums ${r.settlementRate >= 70 ? "text-emerald-700" : r.settlementRate >= 50 ? "text-amber-700" : "text-red-700"}`}
                      >
                        {r.settlementRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-emerald-700">
                      {r.successfulHarvestCount}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-red-700">
                      {r.failedHarvestCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Flag queue */}
      <Card>
        <CardHeader
          title="Antrean Flag dan Intervensi"
          description="Perjanjian yang memerlukan verifikasi pemerintah. Flag hanya indikator untuk peninjauan manusia, bukan tuduhan otomatis."
          action={<AlertTriangle size={16} className="text-amber-500" />}
        />
        <CardContent>
          <FlagQueue items={FLAG_QUEUE_ITEMS} />
        </CardContent>
      </Card>
    </div>
  );
}
