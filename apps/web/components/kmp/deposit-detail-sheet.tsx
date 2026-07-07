"use client";

/**
 * DepositDetailSheet — slide-over panel (from right) for recording and finalising
 * harvest deposits. Contains all domain logic previously in the setor page:
 *   - Staged deposit recording (setoran ke-N) via useMockTx
 *   - Live flag preview (classifyFlag)
 *   - Human-gated "Tandai Setoran Selesai" with confirm step
 *   - Force majeure (Tandai Gagal Panen) quiet path
 *   - List of all existing deposits for the agreement (with TxHashLink)
 *   - Success states with tx links and link to /kmp/pembayaran
 *
 * Accessible: backdrop click closes, ESC key closes. No em dashes in any string.
 */

import { useMockTx } from "@/components/kmp/use-mock-tx";
import { ScrollArea } from "@/components/scroll-area";
import { deliveriesOfAgreement, type MockAgreement, type MockFarmer } from "@/lib/mock-data";
import { classifyFlag } from "@annona/core";
import type { FlagReason } from "@annona/core";
import {
  Alert,
  Button,
  Input,
  ProgressBar,
  ReputationBadge,
  StatusBadge,
  TxHashLink,
} from "@annona/ui";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CloudRain,
  Scale,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Flag banner metadata — no em dashes in any string. */
function flagMeta(flag: FlagReason | null): {
  tone: "success" | "warning" | "danger";
  label: string;
  detail: string;
} {
  if (!flag || flag === "None")
    return {
      tone: "success",
      label: "Sesuai perkiraan",
      detail: "Jumlah setoran berada di atas ambang batas 98% perkiraan. Tidak ada flag.",
    };
  if (flag === "Warning")
    return {
      tone: "warning",
      label: "Di bawah perkiraan, akan ditinjau saat selesai",
      detail:
        "Setoran antara 80% dan 98% dari perkiraan. Catatan tinjauan dibuat saat setoran diselesaikan.",
    };
  if (flag === "PartialDelivery")
    return {
      tone: "warning",
      label: "Jauh di bawah perkiraan, perlu peninjauan petugas",
      detail:
        "Setoran antara 40% dan 80% dari perkiraan. Petugas lapangan perlu mengkonfirmasi sebelum proses lanjut.",
    };
  return {
    tone: "danger",
    label: "Sangat di bawah perkiraan, perlu peninjauan segera",
    detail:
      "Setoran di bawah 40% perkiraan. Flag Perlu Ditinjau ditetapkan. Petugas harus meninjau sebelum dapat diselesaikan.",
  };
}

function finalStatusLabel(flag: FlagReason): string {
  if (flag === "None") return "Disetor penuh. Siap untuk pembayaran.";
  if (flag === "Warning")
    return "Setoran di bawah perkiraan. Perjanjian ditandai Perlu Ditinjau (Warning). Pembayaran tetap dapat diproses.";
  if (flag === "PartialDelivery")
    return "Setoran jauh di bawah perkiraan. Perjanjian ditandai Perlu Ditinjau. Petugas harus meninjau sebelum pembayaran.";
  return "Setoran sangat di bawah perkiraan. Perjanjian ditandai Perlu Ditinjau. Tinjauan segera diperlukan sebelum pembayaran.";
}

interface DepositDetailSheetProps {
  agreement: MockAgreement;
  farmer: MockFarmer;
  onClose: () => void;
}

