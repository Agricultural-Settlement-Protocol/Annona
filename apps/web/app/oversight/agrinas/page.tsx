"use client";

/**
 * Agrinas Ringkasan (Screen: Home) — protocol-level health at a glance.
 *
 * StatCards: total pokok aktif seluruh KMP, residu tertunda, antrean dispatch,
 * KMP bermasalah count. Activity feed + quick-access buttons.
 */

import { OversightPageHeader } from "@/components/oversight/page-header";
import { ScrollArea } from "@/components/scroll-area";
import {
  AGRINAS_ACTIVITY,
  MOCK_COOP_PROFILES,
  OVERSIGHT_SHIPMENTS,
  buildDispatchRequests,
  buildEditableCatalog,
  protocolMetrics,
} from "@/lib/oversight-data";
import { formatRupiah } from "@annona/core";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  RupiahAmount,
  StatCard,
  TxHashLink,
} from "@annona/ui";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Inbox,
  Landmark,
  Package,
  PackageX,
  Scale,
  Send,
  Truck,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

type KindKey = "dispatch" | "remittance" | "cleared" | "dispute" | "created" | "frozen";
const KIND_META: Record<KindKey, { icon: React.ReactNode; color: string }> = {
  dispatch: {
    icon: <Truck size={14} />,
    color: "text-aqua-600",
  },
  remittance: {
    icon: <Landmark size={14} />,
    color: "text-amber-600",
  },
  cleared: {
    icon: <CheckCircle2 size={14} />,
    color: "text-emerald-600",
  },
  dispute: {
    icon: <AlertTriangle size={14} />,
    color: "text-red-600",
  },
  created: {
    icon: <Package size={14} />,
    color: "text-verdant-600",
  },
  frozen: {
    icon: <AlertTriangle size={14} />,
    color: "text-red-700",
  },
};
const FALLBACK_META = { icon: <Package size={14} />, color: "text-ink-400" };

