"use client";

import { ActivityFeed } from "@/components/kmp/activity-feed";
import { PageHeader } from "@/components/kmp/page-header";
import { ScrollArea } from "@/components/scroll-area";
import { fetchCoop, fetchOverview } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { MOCK_ACTIVITY, formatKg } from "@/lib/mock-data";
import { formatRupiah } from "@annona/core";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  ProgressBar,
  RupiahAmount,
  Skeleton,
  StatCard,
  StatusBadge,
} from "@annona/ui";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  FilePlus2,
  Landmark,
  Scale,
  Truck,
  UserPlus,
  Wallet,
  Wheat,
} from "lucide-react";
import Link from "next/link";

/** Screen A — Home / Overview (PRD §8.1). At-a-glance offtaker-book +
 *  cash-agent health. Big color-coded numbers, plain Bahasa. */
export default function KmpHomePage() {
  const { t } = useI18n();
  const { data: ov, loading: ovLoading } = useApi(fetchOverview);
  const { data: coopData, loading: coopLoading } = useApi(fetchCoop);

  if (ovLoading || coopLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["s1", "s2", "s3", "s4"].map((id) => (
            <Skeleton key={id} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const overview = ov?.coopOverview;
  const harvest = ov?.harvestThisWeek;
  const cashNeeded = ov?.cashNeededThisWeek ?? 0n;
  const inbound = ov?.inboundSupply ?? [];
  const coop = coopData?.coop;
  const cashFunded = coop ? coop.prefundedCashBalance >= cashNeeded : false;
  const coopName = coop?.name ?? "Koperasi";

  if (!overview) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        {t("page.kmp.beranda.desc")}
      </p>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("page.kmp.beranda.title")}
        description={t("page.kmp.beranda.desc")}
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/kmp/petani">
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<UserPlus size={15} />}
                className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                {t("page.kmp.beranda.registerFarmer")}
              </Button>
            </Link>
            <Link href="/kmp/perjanjian/baru">
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<FilePlus2 size={15} />}
                className="rounded-full bg-primary-dark px-4 font-semibold text-white shadow-sm shadow-primary-dark/20 transition-transform hover:bg-opacity-95 active:scale-[0.98]"
              >
                {t("page.kmp.beranda.createAgreement")}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Pre-funded cash banner: green = funded, red = shortfall */}
      <div
        className={
          cashFunded
            ? "mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-200/50 bg-[#ebf5e9]/55 px-5 py-4 shadow-sm"
            : "mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-red-250 bg-red-50/50 px-5 py-4 shadow-sm"
        }
      >
        <span
          className={
            cashFunded
              ? "flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
              : "flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700"
          }
        >
          <Wallet size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">
            {cashFunded
              ? t("page.kmp.beranda.cashFunded")
              : t("page.kmp.beranda.cashShortfall", { amount: formatRupiah(cashNeeded), needed: formatRupiah(cashNeeded) })}
          </p>
          <p className="mt-1 text-xs text-gray-500 font-semibold leading-relaxed">
            {t("page.kmp.beranda.harvestWeek.desc", {
              vol: formatKg(harvest?.totalKg ?? 0),
              amount: formatRupiah(harvest?.totalValue ?? 0n),
            })}
          </p>
        </div>
        <Badge
          tone={cashFunded ? "success" : "danger"}
          className="rounded-full font-bold"
        >
          {cashFunded ? "Terdanai" : "Kurang dana"}
        </Badge>
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("page.kmp.beranda.debtOutstanding")}
          value={
            <RupiahAmount
              smallest={overview.outstandingDebt}
              className="text-3xl font-bold"
            />
          }
          hint={t("page.kmp.beranda.debtHint")}
          icon={<Scale size={18} />}
        />
        <StatCard
          label={t("page.kmp.beranda.activeAgreements")}
          value={String(overview.activeAgreements)}
          hint={t("page.kmp.beranda.activeHint")}
          icon={<Wheat size={18} />}
        />
        <StatCard
          label={t("page.kmp.beranda.settlementRate")}
          value={`${overview.settlementRatePct}%`}
          hint={t("page.kmp.beranda.settlementHint")}
          tone={overview.settlementRatePct >= 60 ? "good" : "warn"}
          icon={<Banknote size={18} />}
        />
        <StatCard
          label={t("page.kmp.beranda.residuTitle")}
          value={
            <RupiahAmount
              smallest={overview.residuOwed}
              className="text-3xl font-bold"
            />
          }
          hint={t("page.kmp.beranda.residuHint")}
          tone={overview.residuOwed > 0n ? "warn" : "good"}
          icon={<Landmark size={18} />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Panen Minggu Ini */}
          <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
            <CardHeader
              title={t("page.kmp.beranda.harvestWeek")}
              description={t("page.kmp.beranda.harvestWeek.desc", {
                vol: formatKg(harvest?.totalKg ?? 0),
                amount: formatRupiah(harvest?.totalValue ?? 0n),
              })}
              action={
                <span className="text-gray-400">
                  <CalendarClock size={18} />
                </span>
              }
              className="pb-3"
            />
            <CardContent className="space-y-4 pt-3">
              {harvest?.rows.map((a) => {
                const deliveredKg = Number(a.deliveredVolG / 1000n);
                return (
                  <Link
                    key={a.id}
                    href={`/kmp/perjanjian/${a.id}`}
                    className="block rounded-2xl border border-gray-100 p-5 bg-white transition-all hover:border-soft-green hover:bg-[#ebf5e9]/10 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {a.farmerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.commodityCode === "GABAH" ? "Gabah" : "Jagung"},
                          {t("common.per")} {formatKg(a.expectedVolKg)}, panen{" "}
                          {a.expectedHarvestDate}
                        </p>
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700">
                          {a.subsidyTier === "Subsidized"
                            ? t("badge.subsidy.Subsidized")
                            : t("badge.subsidy.Commercial")}
                        </span>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    <ProgressBar
                      className="mt-3.5"
                      value={deliveredKg}
                      max={a.expectedVolKg}
                      label={`Setoran masuk ${formatKg(deliveredKg)}`}
                    />
                  </Link>
                );
              })}
              {!harvest?.rows.length ? (
                <p className="py-6 text-center text-sm text-gray-500 font-medium">
                  {t("page.kmp.beranda.harvestWeek.empty")}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Inbound supply strip */}
          <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
            <CardHeader
              title={t("page.kmp.beranda.supplyInbound")}
              description="Kargo Supplier dalam perjalanan, menunggu konfirmasi penerimaan Anda."
              action={
                <span className="text-indigo-400">
                  <Truck size={18} />
                </span>
              }
              className="pb-3"
            />
            <CardContent className="space-y-3 pt-3">
              {inbound.map((a) => {
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/40 px-5 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Perjanjian #{String(a.onchainId)}, {a.farmerName}
                      </p>
                      <p className="text-xs text-gray-500 font-semibold mt-1">
                        Nilai pokok {formatRupiah(a.basePriceSupplier)}, utang
                        belum aktif sebelum barang diterima
                      </p>
                    </div>
                    <Link href="/kmp/gudang">
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        rightIcon={<ArrowRight size={14} />}
                        className="rounded-full bg-primary-dark font-semibold text-white shadow-sm hover:bg-opacity-95"
                      >
                        {t("page.kmp.beranda.supplyInbound.detail")}
                      </Button>
                    </Link>
                  </div>
                );
              })}
              {inbound.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 font-medium">
                  {t("page.kmp.beranda.supplyInbound.empty")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Activity feed */}
        <div className="relative min-h-96 lg:col-span-2">
          <Card className="flex h-full flex-col lg:absolute lg:inset-0 rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
            <CardHeader
              title={t("page.kmp.beranda.activity")}
              description="Setiap baris adalah transaksi nyata di Stellar."
              className="pb-3"
            />
            <CardContent className="min-h-0 flex-1 p-0 pt-2">
              <ScrollArea viewportClassName="h-full px-1" className="h-full">
                <ActivityFeed items={MOCK_ACTIVITY} />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