export function DepositDetailSheet({ agreement, farmer, onClose }: DepositDetailSheetProps) {
  const [volumeKg, setVolumeKg] = useState<string>("");
  const [grade, setGrade] = useState<string>("B");
  const [moisturePct, setMoisturePct] = useState<string>("22");
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showFmConfirm, setShowFmConfirm] = useState(false);
  const [fmReason, setFmReason] = useState<string>("");

  const txDeliver = useMockTx();
  const txFinalize = useMockTx();
  const txFm = useMockTx();

  // ESC closes the sheet
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const existingDeliveries = deliveriesOfAgreement(agreement.id);
  const deliveredSoFarKg = Number(agreement.deliveredVolG / 1000n);
  const inputKgNum = Number.parseFloat(volumeKg) || 0;
  const totalDeliveredKg = deliveredSoFarKg + inputKgNum;
  const ratio = inputKgNum > 0 ? totalDeliveredKg / agreement.expectedVolKg : -1;
  const flagResult: FlagReason | null = inputKgNum > 0 ? classifyFlag(ratio) : null;
  const { tone: flagTone, label: flagLabel, detail: flagDetail } = flagMeta(flagResult);
  const seqNum = existingDeliveries.length + 1;

  const formLocked = txDeliver.state === "success" || txFm.state === "success";
  const canDeliver = inputKgNum > 0 && txDeliver.state === "idle" && txFm.state !== "success";
  const canFinalize = txDeliver.state === "success" && txFinalize.state === "idle";
  const showPostDeliverOptions = txDeliver.state === "success" && txFm.state !== "success";
  const showFinalizeSuccess = txFinalize.state === "success";

  const finalizedRatio =
    inputKgNum > 0
      ? (deliveredSoFarKg + inputKgNum) / agreement.expectedVolKg
      : deliveredSoFarKg > 0
        ? deliveredSoFarKg / agreement.expectedVolKg
        : 0;
  const finalFlag = classifyFlag(finalizedRatio);

  function handleSetorLagi() {
    setVolumeKg("");
    setGrade("B");
    setMoisturePct("22");
    setShowFinalizeConfirm(false);
    txDeliver.reset();
  }

  return (
    <>
      {/* Backdrop — click closes the sheet */}
      <button
        type="button"
        aria-label="Tutup panel"
        className="fixed inset-0 z-40 cursor-default bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      {/* biome-ignore lint/a11y/useSemanticElements: native dialog UA styles conflict with the fixed slide-over layout */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detail setoran panen ${farmer.name}`}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-border bg-surface shadow-xl"
      >
        {/* Sheet header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{farmer.name}</h2>
              <ReputationBadge tier={farmer.repTier} />
              <StatusBadge status={agreement.status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {agreement.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan"} ·
              Perjanjian #{String(agreement.onchainId)} · Perkiraan{" "}
              {agreement.expectedVolKg.toLocaleString("id-ID")} kg
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <ScrollArea className="min-h-0 flex-1" viewportClassName="px-6 py-5" fade>
          <div className="space-y-6">
            {/* Overall progress */}
            <ProgressBar
              value={deliveredSoFarKg}
              max={agreement.expectedVolKg}
              label={`Sudah disetor ${deliveredSoFarKg.toLocaleString("id-ID")} kg dari ${agreement.expectedVolKg.toLocaleString("id-ID")} kg perkiraan`}
              tone="verdant"
            />

            {/* Existing deposits */}
            {existingDeliveries.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Riwayat Setoran Perjanjian Ini
                </h3>
                <div className="space-y-2">
                  {existingDeliveries.map((dlv) => (
                    <div
                      key={dlv.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted/50 px-4 py-3"
                    >
                      <div>
                        <span className="text-sm font-medium text-foreground">
                          Setoran ke-{dlv.seq}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">{dlv.deliveredAt}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="tabular-nums font-medium text-foreground">
                          {dlv.volumeKg.toLocaleString("id-ID")} kg
                        </span>
                        <span>Grade {dlv.grade}</span>
                        <span>{(dlv.moistureBps / 100).toFixed(1)}% air</span>
                        <TxHashLink hash={dlv.receiptTxHash} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finalize success panel */}
            {showFinalizeSuccess && txFinalize.txHash && (
              <div className="rounded-xl border-2 border-aqua-200 bg-aqua-50/70 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aqua-100">
                      <CheckCircle2 size={22} className="text-aqua-700" />
                    </span>
                    <div>
                      <h3 className="font-bold text-foreground">Jendela panen ditutup</h3>
                      <p className="text-sm text-muted-foreground">
                        Total setoran aktual dikunci di Stellar.
                      </p>
                    </div>
                  </div>
                  <TxHashLink hash={txFinalize.txHash} />
                </div>
                <Alert
                  tone={finalFlag === "None" ? "success" : "warning"}
                  title={
                    finalFlag === "None" ? "Perjanjian Disetor Penuh" : "Perjanjian Perlu Ditinjau"
                  }
                >
                  {finalStatusLabel(finalFlag)}
                  <span className="mt-1 block tabular-nums text-xs">
                    Total aktual: {(deliveredSoFarKg + inputKgNum).toLocaleString("id-ID")} kg dari{" "}
                    {agreement.expectedVolKg.toLocaleString("id-ID")} kg (
                    {Math.round(finalizedRatio * 100)}%)
                  </span>
                </Alert>
                <div className="flex flex-wrap gap-2">
                  <Link href="/kmp/pembayaran" onClick={onClose}>
                    <Button variant="accent" size="sm" rightIcon={<ArrowRight size={14} />}>
                      Lanjut ke Pembayaran
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Force majeure success */}
            {txFm.state === "success" && txFm.txHash && (
              <div className="rounded-xl border-2 border-red-200 bg-red-50/80 p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <CloudRain size={20} className="text-red-600" />
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">Gagal panen dikonfirmasi</p>
                    <p className="text-sm text-muted-foreground">
                      Tanpa penalti reputasi. Utang direstrukturisasi di luar sistem.
                    </p>
                  </div>
                  <TxHashLink hash={txFm.txHash} />
                </div>
              </div>
            )}

            {/* New deposit form */}
            {!showFinalizeSuccess && (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <Scale size={16} className="text-verdant-500" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Catat Setoran Baru (ke-{seqNum})
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Input
                    label="Volume Bersih (kg)"
                    type="number"
                    name="volume"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={volumeKg}
                    onChange={(e) => setVolumeKg(e.target.value)}
                    disabled={formLocked}
                    hint={`Sisa: ${(agreement.expectedVolKg - deliveredSoFarKg).toLocaleString("id-ID")} kg`}
                  />

                  <div className="w-full">
                    <label
                      htmlFor="sheet-grade"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Grade
                    </label>
                    <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-ring">
                      <select
                        id="sheet-grade"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        disabled={formLocked}
                        className="h-full w-full bg-transparent text-sm text-foreground outline-none disabled:opacity-50"
                      >
                        <option value="A">Grade A (terbaik)</option>
                        <option value="B">Grade B (standar)</option>
                        <option value="C">Grade C (di bawah standar)</option>
                      </select>
                    </div>
                  </div>

                  <Input
                    label="Kadar Air (%)"
                    type="number"
                    name="moisture"
                    min="0"
                    max="100"
                    step="0.1"
                    value={moisturePct}
                    onChange={(e) => setMoisturePct(e.target.value)}
                    disabled={formLocked}
                    hint="SOP maks 25%"
                  />
                </div>

                {Number.parseFloat(moisturePct) > 25 && (
                  <Alert tone="warning">
                    Kadar air {moisturePct}% melebihi batas SOP gabah kering panen (maks 25%).
                    Pastikan pengukuran benar sebelum mencatat setoran.
                  </Alert>
                )}

                {/* Live flag preview */}
                {flagResult !== null && inputKgNum > 0 && (
                  <div className="rounded-lg border border-border bg-surface-muted/40 p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <AlertTriangle size={14} />
                      Prakiraan flag setoran
                    </div>
                    <Alert tone={flagTone} title={flagLabel}>
                      {flagDetail}
                      <span className="mt-1 block tabular-nums text-xs">
                        Total: {totalDeliveredKg.toLocaleString("id-ID")} kg dari{" "}
                        {agreement.expectedVolKg.toLocaleString("id-ID")} kg (
                        {Math.round(ratio * 100)}%)
                      </span>
                    </Alert>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "98% ke atas: Sesuai", cls: "bg-verdant-100 text-verdant-700" },
                        {
                          label: "80 hingga 98%: Di bawah perkiraan",
                          cls: "bg-amber-100 text-amber-700",
                        },
                        {
                          label: "40 hingga 80%: Jauh di bawah",
                          cls: "bg-amber-200 text-amber-800",
                        },
                        {
                          label: "Di bawah 40%: Perlu peninjauan",
                          cls: "bg-red-100 text-red-700",
                        },
                      ].map((t) => (
                        <span
                          key={t.label}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${t.cls}`}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                    <ProgressBar
                      value={Math.min(totalDeliveredKg, agreement.expectedVolKg)}
                      max={agreement.expectedVolKg}
                      label={`${Math.round(ratio * 100)}% dari perkiraan`}
                      tone={ratio >= 0.98 ? "verdant" : "aqua"}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-4">
                  {/* Catat Setoran button */}
                  {txDeliver.state !== "success" && (
                    <div className="space-y-2">
                      <Button
                        variant="primary"
                        size="md"
                        disabled={!canDeliver || txDeliver.state !== "idle"}
                        onClick={txDeliver.run}
                        className="w-full"
                      >
                        {txDeliver.state === "signing"
                          ? "Menandatangani..."
                          : txDeliver.state === "submitting"
                            ? "Mengirim ke Stellar..."
                            : "Catat Setoran"}
                      </Button>
                      {txDeliver.state === "idle" && !canDeliver && (
                        <p className="text-xs text-muted-foreground">
                          Masukkan volume setoran untuk melanjutkan.
                        </p>
                      )}
                      {txDeliver.state === "signing" && (
                        <p className="text-xs text-muted-foreground">
                          Konfirmasi tanda tangan di Freighter. Jangan tutup jendela.
                        </p>
                      )}
                      {txDeliver.state === "submitting" && (
                        <p className="text-xs text-muted-foreground">
                          Menunggu konfirmasi Stellar. Proses 5 hingga 10 detik.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Deliver success banner */}
                  {txDeliver.state === "success" && txDeliver.txHash && (
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-verdant-200 bg-verdant-50 px-4 py-3">
                      <CheckCircle2 size={16} className="text-verdant-700" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-verdant-700">
                          Resi panen tercatat di chain
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Bukti setoran tersimpan permanen di Stellar testnet.
                        </p>
                      </div>
                      <TxHashLink hash={txDeliver.txHash} />
                    </div>
                  )}

                  {/* Post-deliver next-step options */}
                  {showPostDeliverOptions && (
                    <div className="space-y-3 border-t border-border pt-3">
                      <p className="text-sm font-medium text-foreground">
                        Setoran tercatat. Pilih langkah berikutnya:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border p-3">
                          <p className="mb-1 text-sm font-semibold text-foreground">Setor Lagi</p>
                          <p className="mb-2 text-xs text-muted-foreground">
                            Petani masih akan menyetor lagi.
                          </p>
                          <Button variant="outline" size="sm" onClick={handleSetorLagi}>
                            Setor Lagi
                          </Button>
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <p className="mb-1 text-sm font-semibold text-foreground">
                            Tandai Selesai
                          </p>
                          <p className="mb-2 text-xs text-muted-foreground">
                            Kunci jendela panen. Flag dihitung.
                          </p>
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => setShowFinalizeConfirm(true)}
                            disabled={showFinalizeConfirm}
                          >
                            Tandai Selesai
                          </Button>
                        </div>
                      </div>

                      {/* Finalize confirm panel */}
                      {showFinalizeConfirm && txFinalize.state !== "success" && (
                        <div className="rounded-lg border border-aqua-200 bg-aqua-50/60 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-aqua-800">
                              Konfirmasi Akhiri Jendela Panen
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowFinalizeConfirm(false)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X size={15} />
                            </button>
                          </div>
                          <Alert tone="info">
                            Tindakan ini menutup jendela panen. Total setoran aktual dikunci di
                            blockchain. Jika setoran di bawah 98% perkiraan, perjanjian otomatis
                            ditandai Perlu Ditinjau. Ini hanya indikator, bukan keputusan final.
                            Petugas yang memutuskan.
                          </Alert>
                          <div className="flex gap-2">
                            <Button
                              variant="accent"
                              size="sm"
                              disabled={!canFinalize}
                              onClick={txFinalize.run}
                            >
                              {txFinalize.state === "signing"
                                ? "Menandatangani..."
                                : txFinalize.state === "submitting"
                                  ? "Mengunci di Stellar..."
                                  : "Konfirmasi Selesai"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowFinalizeConfirm(false)}
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Force majeure path — only when form is idle */}
                  {txDeliver.state === "idle" && txFm.state !== "success" && (
                    <div className="border-t border-border pt-3">
                      {!showFmConfirm ? (
                        <button
                          type="button"
                          onClick={() => setShowFmConfirm(true)}
                          className="flex items-center gap-1.5 text-sm text-red-600 hover:underline focus:outline-none"
                        >
                          <CloudRain size={13} />
                          Tandai Gagal Panen
                        </button>
                      ) : (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-red-700">Konfirmasi Gagal Panen</p>
                            <button
                              type="button"
                              onClick={() => {
                                setShowFmConfirm(false);
                                setFmReason("");
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X size={15} />
                            </button>
                          </div>
                          <Alert tone="info">
                            Gagal panen dikonfirmasi tanpa penalti reputasi. Utang direstrukturisasi
                            di luar sistem sesuai prosedur koperasi.
                          </Alert>
                          <div>
                            <label
                              htmlFor="fm-reason-sheet"
                              className="mb-1.5 block text-sm font-medium text-foreground"
                            >
                              Alasan gagal panen
                            </label>
                            <textarea
                              id="fm-reason-sheet"
                              value={fmReason}
                              onChange={(e) => setFmReason(e.target.value)}
                              placeholder="Contoh: Banjir, hama, kekeringan..."
                              rows={3}
                              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="danger"
                              size="sm"
                              leftIcon={<CloudRain size={13} />}
                              disabled={!fmReason.trim() || txFm.state !== "idle"}
                              onClick={txFm.run}
                            >
                              {txFm.state === "signing"
                                ? "Menandatangani..."
                                : txFm.state === "submitting"
                                  ? "Mengirim..."
                                  : "Konfirmasi Gagal Panen"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowFmConfirm(false);
                                setFmReason("");
                              }}
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