export default function AgrinasHomePage() {
  const metrics = useMemo(() => protocolMetrics(), []);
  const pendingRequests = useMemo(
    () => buildDispatchRequests().filter((r) => r.status === "Menunggu"),
    [],
  );
  const frozenCoops = MOCK_COOP_PROFILES.filter((c) => c.reputation.frozen);
  const catalog = useMemo(() => buildEditableCatalog(), []);
  const stokHabis = catalog.filter((r) => r.stockStatus === "Habis").length;
  const kirimanMenunggu = OVERSIGHT_SHIPMENTS.filter((s) => s.status === "Dikirim").length;

  return (
    <div>
      <OversightPageHeader
        title="Ringkasan Operator Agrinas"
        description="Kesehatan protokol offtake di seluruh jaringan koperasi. Data real-time dari Stellar testnet."
        actions={
          <>
            <Link href="/oversight/agrinas/katalog">
              <Button variant="outline" size="sm" leftIcon={<Package size={14} />}>
                Katalog
              </Button>
            </Link>
            <Link href="/oversight/agrinas/logistik">
              <Button variant="outline" size="sm" leftIcon={<Truck size={14} />}>
                Logistik
              </Button>
            </Link>
            <Link href="/oversight/agrinas/penerimaan">
              <Button variant="outline" size="sm" leftIcon={<Inbox size={14} />}>
                Penerimaan
              </Button>
            </Link>
            <Link href="/oversight/agrinas/residu">
              <Button variant="accent" size="sm" leftIcon={<Landmark size={14} />}>
                Rekonsiliasi Residu
              </Button>
            </Link>
          </>
        }
      />

      {/* KMP frozen alert */}
      {frozenCoops.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-red-200 bg-red-50 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {frozenCoops.length} koperasi dibekukan on-chain
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {frozenCoops.map((c) => c.name).join(", ")} memerlukan tindak lanjut
              rekonsiliasi residu. Ini indikator untuk peninjauan manusia.
            </p>
          </div>
          <Link href="/oversight/agrinas/residu">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight size={13} />}>
              Tinjau Residu
            </Button>
          </Link>
        </div>
      ) : null}

      {/* Hero stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Pokok Aktif"
          value={
            <RupiahAmount
              smallest={metrics.totalPrincipalOutstanding}
              className="text-3xl"
            />
          }
          hint="Nilai saprotan sedang berjalan di seluruh KMP"
          icon={<Scale size={18} />}
        />
        <StatCard
          label="Residu Belum Diterima"
          value={
            <RupiahAmount
              smallest={metrics.residuPending + metrics.residuRemitted}
              className="text-3xl"
            />
          }
          hint="Pokok Agrinas di kas KMP, belum diverifikasi"
          tone={
            metrics.residuPending + metrics.residuRemitted > 0n ? "warn" : "good"
          }
          icon={<Landmark size={18} />}
        />
        <StatCard
          label="Antrean Dispatch"
          value={String(pendingRequests.length)}
          hint="Permintaan saprotan KMP menunggu pengiriman"
          tone={pendingRequests.length > 0 ? "warn" : "good"}
          icon={<Truck size={18} />}
        />
        <StatCard
          label="KMP Bermasalah"
          value={String(metrics.bermasalahCoops + metrics.frozenCoops)}
          hint="Settlement rate rendah atau reputasi dibekukan"
          tone={metrics.bermasalahCoops + metrics.frozenCoops > 0 ? "bad" : "good"}
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {/* Quick-link cards: Katalog / Logistik / Penerimaan */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/oversight/agrinas/katalog" className="group block">
          <div className="flex items-center gap-4 rounded-[14px] border border-border bg-surface p-4 shadow-sm transition-shadow group-hover:shadow-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-verdant-100 text-verdant-700">
              <Package size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">Katalog Saprotan</p>
              <p className="text-xs text-muted-foreground">
                {catalog.length} item,{" "}
                {stokHabis > 0 ? (
                  <span className="text-red-600 font-medium">{stokHabis} stok habis</span>
                ) : (
                  "stok lengkap"
                )}
              </p>
            </div>
            <ArrowRight size={16} className="shrink-0 text-muted-foreground group-hover:text-foreground" />
          </div>
        </Link>
        <Link href="/oversight/agrinas/logistik" className="group block">
          <div className="flex items-center gap-4 rounded-[14px] border border-border bg-surface p-4 shadow-sm transition-shadow group-hover:shadow-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aqua-100 text-aqua-700">
              <Truck size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">Logistik Saprotan</p>
              <p className="text-xs text-muted-foreground">
                {pendingRequests.length > 0 ? (
                  <span className="text-amber-600 font-medium">
                    {pendingRequests.length} antrean dispatch
                  </span>
                ) : (
                  "Tidak ada antrean"
                )}
              </p>
            </div>
            <ArrowRight size={16} className="shrink-0 text-muted-foreground group-hover:text-foreground" />
          </div>
        </Link>
        <Link href="/oversight/agrinas/penerimaan" className="group block">
          <div className="flex items-center gap-4 rounded-[14px] border border-border bg-surface p-4 shadow-sm transition-shadow group-hover:shadow-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-verdant-100 text-verdant-700">
              <Inbox size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">Penerimaan Panen</p>
              <p className="text-xs text-muted-foreground">
                {kirimanMenunggu > 0 ? (
                  <span className="text-amber-600 font-medium">
                    {kirimanMenunggu} kiriman menunggu
                  </span>
                ) : (
                  "Semua kiriman terkonfirmasi"
                )}
              </p>
            </div>
            <ArrowRight size={16} className="shrink-0 text-muted-foreground group-hover:text-foreground" />
          </div>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column: protocol summary + dispatch queue */}
        <div className="space-y-6 lg:col-span-3">
          {/* Protocol summary */}
          <Card>
            <CardHeader
              title="Ringkasan Protokol"
              description="Agregat seluruh 6 koperasi yang terdaftar."
              action={<Wifi size={16} className="text-aqua-400" />}
            />
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-surface-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Perjanjian Aktif
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {metrics.totalActiveAgreements}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Settlement Rate Keseluruhan
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold tabular-nums ${metrics.overallSettlementRatePct >= 70 ? "text-emerald-700" : "text-amber-700"}`}
                  >
                    {metrics.overallSettlementRatePct}%
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Kepatuhan Residu
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold tabular-nums ${metrics.overallResiduCompliancePct >= 80 ? "text-emerald-700" : "text-red-700"}`}
                  >
                    {metrics.overallResiduCompliancePct}%
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Diselesaikan
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {formatRupiah(metrics.totalSettledRp)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Produksi
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {metrics.totalProducedKg.toLocaleString("id-ID")} kg
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Flag Perlu Ditinjau
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold tabular-nums ${metrics.totalFlags > 0 ? "text-amber-700" : "text-emerald-700"}`}
                  >
                    {metrics.totalFlags}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dispatch queue */}
          <Card>
            <CardHeader
              title="Antrean Dispatch Saprotan"
              description="Permintaan gabungan KMP menunggu konfirmasi pengiriman dari Agrinas."
              action={
                <Link href="/oversight/agrinas/logistik">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={13} />}>
                    Kelola
                  </Button>
                </Link>
              }
            />
            <CardContent className="space-y-3">
              {pendingRequests.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Tidak ada antrean dispatch saat ini.
                </p>
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req.requestId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-aqua-100 bg-aqua-50/50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {req.coopName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {req.kabupaten}, {req.agreementIds.length} perjanjian,{" "}
                        {req.items.length} jenis barang
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-aqua-700">
                        Total pokok: {formatRupiah(req.grandTotal)}
                      </p>
                    </div>
                    <Link href="/oversight/agrinas/logistik">
                      <Button
                        variant="accent"
                        size="sm"
                        leftIcon={<Send size={13} />}
                        rightIcon={<ArrowRight size={13} />}
                      >
                        Dispatch
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity feed */}
        <div className="relative min-h-96 lg:col-span-2">
          <Card className="flex h-full flex-col lg:absolute lg:inset-0">
            <CardHeader
              title="Aktivitas Terbaru"
              description="Event on-chain: dispatch, remitansi, verifikasi, pembekuan."
            />
            <CardContent className="min-h-0 flex-1 p-0">
              <ScrollArea viewportClassName="h-full px-5 pt-2" className="h-full">
                <div className="space-y-4 pb-5">
                  {AGRINAS_ACTIVITY.map((act) => {
                    const meta =
                      KIND_META[act.kind as KindKey] ?? FALLBACK_META;
                    return (
                      <div key={act.id} className="flex gap-3">
                        <span
                          className={`mt-0.5 shrink-0 ${meta.color}`}
                          aria-hidden
                        >
                          {meta.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground">{act.text}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">{act.at}</span>
                            {act.txHash ? (
                              <TxHashLink hash={act.txHash} />
                            ) : (
                              <Badge tone="neutral">Menunggu</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
