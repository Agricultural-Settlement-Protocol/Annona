"use client";

/**
 * FarmerDepositCard — one card per agreement waiting for harvest deposits.
 * Shows agreement progress, next deposit sequence number, and expected harvest date.
 * Click opens the DepositDetailSheet.
 */

import { deliveriesOfAgreement, type MockAgreement, type MockFarmer } from "@/lib/mock-data";
import { ProgressBar, ReputationBadge, StatusBadge } from "@annona/ui";
import { CalendarDays, Wheat, ChevronRight } from "lucide-react";

interface FarmerDepositCardProps {
  agreement: MockAgreement;
  farmer: MockFarmer;
  onClick: () => void;
}

export function FarmerDepositCard({ agreement, farmer, onClick }: FarmerDepositCardProps) {
  const existingDeliveries = deliveriesOfAgreement(agreement.id);
  const deliveredKg = Number(agreement.deliveredVolG / 1000n);
  const seqNext = existingDeliveries.length + 1;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[1.75rem] border border-gray-100 bg-white p-6 text-left shadow-sm transition-all hover:border-[#769a8e] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring group"
    >
      {/* Header row */}
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

      {/* Reputation */}
      <div className="mt-3">
        <ReputationBadge tier={farmer.repTier} />
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <ProgressBar
          value={deliveredKg}
          max={agreement.expectedVolKg}
          label={`${deliveredKg.toLocaleString("id-ID")} kg disetor dari ${agreement.expectedVolKg.toLocaleString("id-ID")} kg perkiraan`}
          tone="verdant"
        />
      </div>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 font-medium">
        <span className="flex items-center gap-1">
          <Wheat size={13} className="text-emerald-700" />
          Setoran ke-{seqNext}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays size={13} className="text-[#0c6a78]" />
          Panen: {agreement.expectedHarvestDate}
        </span>
        {farmer.kecamatan && (
          <span className="text-gray-400 font-normal">{farmer.kecamatan}</span>
        )}
      </div>

      <p className="mt-4 text-xs font-semibold text-emerald-800 flex items-center gap-1 transition-transform group-hover:translate-x-0.5">
        Klik untuk catat setoran
        <ChevronRight className="w-3.5 h-3.5" />
      </p>
    </button>
  );
}
