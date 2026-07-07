"use client";

/**
 * Screen: Pembayaran — per-farmer card-grid UI for settling harvest payments.
 *
 * Layout:
 *   1. PageHeader + 3-stat summary row
 *   2. Search filter (name / commodity / kecamatan)
 *   3. "Menunggu Pembayaran" card grid: Delivered / PartiallyDelivered / Flagged
 *      with unsettled delivered volume. Flagged cards show blocked state.
 *   4. "Sudah Dibayar / Lunas" compact muted cards: Settled agreements with
 *      residu status badge so the officer sees remittance progress at a glance.
 *   5. PaymentDetailSheet (slide-over) for the selected agreement.
 *      Contains: SplitSettlementCard, gradient settle button (THE one gradient
 *      use), success panel, residu status, payment history for that agreement.
 *   6. "Riwayat Pembayaran" — always-visible panel with ScrollArea + DateRangePicker.
 *
 * The gradient "Selesaikan Pembayaran" button lives ONLY inside PaymentDetailSheet.
 * No em dashes in any string.
 */

import { FarmerPaymentCard } from "@/components/kmp/farmer-payment-card";
import { PageHeader } from "@/components/kmp/page-header";
import { PaymentDetailSheet } from "@/components/kmp/payment-detail-sheet";
import { PaymentHistoryTable } from "@/components/kmp/payment-history-table";
import {
  MOCK_AGREEMENTS,
  getFarmer,
  kmpIncomeStats,
  paymentPendingAgreements,
  paymentSettledAgreements,
  pembayaranStats,
} from "@/lib/mock-data";
import { Banknote, History, Search, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { ResiduStatusBadge, RupiahAmount, StatCard, StatusBadge } from "@annona/ui";

export default function PembayaranPage() {
  const [search, setSearch] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stats = useMemo(() => pembayaranStats(), []);
  const income = useMemo(() => kmpIncomeStats(), []);
  const pending = useMemo(() => paymentPendingAgreements(), []);
  const settled = useMemo(() => paymentSettledAgreements(), []);

  const q = search.trim().toLowerCase();

  const filteredPending = useMemo(
    () =>
      q
        ? pending.filter(
            ({ agreement, farmer }) =>
              farmer.name.toLowerCase().includes(q) ||
              farmer.kecamatan.toLowerCase().includes(q) ||
              agreement.commodityCode.toLowerCase().includes(q) ||
              String(agreement.onchainId).includes(q),
          )
        : pending,
    [pending, q],
  );

  const filteredSettled = useMemo(
    () =>
      q
        ? settled.filter(
            ({ agreement, farmer }) =>
              farmer.name.toLowerCase().includes(q) ||
              farmer.kecamatan.toLowerCase().includes(q) ||
              agreement.commodityCode.toLowerCase().includes(q) ||
              String(agreement.onchainId).includes(q),
          )
        : settled,
    [settled, q],
  );

  const selectedAgreement = selectedId
    ? (MOCK_AGREEMENTS.find((a) => a.id === selectedId) ?? null)
    : null;
  const selectedFarmer = selectedAgreement
    ? (getFarmer(selectedAgreement.farmerId) ?? null)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran"
        description="Selesaikan pembayaran panen dengan split tiga arah: petani terima tunai, residu pokok Agrinas dikunci di kas, margin KMP tercatat."
      />

      {/* KMP income summary — KMP's own earnings (not Agrinas residu) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Margin Saprotan"
          value={<RupiahAmount smallest={income.totalMarginSaprotan} className="text-3xl" />}
          icon={<TrendingUp size={18} />}
          tone="good"
          hint="Markup KMP atas harga pokok Agrinas, dari semua perjanjian yang sudah selesai"
        />
        <StatCard
          label="Total Biaya Tangani"
          value={<RupiahAmount smallest={income.totalBiayaTangani} className="text-3xl" />}
          icon={<TrendingUp size={18} />}
          tone="good"
          hint="Biaya penanganan panen yang dikumpulkan dari semua penyelesaian"
        />
        <StatCard
          label="Estimasi Pendapatan KMP"
          value={<RupiahAmount smallest={income.estimasiPendapatanKMP} className="text-3xl" />}
          icon={<TrendingUp size={18} />}
          tone="good"
          hint="Total margin saprotan ditambah biaya tangani (bukan termasuk residu Agrinas)"
        />
      </div>

      {/* Settlement status stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Belum Dibayar"
          value={<RupiahAmount smallest={stats.totalBelumDibayarRp} className="text-3xl" />}
          icon={<Banknote size={18} />}
          tone={stats.totalBelumDibayarRp > 0n ? "warn" : "good"}
          hint="Estimasi nilai panen yang menunggu pembayaran"
        />
        <StatCard
          label="Residu Pending ke Agrinas"
          value={<RupiahAmount smallest={stats.residuPending} className="text-3xl" />}
          tone={stats.residuPending > 0n ? "warn" : "good"}
          hint="Pokok Agrinas yang belum diremitkan"
        />
        <StatCard
          label="Perjanjian Lunas"
          value={stats.sudahLunas}
          tone="good"
          hint="Perjanjian yang sudah dibayar penuh musim ini"
        />
      </div>

      {/* Search */}
      <div className="flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Search size={16} className="shrink-0 text-muted-foreground" />
        <input
          type="search"
          placeholder="Cari petani, kecamatan, atau komoditas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-full w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Menunggu Pembayaran section */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Menunggu Pembayaran</h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            {filteredPending.length} perjanjian
          </span>
        </div>

        {filteredPending.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-muted/40 px-6 py-12">
            <Banknote size={36} className="mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {q
                ? "Tidak ada perjanjian yang cocok dengan pencarian."
                : "Tidak ada perjanjian menunggu pembayaran saat ini."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPending.map(({ agreement, farmer }) => (
              <FarmerPaymentCard
                key={agreement.id}
                agreement={agreement}
                farmer={farmer}
                onClick={() => setSelectedId(agreement.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sudah Dibayar / Lunas section */}
      {filteredSettled.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-base font-semibold text-muted-foreground">
              Sudah Dibayar / Lunas
            </h2>
            <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {filteredSettled.length} perjanjian
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSettled.map(({ agreement, farmer, residu }) => {
              const settledKg = Number(agreement.settledVolG / 1000n);
              return (
                <div
                  key={agreement.id}
                  className="rounded-xl border border-border bg-surface-muted/40 px-4 py-3 opacity-75"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {farmer.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Perjanjian #{String(agreement.onchainId)} ·{" "}
                        {agreement.commodityCode === "GABAH" ? "Gabah" : "Jagung"} ·{" "}
                        {settledKg.toLocaleString("id-ID")} kg dibayar
                      </p>
                    </div>
                    <StatusBadge status={agreement.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Jumlah dibayar</p>
                      <RupiahAmount
                        smallest={agreement.paidToFarmer}
                        tone="positive"
                        className="text-sm"
                      />
                    </div>
                    {residu && (
                      <div className="text-right">
                        <p className="mb-1 text-xs text-muted-foreground">Residu Agrinas</p>
                        <ResiduStatusBadge status={residu.status} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Riwayat Pembayaran — always visible */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <History size={16} className="text-aqua-500" />
          <h2 className="text-base font-semibold text-foreground">Riwayat Pembayaran</h2>
          <p className="text-sm text-muted-foreground">
            Semua pembayaran yang sudah diselesaikan, terbaru di atas.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <PaymentHistoryTable />
        </div>
      </section>

      {/* Detail side sheet */}
      {selectedAgreement && selectedFarmer && (
        <PaymentDetailSheet
          agreement={selectedAgreement}
          farmer={selectedFarmer}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
