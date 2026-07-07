"use client";

/**
 * Screen H: Asisten AI (Agrinas view).
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
import { Bot, Info } from "lucide-react";
import { useMemo } from "react";

/** Build grounding snapshot for Agrinas role.
 *  All bigints serialised as formatted strings. Never raw bigint to JSON. */
function buildAgrinasSnapshot(): GroundingSnapshot {
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
    residu_agrinas: {
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

export default function AgrinasAiPage() {
  const snapshot = useMemo(() => buildAgrinasSnapshot(), []);

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-6">
      <OversightPageHeader
        title="Asisten AI Agrinas"
        description="Tanya apa saja tentang data residu, dispatch, dan kinerja koperasi. AI hanya membaca, tidak bisa mengubah data."
      />

      <Alert tone="info" title="Keterbatasan AI">
        <span className="text-sm">
          Asisten ini menjawab berdasarkan snapshot data saat halaman ini dimuat.
          Untuk data terkini, muat ulang halaman. AI tidak bisa melakukan tindakan
          apa pun di blockchain.
        </span>
      </Alert>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-aqua-100">
            <Bot size={16} className="text-aqua-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Asisten AI Agrinas</p>
            <p className="text-xs text-muted-foreground">
              Lingkup: residu, dispatch, kinerja koperasi
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-aqua-50 px-2 py-0.5 text-[10px] font-semibold text-aqua-700">
            <Info size={10} />
            Hanya Baca Data
          </span>
        </div>
        <CardContent className="min-h-0 flex-1 p-0">
          <AiChat viewRole="agrinas" groundingSnapshot={snapshot} />
        </CardContent>
      </Card>
    </div>
  );
}
