"use client";

/**
 * Screen: Setor Panen — per-farmer card-grid UI for recording harvest deposits.
 *
 * Layout:
 *   1. PageHeader + 4-stat summary row
 *   2. Search filter (name / kecamatan / commodity)
 *   3. "Menunggu Setoran" card grid: Active + PartiallyDelivered agreements
 *   4. "Setoran Selesai" compact muted cards: Delivered / Flagged / Settled / ForceMajeure
 *   5. DepositDetailSheet (slide-over) for the selected agreement
 *   6. "Riwayat Setoran" — always-visible panel with ScrollArea + DateRangePicker
 *
 * No agreement dropdown picker. No gradient button (that lives on /kmp/pembayaran).
 * No em dashes in any string.
 */

import { DepositDetailSheet } from "@/components/kmp/deposit-detail-sheet";
import { DepositHistoryTable } from "@/components/kmp/deposit-history-table";
import { FarmerDepositCard } from "@/components/kmp/farmer-deposit-card";
import { PageHeader } from "@/components/kmp/page-header";
import {
  MOCK_AGREEMENTS,
  depositCompletedAgreements,
  depositPendingAgreements,
  getFarmer,
  setorStats,
} from "@/lib/mock-data";
import { StatCard, StatusBadge } from "@annona/ui";
import { History, Search, Wheat } from "lucide-react";
import { useMemo, useState } from "react";

export default function SetorPage() {
  const [search, setSearch] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stats = useMemo(() => setorStats(), []);
  const pending = useMemo(() => depositPendingAgreements(), []);
  const completed = useMemo(() => depositCompletedAgreements(), []);

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

  const filteredCompleted = useMemo(
    () =>
      q
        ? completed.filter(
            ({ agreement, farmer }) =>
              farmer.name.toLowerCase().includes(q) ||
              farmer.kecamatan.toLowerCase().includes(q) ||
              agreement.commodityCode.toLowerCase().includes(q) ||
              String(agreement.onchainId).includes(q),
          )
        : completed,
    [completed, q],
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
        title="Setor Panen"
        description="Catat hasil timbang gabah atau jagung dari petani. Setiap setoran tercatat di blockchain Stellar sebagai resi panen."
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Menunggu Setoran"
          value={stats.menunggu}
          icon={<Wheat size={18} />}
          tone={stats.menunggu > 0 ? "warn" : "good"}
          hint="Perjanjian aktif dan sebagian disetor"
        />
        <StatCard
          label="Total Disetor Musim Ini"
          value={`${stats.totalSetorKg.toLocaleString("id-ID")} kg`}
          tone="neutral"
          hint="Semua setoran yang sudah dicatat"
        />
        <StatCard
          label="Setoran Selesai"
          value={stats.selesai}
          tone="good"
          hint="Jendela panen tertutup"
        />
        <StatCard
          label="Total Perjanjian Musim Ini"
          value={stats.totalAgreements}
          tone="neutral"
          hint="Semua perjanjian aktif dan selesai"
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

      {/* Menunggu Setoran section */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Menunggu Setoran</h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            {filteredPending.length} perjanjian
          </span>
        </div>

        {filteredPending.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-muted/40 px-6 py-12">
            <Wheat size={36} className="mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {q
                ? "Tidak ada perjanjian yang cocok dengan pencarian."
                : "Tidak ada perjanjian menunggu setoran."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPending.map(({ agreement, farmer }) => (
              <FarmerDepositCard
                key={agreement.id}
                agreement={agreement}
                farmer={farmer}
                onClick={() => setSelectedId(agreement.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Setoran Selesai section */}
      {filteredCompleted.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-base font-semibold text-muted-foreground">Setoran Selesai</h2>
            <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {filteredCompleted.length} perjanjian
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCompleted.map(({ agreement, farmer }) => {
              const totalKg = Number(agreement.deliveredVolG / 1000n);
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
                        {totalKg.toLocaleString("id-ID")} kg disetor
                      </p>
                    </div>
                    <StatusBadge status={agreement.status} />
                  </div>
                  {agreement.flag !== "None" && (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      Flag: {agreement.flag}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Riwayat Setoran — always visible */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <History size={16} className="text-verdant-500" />
          <h2 className="text-base font-semibold text-foreground">Riwayat Setoran</h2>
          <p className="text-sm text-muted-foreground">
            Semua setoran yang sudah dicatat, terbaru di atas.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <DepositHistoryTable />
        </div>
      </section>

      {/* Detail side sheet */}
      {selectedAgreement && selectedFarmer && (
        <DepositDetailSheet
          agreement={selectedAgreement}
          farmer={selectedFarmer}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
