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
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

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
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-label="Tutup panel"
        className="fixed inset-0 z-40 cursor-default bg-gray-950/20 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Detail setoran panen ${farmer.name}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-gray-150 bg-[#fcf9f8] rounded-l-[2rem] shadow-[0_0_50px_0_rgba(0,0,0,0.08)] overflow-hidden pointer-events-auto"
      >
        {/* Sheet header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-6 py-4.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{farmer.name}</h2>
              <ReputationBadge tier={farmer.repTier} />
              <StatusBadge status={agreement.status} />
            </div>
            <p className="mt-1 text-xs text-gray-500 font-medium">
              {agreement.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan"} ·
              Perjanjian #{String(agreement.onchainId)} · Perkiraan{" "}
              {agreement.expectedVolKg.toLocaleString("id-ID")} kg
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <ScrollArea className="min-h-0 flex-1" viewportClassName="px-6 py-6" fade>
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
                <h3 className="mb-3 text-sm font-bold text-gray-900">
                  Riwayat Setoran Perjanjian Ini
                </h3>
                <div className="space-y-2">
                  {existingDeliveries.map((dlv) => (
                    <div
                      key={dlv.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm"
                    >
                      <div>
                        <span className="text-sm font-bold text-gray-900">
                          Setoran ke-{dlv.seq}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">{dlv.deliveredAt}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
                        <span className="tabular-nums font-bold text-gray-900">
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
              <div className="rounded-2xl border border-[#c3f2f6]/60 bg-[#e7fafc]/60 p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100">
                      <CheckCircle2 size={22} className="text-[#0c6a78]" />
                    </span>
                    <div>
                      <h3 className="font-bold text-gray-900">Jendela panen ditutup</h3>
                      <p className="text-xs text-gray-550">
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
                  className="rounded-xl"
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
                    <Button variant="accent" size="sm" rightIcon={<ArrowRight size={14} />} className="rounded-full bg-[#0c6a78] hover:bg-opacity-95 text-white">
                      Lanjut ke Pembayaran
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Force majeure success */}
            {txFm.state === "success" && txFm.txHash && (
              <div className="rounded-2xl border border-red-200 bg-red-50/80 p-5 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <CloudRain size={20} className="text-red-600" />
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">Gagal panen dikonfirmasi</p>
                    <p className="text-xs text-gray-500">
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
                  <Scale size={16} className="text-emerald-700" />
                  <h3 className="text-sm font-bold text-gray-900">
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
                    className="rounded-2xl border-gray-150"
                    hint={`Sisa: ${(agreement.expectedVolKg - deliveredSoFarKg).toLocaleString("id-ID")} kg`}
                  />

                  <div className="w-full">
                    <label
                      htmlFor="sheet-grade"
                      className="mb-1.5 block text-sm font-bold text-gray-900"
                    >
                      Grade
                    </label>
                    <div className="flex h-12 items-center gap-2.5 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring transition-all">
                      <select
                        id="sheet-grade"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        disabled={formLocked}
                        className="h-full w-full bg-transparent text-sm font-semibold text-gray-900 outline-none disabled:opacity-50"
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
                    className="rounded-2xl border-gray-150"
                    hint="SOP maks 25%"
                  />
                </div>

                {Number.parseFloat(moisturePct) > 25 && (
                  <Alert tone="warning" className="rounded-xl">
                    Kadar air {moisturePct}% melebihi batas SOP gabah kering panen (maks 25%).
                    Pastikan pengukuran benar sebelum mencatat setoran.
                  </Alert>
                )}

                {/* Live flag preview */}
                {flagResult !== null && inputKgNum > 0 && (
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <AlertTriangle size={15} className="text-amber-600" />
                      Prakiraan flag setoran
                    </div>
                    <Alert tone={flagTone} title={flagLabel} className="rounded-xl">
                      {flagDetail}
                      <span className="mt-1 block tabular-nums text-xs font-semibold">
                        Total: {totalDeliveredKg.toLocaleString("id-ID")} kg dari{" "}
                        {agreement.expectedVolKg.toLocaleString("id-ID")} kg (
                        {Math.round(ratio * 100)}%)
                      </span>
                    </Alert>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "98% ke atas: Sesuai", cls: "bg-[#ebf5e9] text-[#0c7a48] border border-[#d2f9de]" },
                        {
                          label: "80 hingga 98%: Di bawah perkiraan",
                          cls: "bg-amber-50 text-amber-800 border border-amber-200/50",
                        },
                        {
                          label: "40 hingga 80%: Jauh di bawah",
                          cls: "bg-amber-100 text-amber-900 border border-amber-300/50",
                        },
                        {
                          label: "Di bawah 40%: Perlu peninjauan",
                          cls: "bg-red-50 text-red-700 border border-red-200/55",
                        },
                      ].map((t) => (
                        <span
                          key={t.label}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${t.cls}`}
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
                        type="button"
                        variant="primary"
                        size="md"
                        disabled={!canDeliver || txDeliver.state !== "idle"}
                        onClick={txDeliver.run}
                        className="w-full rounded-full bg-primary-dark text-white hover:bg-opacity-95"
                      >
                        {txDeliver.state === "signing"
                          ? "Menandatangani..."
                          : txDeliver.state === "submitting"
                            ? "Mengirim ke Stellar..."
                            : "Catat Setoran"}
                      </Button>
                      {txDeliver.state === "idle" && !canDeliver && (
                        <p className="text-xs text-gray-500 text-center font-medium">
                          Masukkan volume setoran untuk melanjutkan.
                        </p>
                      )}
                      {txDeliver.state === "signing" && (
                        <p className="text-xs text-amber-700 text-center font-semibold">
                          Konfirmasi tanda tangan di Freighter. Jangan tutup jendela.
                        </p>
                      )}
                      {txDeliver.state === "submitting" && (
                        <p className="text-xs text-emerald-800 text-center font-semibold">
                          Menunggu konfirmasi Stellar. Proses 5 hingga 10 detik.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Deliver success banner */}
                  {txDeliver.state === "success" && txDeliver.txHash && (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#d2f9de] bg-[#ebf5e9] px-5 py-4 shadow-sm">
                      <CheckCircle2 size={16} className="text-[#0c7a48]" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">
                          Resi panen tercatat di chain
                        </p>
                        <p className="text-xs text-gray-500 font-medium">
                          Bukti setoran tersimpan permanen di Stellar testnet.
                        </p>
                      </div>
                      <TxHashLink hash={txDeliver.txHash} />
                    </div>
                  )}

                  {/* Post-deliver next-step options */}
                  {showPostDeliverOptions && (
                    <div className="space-y-3 border-t border-gray-100 pt-4">
                      <p className="text-sm font-bold text-gray-900">
                        Setoran tercatat. Pilih langkah berikutnya:
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                          <p className="mb-1 text-sm font-bold text-gray-900">Setor Lagi</p>
                          <p className="mb-3 text-xs text-gray-500 font-medium leading-relaxed">
                            Petani masih akan menyetor lagi.
                          </p>
                          <Button type="button" variant="outline" size="sm" onClick={handleSetorLagi} className="rounded-full">
                            Setor Lagi
                          </Button>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                          <p className="mb-1 text-sm font-bold text-gray-900">
                            Tandai Selesai
                          </p>
                          <p className="mb-3 text-xs text-gray-500 font-medium leading-relaxed">
                            Kunci jendela panen. Flag dihitung.
                          </p>
                          <Button
                            type="button"
                            variant="accent"
                            size="sm"
                            onClick={() => setShowFinalizeConfirm(true)}
                            disabled={showFinalizeConfirm}
                            className="rounded-full bg-[#0c6a78] hover:bg-opacity-95 text-white"
                          >
                            Tandai Selesai
                          </Button>
                        </div>
                      </div>

                      {/* Finalize confirm panel */}
                      {showFinalizeConfirm && txFinalize.state !== "success" && (
                        <div className="rounded-2xl border border-[#c3f2f6] bg-[#e7fafc]/60 p-5 space-y-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-[#0c6a78]">
                              Konfirmasi Akhiri Jendela Panen
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowFinalizeConfirm(false)}
                              className="text-gray-400 hover:text-gray-800 p-1"
                            >
                              <X size={15} />
                            </button>
                          </div>
                          <Alert tone="info" className="rounded-xl">
                            Tindakan ini menutup jendela panen. Total setoran aktual dikunci di
                            blockchain. Jika setoran di bawah 98% perkiraan, perjanjian otomatis
                            ditandai Perlu Ditinjau.
                          </Alert>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="accent"
                              size="sm"
                              disabled={!canFinalize}
                              onClick={txFinalize.run}
                              className="rounded-full bg-[#0c6a78] text-white"
                            >
                              {txFinalize.state === "signing"
                                ? "Menandatangani..."
                                : txFinalize.state === "submitting"
                                  ? "Mengunci di Stellar..."
                                  : "Konfirmasi Selesai"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowFinalizeConfirm(false)}
                              className="rounded-full"
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
                    <div className="border-t border-gray-100 pt-4">
                      {!showFmConfirm ? (
                        <button
                          type="button"
                          onClick={() => setShowFmConfirm(true)}
                          className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-800 focus:outline-none transition-colors"
                        >
                          <CloudRain size={13} />
                          Tandai Gagal Panen
                        </button>
                      ) : (
                        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5 space-y-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-red-700">Konfirmasi Gagal Panen</p>
                            <button
                              type="button"
                              onClick={() => {
                                setShowFmConfirm(false);
                                setFmReason("");
                              }}
                              className="text-gray-400 hover:text-gray-800 p-1"
                            >
                              <X size={15} />
                            </button>
                          </div>
                          <Alert tone="info" className="rounded-xl">
                            Gagal panen dikonfirmasi tanpa penalti reputasi. Utang direstrukturisasi
                            di luar sistem sesuai prosedur koperasi.
                          </Alert>
                          <div>
                            <label
                              htmlFor="fm-reason-sheet"
                              className="mb-2 block text-sm font-bold text-gray-900"
                            >
                              Alasan gagal panen
                            </label>
                            <textarea
                              id="fm-reason-sheet"
                              value={fmReason}
                              onChange={(e) => setFmReason(e.target.value)}
                              placeholder="Contoh: Banjir, hama, kekeringan..."
                              rows={3}
                              className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-ring transition-all"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              leftIcon={<CloudRain size={13} />}
                              disabled={!fmReason.trim() || txFm.state !== "idle"}
                              onClick={txFm.run}
                              className="rounded-full bg-red-600 hover:bg-opacity-95 text-white"
                            >
                              {txFm.state === "signing"
                                ? "Menandatangani..."
                                : txFm.state === "submitting"
                                  ? "Mengirim..."
                                  : "Konfirmasi Gagal Panen"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowFmConfirm(false);
                                setFmReason("");
                              }}
                              className="rounded-full"
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
      </motion.div>
    </>
  );
}
