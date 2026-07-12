"use client";

/**
 * Screen H (Supplier): Asisten AI multi-sesi.
 *
 * Grounding snapshot: serialised protocol metrics (no raw bigint through JSON).
 * Scope: residu, dispatch, commercial operations, coop health.
 */

import { AiChat, type GroundingSnapshot } from "@/components/oversight/ai-chat";
import { OversightPageHeader } from "@/components/oversight/page-header";
import {
  MOCK_COOP_PROFILES,
  OVERSIGHT_RESIDU_ROWS,
  buildDispatchRequests,
  protocolMetrics,
} from "@/lib/oversight-data";
import { formatRupiah } from "@annona/core";
import { Alert, Card, CardContent } from "@annona/ui";
import { useMemo } from "react";

/** Build grounding snapshot for Supplier role.
 *  All bigints serialised as formatted strings. Never raw bigint to JSON. */
function buildSupplierSnapshot(): GroundingSnapshot {
  const metrics = protocolMetrics();
  const pendingRequests = buildDispatchRequests().filter(
    (r) => r.status === "Menunggu",
  );

  return {
    ringkasan_protokol: {
      total_kmp: MOCK_COOP_PROFILES.length,
      total_perjanjian_aktif: metrics.totalActiveAgreements,
      settlement_rate_keseluruhan: `${metrics.overallSettlementRatePct}%`,
      kepatuhan_residu_keseluruhan: `${metrics.overallResiduCompliancePct}%`,
      total_diselesaikan: formatRupiah(metrics.totalSettledRp),
      total_produksi_kg: `${metrics.totalProducedKg.toLocaleString("id-ID")} kg`,
      total_flag_perlu_ditinjau: metrics.totalFlags,
      kmp_dibekukan: metrics.frozenCoops,
      kmp_bermasalah: metrics.bermasalahCoops,
    },
    residu_supplier: {
      total_belum_diterima: formatRupiah(metrics.residuPending),
      total_menunggu_verifikasi: formatRupiah(metrics.residuRemitted),
      total_terverifikasi: formatRupiah(metrics.residuCleared),
      antrean_dispatch_menunggu: pendingRequests.length,
      total_nilai_antrean: formatRupiah(
        pendingRequests.reduce((s, r) => s + r.grandTotal, 0n),
      ),
    },
    per_kmp: MOCK_COOP_PROFILES.map((c) => ({
      nama: c.name,
      kabupaten: c.kabupaten,
      provinsi: c.provinsi,
      settlement_rate: `${c.settlementRatePct}%`,
      kepatuhan_residu: `${c.residuCompliancePct}%`,
      residu_pending: formatRupiah(c.residuPending),
      residu_menunggu_verifikasi: formatRupiah(c.residuRemitted),
      residu_terverifikasi: formatRupiah(c.residuCleared),
      perjanjian_aktif: c.activeAgreementCount,
      flag_perlu_ditinjau: c.flagQueue,
      dibekukan: c.reputation.frozen,
    })),
    residu_baris: OVERSIGHT_RESIDU_ROWS.filter(
      (r) => r.status === "Pending" || r.status === "Remitted",
    ).map((r) => ({
      kmp: r.coopName,
      petani: r.farmerName,
      jumlah: formatRupiah(r.principalAmount),
      status: r.status,
      ref_bank: r.bankRef ?? "belum ada",
      tgl_remit: r.remittedAt ?? "belum remit",
    })),
  };
}

export default function SupplierAiPage() {
  const snapshot = useMemo(() => buildSupplierSnapshot(), []);

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <OversightPageHeader
        title="Asisten AI Supplier"
        description="Tanya tentang data residu, dispatch, dan kinerja koperasi. Percakapan disimpan di perangkat Anda. AI hanya membaca, tidak bisa mengubah data."
      />

      <Alert tone="info" title="Keterbatasan AI">
        <span className="text-sm">
          Asisten ini menjawab berdasarkan snapshot data saat halaman dimuat.
          Untuk data terkini, muat ulang halaman. AI tidak dapat melakukan
          tindakan apapun di blockchain.
        </span>
      </Alert>

      <Card className="flex min-h-0 flex-1 overflow-hidden">
        <CardContent className="min-h-0 flex-1 p-0">
          <AiChat viewRole="supplier" groundingSnapshot={snapshot} />
        </CardContent>
      </Card>
    </div>
  );
}
