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
  BadgePercent,
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
import { useI18n } from "@/lib/i18n/use-i18n";
import { useMemo, useState } from "react";
import { fetchSubsidyDistribution } from "@/lib/api";
import { useApi } from "@/lib/use-api";

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
  const { t } = useI18n();
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
              <SortHeader label={t("page.oversight.pemerintah.leaderboard.col.coop")} sk="name" />
            </th>
            <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("page.kmp.perjanjian.detail.district")}
            </th>
            <th className="px-4 py-3">
              <SortHeader label={t("page.oversight.pemerintah.leaderboard.col.settlement")} sk="settlement" />
            </th>
            <th className="px-4 py-3">
              <SortHeader label={t("page.oversight.pemerintah.leaderboard.col.reputation")} sk="residu" />
            </th>
            <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("page.oversight.pemerintah.activeCoops")}
            </th>
            <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("page.oversight.pemerintah.totalVolume")}
            </th>
            <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("common.status")}
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
                        {t("badge.status.Flagged")}
                      </Badge>
                    )}
                    {isProblem && !isFrozen && (
                      <Badge tone="warning" icon={<AlertTriangle size={10} />}>
                        {t("badge.status.Flagged")}
                      </Badge>
                    )}
                    {!isProblem && !isFrozen && (
                      <Badge tone="success" icon={<CheckCircle2 size={10} />}>
                        {t("badge.reputation.good")}
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
  const { t } = useI18n();
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
        {t("page.oversight.pemerintah.flags")}
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
                {t("page.oversight.pemerintah.flags.view")}
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Subsidy distribution card (live from API) ────────────────────────────────

function SubsidyDistributionCard() {
  const { t } = useI18n();
  const { data, loading, error } = useApi(fetchSubsidyDistribution, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const subsidized = data.byTier.find((t) => t.tier === "Subsidized");
  const commercial = data.byTier.find((t) => t.tier === "Commercial");
  const eligible = data.byFarmerStatus.find((f) => f.status === "eligible");
  const unknown = data.byFarmerStatus.find((f) => f.status === "unknown");

  return (
    <Card>
      <CardHeader
        title={t("page.oversight.pemerintah.subsidy.title")}
        description={t("page.oversight.pemerintah.subsidy.desc")}
        action={<BadgePercent size={16} className="text-emerald-400" />}
      />
      <CardContent className="space-y-6">
        {/* Tier split — two big stat boxes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-5 py-4">
            <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
              {t("badge.subsidy.Subsidized")}
            </p>
            <p className="mt-1.5 text-3xl font-bold text-emerald-800">
              {data.subsidizedAgreementCount}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Perjanjian &middot; nilai proyeksi{" "}
              <RupiahAmount smallest={subsidized?.projectedValue ?? 0n} className="font-semibold" />
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-5 py-4">
            <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              {t("badge.subsidy.Commercial")}
            </p>
            <p className="mt-1.5 text-3xl font-bold text-gray-800">
              {data.commercialAgreementCount}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Perjanjian &middot; nilai proyeksi{" "}
              <RupiahAmount smallest={commercial?.projectedValue ?? 0n} className="font-semibold" />
            </p>
          </div>
        </div>

        {/* Farmer e-RDKK eligibility */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">
            {t("page.oversight.pemerintah.subsidy.farmerEligibility")}
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={12} />
              {t("page.oversight.pemerintah.subsidy.eligible")}: {eligible?.count ?? 0}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
              <AlertTriangle size={12} />
              {t("page.oversight.pemerintah.subsidy.notEligible")}: {unknown?.count ?? 0}
            </span>
          </div>
        </div>

        {/* HET-gated catalog items */}
        {data.hetCatalog.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">
              {t("page.oversight.pemerintah.subsidy.hetCatalog")} ({data.hetCatalog.length})
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                      {t("page.oversight.supplier.katalog.table.col.name")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                      {t("page.oversight.supplier.katalog.table.col.source")}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                      {t("page.oversight.pemerintah.subsidy.hetCatalog")}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                      e-RDKK
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.hetCatalog.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-muted/40">
                      <td className="px-3 py-2 font-medium text-foreground">
                        {item.name}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.priceTier ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">
                        {item.hetPrice
                          ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(item.hetPrice))
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {item.erdkkGated ? (
                          <CheckCircle2 size={14} className="ml-auto text-emerald-500" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
          {t("page.oversight.pemerintah.desc")}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PengawasanRegionalPage() {
  const { t } = useI18n();
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
        title={t("page.oversight.pemerintah.title")}
        description={t("page.oversight.pemerintah.desc")}
      />

      {/* Read-only indicator */}
      <div className="flex items-center gap-2 rounded-lg border border-verdant-200 bg-verdant-50 px-4 py-3">
        <ShieldCheck size={16} className="text-verdant-600" />
        <p className="text-sm font-medium text-verdant-800">
          {t("page.oversight.pemerintah.desc")}
        </p>
      </div>

      {/* Macro stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("page.oversight.pemerintah.totalVolume")}
          value={`${metrics.totalProducedKg.toLocaleString("id-ID")} kg`}
          hint={t("page.oversight.pemerintah.desc")}
          icon={<Wheat size={18} />}
        />
        <StatCard
          label={t("page.oversight.pemerintah.totalFarmers")}
          value={String(totalFarmers)}
          hint={t("page.oversight.pemerintah.desc")}
          icon={<Leaf size={18} />}
        />
        <StatCard
          label={t("page.oversight.pemerintah.totalPaid")}
          value={`${successRatePct}%`}
          hint={`${totalSuccessHarvest} sukses dari ${totalSuccessHarvest + totalFailedHarvest} total tertutup`}
          tone={successRatePct >= 70 ? "good" : successRatePct >= 50 ? "warn" : "bad"}
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label={t("page.oversight.pemerintah.flags")}
          value={String(totalFailedHarvest)}
          hint={t("page.oversight.pemerintah.desc")}
          tone={totalFailedHarvest > 5 ? "warn" : "neutral"}
          icon={<CloudRain size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Leaderboard */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title={t("page.oversight.pemerintah.leaderboard")}
              description={t("page.oversight.pemerintah.desc")}
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
              title={t("page.oversight.pemerintah.commodityDist")}
              description={t("page.oversight.pemerintah.desc")}
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
                    {t("page.oversight.pemerintah.totalVolume")}
                  </p>
                </div>
              ))}
              <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
                {t("page.oversight.pemerintah.desc")}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subsidy distribution — live from API */}
      <SubsidyDistributionCard />

      {/* Regional breakdown */}
      <Card>
        <CardHeader
          title={t("page.oversight.pemerintah.regionalBreakdown")}
          description={t("page.oversight.pemerintah.desc")}
          action={<MapIcon size={16} className="text-aqua-400" />}
        />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="border-b border-border bg-surface-muted text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("page.kmp.perjanjian.detail.district")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Provinsi
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("page.oversight.pemerintah.totalFarmers")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("page.oversight.pemerintah.totalVolume")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Rata-rata Yield
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("page.oversight.pemerintah.leaderboard.col.settlement")}
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
          title={t("page.oversight.pemerintah.flags")}
          description={t("page.oversight.pemerintah.desc")}
          action={<AlertTriangle size={16} className="text-amber-500" />}
        />
        <CardContent>
          <FlagQueue items={FLAG_QUEUE_ITEMS} />
        </CardContent>
      </Card>
    </div>
  );
}
