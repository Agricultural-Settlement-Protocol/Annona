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
import { AlertTriangle, Banknote, ChevronRight } from "lucide-react";

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
      className={`w-full rounded-[1.75rem] border p-6 text-left shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring group ${
        isFlagged
          ? "border-amber-200 bg-amber-50 hover:border-amber-300"
          : "border-gray-100 bg-white hover:border-[#769a8e] hover:shadow-md"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-gray-900 text-base">{farmer.name}</p>
          <p className="mt-1 text-xs text-gray-500">
            {agreement.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan"} ·
            Perjanjian #{String(agreement.onchainId)}
          </p>
        </div>
        <StatusBadge status={agreement.status} />
      </div>

      <div className="mt-3">
        <ReputationBadge tier={farmer.repTier} />
      </div>

      {/* Flagged blocking notice */}
      {isFlagged && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-100/70 border border-amber-200 px-4.5 py-3 text-xs font-semibold text-amber-800">
          <AlertTriangle size={14} className="shrink-0" />
          Perlu peninjauan petugas sebelum pembayaran dapat diproses
        </div>
      )}

      {/* Volume and estimate */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3">
          <p className="text-xs text-gray-500 font-medium">Volume belum dibayar</p>
          <p className="mt-1 text-base font-bold tabular-nums text-gray-900">
            {formatKg(unsettledKg)}
          </p>
        </div>
        <div
          className={`rounded-2xl border px-4 py-3 ${
            isFlagged ? "border-amber-100 bg-amber-50/50" : "border-emerald-100 bg-emerald-50/30"
          }`}
        >
          <p className="text-xs text-gray-500 font-medium">Estimasi diterima petani</p>
          <div className="mt-1">
            <RupiahAmount
              smallest={split.netToFarmer}
              tone={isFlagged ? "default" : "positive"}
              className="text-base font-bold"
            />
          </div>
        </div>
      </div>

      {!isFlagged && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-800 transition-transform group-hover:translate-x-0.5">
          <Banknote size={14} />
          <span>Klik untuk selesaikan pembayaran</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      )}
    </button>
  );
}
