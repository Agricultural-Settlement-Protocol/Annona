"use client";

/**
 * Screen H (Pemerintah): Asisten AI multi-sesi, tampilan hanya baca.
 *
 * Read-only grounding: regional production, leaderboard, flag queue, macro metrics.
 * Scope: produksi, kinerja koperasi, flag queue, kebijakan.
 */

import { AiChat, type GroundingSnapshot } from "@/components/oversight/ai-chat";
import { OversightPageHeader } from "@/components/oversight/page-header";
import {
  COMMODITY_DIST,
  FLAG_QUEUE_ITEMS,
  MOCK_COOP_PROFILES,
  buildRegionalData,
  protocolMetrics,
} from "@/lib/oversight-data";
import { formatRupiah } from "@annona/core";
import { Alert, Card, CardContent } from "@annona/ui";
import { useMemo } from "react";

function buildPemerintahSnapshot(): GroundingSnapshot {
  const metrics = protocolMetrics();
  const regional = buildRegionalData();

  const totalSuccessHarvest = regional.reduce(
    (s, r) => s + r.successfulHarvestCount,
    0,
  );
  const totalFailedHarvest = regional.reduce(
    (s, r) => s + r.failedHarvestCount,
    0,
  );
  const successRatePct =
    totalSuccessHarvest + totalFailedHarvest === 0
      ? 0
      : Math.round(
          (totalSuccessHarvest / (totalSuccessHarvest + totalFailedHarvest)) *
            100,
        );

  return {
    ringkasan_makro: {
      total_kmp: MOCK_COOP_PROFILES.length,
      total_produksi_kg: `${metrics.totalProducedKg.toLocaleString("id-ID")} kg`,
      total_diselesaikan: formatRupiah(metrics.totalSettledRp),
      settlement_rate_keseluruhan: `${metrics.overallSettlementRatePct}%`,
      rasio_panen_sukses: `${successRatePct}%`,
      total_panen_sukses: totalSuccessHarvest,
      total_gagal_panen: totalFailedHarvest,
      total_flag_perlu_ditinjau: metrics.totalFlags,
      kmp_bermasalah: metrics.bermasalahCoops,
      kmp_dibekukan: metrics.frozenCoops,
    },
    kinerja_per_kmp: MOCK_COOP_PROFILES.map((c) => ({
      nama: c.name,
      kabupaten: c.kabupaten,
      provinsi: c.provinsi,
      settlement_rate: `${c.settlementRatePct}%`,
      kepatuhan_residu: `${c.residuCompliancePct}%`,
      perjanjian_aktif: c.activeAgreementCount,
      petani_aktif: c.activeFarmerCount,
      total_produksi_kg: `${c.totalProducedKg.toLocaleString("id-ID")} kg`,
      total_diselesaikan: formatRupiah(c.totalSettledRp),
      flag_perlu_ditinjau: c.flagQueue,
      status_frozen: c.reputation.frozen ? "Ya, dibekukan" : "Tidak",
    })),
    produktivitas_regional: regional.map((r) => ({
      kabupaten: r.kabupaten,
      provinsi: r.provinsi,
      petani_aktif: r.activeFarmers,
      total_produksi_kg: `${r.totalKg.toLocaleString("id-ID")} kg`,
      rata_rata_yield: `${r.avgYieldTPerHa} t/ha`,
      sumber: "BPS/KATAM Balitbangtan",
      settlement_rate: `${r.settlementRate}%`,
      panen_sukses: r.successfulHarvestCount,
      gagal_panen: r.failedHarvestCount,
    })),
    distribusi_komoditas: COMMODITY_DIST.map((c) => ({
      komoditas: c.name,
      total_kg: `${c.kgTotal.toLocaleString("id-ID")} kg`,
      persentase: `${c.pct}%`,
    })),
    antrean_flag: FLAG_QUEUE_ITEMS.map((f) => ({
      kmp: f.coopName,
      petani: f.farmerName,
      alasan: f.reason,
      setoran_aktual_kg: f.deliveredKg,
      estimasi_kg: f.expectedKg,
      persen_terpenuhi: `${f.deliveredPct}%`,
      tanggal_flag: f.flaggedAt,
    })),
  };
}

export default function PemerintahAiPage() {
  const snapshot = useMemo(() => buildPemerintahSnapshot(), []);

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <OversightPageHeader
        title="Asisten AI Pengawasan"
        description="Analisis data produksi, kinerja koperasi, dan flag. Percakapan disimpan di perangkat Anda. Tampilan hanya baca."
      />

      <Alert tone="info" title="AI hanya membaca data, tidak bisa menulis">
        <span className="text-sm">
          Asisten ini tidak dapat melakukan tindakan apapun di blockchain. Semua
          jawaban berdasarkan snapshot data saat halaman dimuat. Flag yang
          disebutkan AI adalah indikator untuk peninjauan manusia, bukan
          tuduhan otomatis.
        </span>
      </Alert>

      <Card className="flex min-h-0 flex-1 overflow-hidden">
        <CardContent className="min-h-0 flex-1 p-0">
          <AiChat viewRole="pemerintah" groundingSnapshot={snapshot} />
        </CardContent>
      </Card>
    </div>
  );
}
