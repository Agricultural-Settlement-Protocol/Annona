"use client";

/**
 * FarmerPaymentCard — one card per agreement in the payment queue.
 * Shows unsettled volume, net-to-farmer estimate, and status.
 * Flagged agreements render a blocked state with a warning.
 * Click opens PaymentDetailSheet.
 */

import { type MockAgreement, type MockFarmer, formatKg } from "@/lib/mock-data";
import { computeSplitSettlement, gramsToKg } from "@annona/core";
import { ReputationBadge, RupiahAmount, StatusBadge } from "@annona/ui";
import { AlertTriangle, Banknote } from "lucide-react";

interface FarmerPaymentCardProps {
  agreement: MockAgreement;
  farmer: MockFarmer;
  onClick: () => void;
}

export function FarmerPaymentCard({ agreement, farmer, onClick }: FarmerPaymentCardProps) {
  const isFlagged = agreement.status === "Flagged";
  const unsettledKg = gramsToKg(agreement.deliveredVolG - agreement.settledVolG);

  const split = computeSplitSettlement({
    deliveredVolG: agreement.deliveredVolG,
    settledVolG: agreement.settledVolG,
    hppPerKg: agreement.hppPerKg,
    remainingDebt: agreement.remainingDebt,
    hppHandlingFeeBps: agreement.hppHandlingFeeBps,
    basePriceAgrinas: agreement.basePriceAgrinas,
    inputDebt: agreement.inputDebt,
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-5 text-left shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
        isFlagged
          ? "border-amber-200 bg-amber-50 hover:border-amber-300"
          : "border-border bg-surface hover:border-aqua-300 hover:shadow-md"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{farmer.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {agreement.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan"} ·
            Perjanjian #{String(agreement.onchainId)}
          </p>
        </div>
        <StatusBadge status={agreement.status} />
      </div>

      <div className="mt-2">
        <ReputationBadge tier={farmer.repTier} />
      </div>

      {/* Flagged blocking notice */}
      {isFlagged && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800">
          <AlertTriangle size={13} className="shrink-0" />
          Perlu peninjauan petugas sebelum pembayaran dapat diproses
        </div>
      )}

      {/* Volume and estimate */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface-muted/60 px-3 py-2">
          <p className="text-xs text-muted-foreground">Volume belum dibayar</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">
            {formatKg(unsettledKg)}
          </p>
        </div>
        <div
          className={`rounded-lg border px-3 py-2 ${
            isFlagged ? "border-amber-200 bg-amber-50" : "border-verdant-200 bg-verdant-50"
          }`}
        >
          <p className="text-xs text-muted-foreground">Estimasi diterima petani</p>
          <div className="mt-0.5">
            <RupiahAmount
              smallest={split.netToFarmer}
              tone={isFlagged ? "default" : "positive"}
              className="text-base"
            />
          </div>
        </div>
      </div>

      {!isFlagged && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-aqua-700">
          <Banknote size={12} />
          Klik untuk selesaikan pembayaran
        </div>
      )}
    </button>
  );
}
