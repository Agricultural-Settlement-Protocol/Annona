"use client";

/**
 * FarmerDepositCard — one card per agreement waiting for harvest deposits.
 * Shows agreement progress, next deposit sequence number, and expected harvest date.
 * Click opens the DepositDetailSheet.
 */

import { deliveriesOfAgreement, type MockAgreement, type MockFarmer } from "@/lib/mock-data";
import { ProgressBar, ReputationBadge, StatusBadge } from "@annona/ui";
import { CalendarDays, Wheat } from "lucide-react";

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
      className="w-full rounded-xl border border-border bg-surface p-5 text-left shadow-sm transition-all hover:border-verdant-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {/* Header row */}
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
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Wheat size={12} className="text-verdant-500" />
          Setoran ke-{seqNext}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays size={12} className="text-aqua-500" />
          Panen: {agreement.expectedHarvestDate}
        </span>
        {farmer.kecamatan && (
          <span className="text-muted-foreground">{farmer.kecamatan}</span>
        )}
      </div>

      <p className="mt-3 text-xs font-medium text-primary">Klik untuk catat setoran</p>
    </button>
  );
}
