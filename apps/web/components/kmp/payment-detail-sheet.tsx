"use client";

/**
 * PaymentDetailSheet — slide-over panel for the Pembayaran page.
 * Shows:
 *   - SplitSettlementCard preview (gross / handling / debt netted / net to farmer)
 *   - Gradient "Selesaikan Pembayaran" button (THE ONE gradient button use across
 *     all settlement pages) via useMockTx
 *   - Success panel with tx hash and link to /kmp/residu
 *   - Residu status (ResiduStatusBadge + explanation + bank ref)
 *   - Payment history rows for the selected agreement
 *
 * Flagged agreements show a blocked state — officer must review before settling.
 * Accessible: backdrop click and ESC key close the sheet. No em dashes in any string.
 */

import { useMockTx } from "@/components/kmp/use-mock-tx";
import { ScrollArea } from "@/components/scroll-area";
import {
  type MockAgreement,
  type MockFarmer,
  formatKg,
  residuOfAgreement,
  settlementsOfAgreement,
} from "@/lib/mock-data";
import { computeSplitSettlement, formatRupiah, gramsToKg } from "@annona/core";
import type { ResiduStatus } from "@annona/core";
import {
  Alert,
  Button,
  ReputationBadge,
  ResiduStatusBadge,
  RupiahAmount,
  SplitSettlementCard,
  StatusBadge,
  TxHashLink,
} from "@annona/ui";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Landmark,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

const RESIDU_EXPLANATION: Record<ResiduStatus, string> = {
  Pending:
    "Residu belum disetor ke Agrinas. Segera remitkan ke rekening Agrinas setelah pembayaran tunai.",
  Remitted: "Residu sudah disetor ke rekening Agrinas, menunggu verifikasi konfirmasi.",
  Cleared: "Residu terverifikasi penuh oleh Agrinas. Kewajiban ini selesai.",
  Disputed: "Residu bermasalah. Hubungi Agrinas untuk klarifikasi dan penyelesaian.",
};

interface PaymentDetailSheetProps {
  agreement: MockAgreement;
  farmer: MockFarmer;
  onClose: () => void;
}

export function PaymentDetailSheet({ agreement, farmer, onClose }: PaymentDetailSheetProps) {
  const txSettle = useMockTx();
  const isFlagged = agreement.status === "Flagged";
  const isStaged = agreement.status === "PartiallyDelivered";

  // ESC closes the sheet
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const split = computeSplitSettlement({
    deliveredVolG: agreement.deliveredVolG,
    settledVolG: agreement.settledVolG,
    hppPerKg: agreement.hppPerKg,
    remainingDebt: agreement.remainingDebt,
    hppHandlingFeeBps: agreement.hppHandlingFeeBps,
    basePriceAgrinas: agreement.basePriceAgrinas,
    inputDebt: agreement.inputDebt,
  });

  const unsettledKg = gramsToKg(agreement.deliveredVolG - agreement.settledVolG);
  const canSettle = !isFlagged && txSettle.state === "idle";
  const showLunas = txSettle.state === "success" && !!txSettle.txHash;
  const residu = residuOfAgreement(agreement.id);
  const payments = settlementsOfAgreement(agreement.id);

  return (
    <>
      {/* Backdrop */}
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
        aria-label={`Detail pembayaran ${farmer.name}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-gray-150 bg-[#fcf9f8] rounded-l-[2rem] shadow-[0_0_50px_0_rgba(0,0,0,0.08)] overflow-hidden pointer-events-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-6 py-4.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{farmer.name}</h2>
              <ReputationBadge tier={farmer.repTier} />
              <StatusBadge status={agreement.status} />
            </div>
            <p className="mt-1 text-xs text-gray-500 font-medium">
              {agreement.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan"} ·
              Perjanjian #{String(agreement.onchainId)} · {formatKg(unsettledKg)} belum dibayar
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
            {/* Flagged blocking notice */}
            {isFlagged && (
              <Alert tone="warning" title="Perjanjian Perlu Ditinjau" className="rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>
                    Perjanjian ini ditandai Perlu Ditinjau. Petugas harus menyelesaikan tinjauan
                    sebelum pembayaran dapat diproses. Pembayaran diblokir secara otomatis.
                  </span>
                </div>
              </Alert>
            )}

            {/* Staged payment notice */}
            {isStaged && !isFlagged && (
              <Alert tone="info" className="rounded-xl">
                Ini adalah pembayaran bertahap. Pembayaran dilakukan untuk {formatKg(unsettledKg)}{" "}
                yang sudah disetor. Utang dicicil terlebih dulu dari setiap tahap pembayaran.
              </Alert>
            )}

            {/* Split settlement preview */}
            <div>
              <h3 className="mb-3 text-sm font-bold text-gray-900">
                Prakiraan Pembagian Kas
              </h3>
              <SplitSettlementCard
                gross={split.grossSmallest}
                handlingCut={split.handlingCut}
                netToFarmer={split.netToFarmer}
                residuPrincipal={split.principalToAgrinas}
                coopMargin={split.coopMargin}
              />
              <div className="mt-4 space-y-2 text-sm bg-white border border-gray-100 rounded-2xl p-5 shadow-sm font-semibold text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">HPP</span>
                  <span className="tabular-nums text-gray-900 font-bold">
                    {formatRupiah(agreement.hppPerKg)}/kg
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Utang tersisa sebelum bayar</span>
                  <RupiahAmount smallest={agreement.remainingDebt} className="text-sm font-bold" />
                </div>
                <div className="flex items-center justify-between border-t border-gray-50 pt-2">
                  <span className="text-gray-500 font-medium">Utang dicicil kali ini</span>
                  <RupiahAmount smallest={split.debtPaid} className="text-sm font-bold text-amber-700" />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500 leading-relaxed font-medium">
                Ini adalah prakiraan. Jumlah final dikunci saat transaksi on-chain selesai. Kas
                keluar via BRILink atau BRI, bukan langsung dari kontrak.
              </p>
            </div>

            {/* Lunas success panel */}
            {showLunas && txSettle.txHash && (
              <div className="rounded-2xl border border-[#d2f9de] bg-[#ebf5e9] p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2 size={22} className="text-[#0c7a48]" />
                    </span>
                    <div>
                      <h3 className="font-bold text-gray-900">Pembayaran Tercatat</h3>
                      <p className="text-xs text-gray-500 font-medium">
                        Catatan anti-manipulasi di Stellar. Kas keluar dari BRILink atau BRI.
                      </p>
                    </div>
                  </div>
                  <TxHashLink hash={txSettle.txHash} />
                </div>

                <div className="rounded-2xl border border-gray-150 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500">Referensi kas / BRILink</p>
                  <p className="mt-1 font-mono text-sm font-bold text-gray-900">
                    BRILink-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}-
                    {String(agreement.onchainId).padStart(4, "0")}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400 font-medium">
                    Catat referensi ini di buku kas koperasi untuk rekonsiliasi.
                  </p>
                </div>

                <Alert tone="warning" title="Residu pokok Agrinas terkunci di kas" className="rounded-xl">
                  Sebesar{" "}
                  <RupiahAmount smallest={split.principalToAgrinas} className="text-sm font-bold" /> adalah
                  uang Agrinas yang tersimpan sementara di kas koperasi. Segera remitkan ke rekening
                  Agrinas.
                </Alert>

                <div className="flex flex-wrap gap-2">
                  <Link href="/kmp/residu" onClick={onClose}>
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      leftIcon={<Landmark size={14} />}
                      rightIcon={<ArrowRight size={14} />}
                      className="rounded-full bg-[#0c6a78] hover:bg-opacity-95 text-white"
                    >
                      Keloba Residu
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Settle action */}
            {!showLunas && (
              <div>
                <h3 className="mb-3 text-sm font-bold text-gray-900">
                  Selesaikan Pembayaran
                </h3>
                {isFlagged ? (
                  <p className="text-sm text-gray-500 font-semibold leading-relaxed">
                    Pembayaran diblokir sampai petugas menyelesaikan peninjauan perjanjian ini.
                    Hubungi pengawas untuk melanjutkan.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {/* Gradient button: THE ONE allowed use across the setor/pembayaran/residu trio */}
                    <Button
                      type="button"
                      variant="gradient"
                      size="md"
                      leftIcon={<Banknote size={16} />}
                      disabled={!canSettle}
                      onClick={txSettle.run}
                      className="w-full rounded-full bg-primary-dark hover:bg-opacity-95 text-white"
                    >
                      {txSettle.state === "signing"
                        ? "Menandatangani..."
                        : txSettle.state === "submitting"
                          ? "Mencatat di Stellar..."
                          : "Selesaikan Pembayaran"}
                    </Button>
                    {txSettle.state === "signing" && (
                      <p className="text-xs text-amber-700 text-center font-semibold">
                        Konfirmasi tanda tangan di Freighter. Jangan tutup jendela.
                      </p>
                    )}
                    {txSettle.state === "submitting" && (
                      <p className="text-xs text-emerald-800 text-center font-semibold">
                        Mencatat split tiga arah di blockchain. Proses 5 hingga 10 detik.
                      </p>
                    )}
                    {txSettle.state === "idle" && (
                      <p className="text-xs text-gray-500 text-center font-medium leading-normal">
                        Tindakan ini mencatat split tiga arah di blockchain Stellar. Tanda tangan
                        Freighter diperlukan.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Residu status */}
            {residu && (
              <div>
                <h3 className="mb-3 text-sm font-bold text-gray-900">
                  Status Residu Agrinas
                </h3>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3.5 shadow-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-medium">Status</span>
                    <ResiduStatusBadge status={residu.status} />
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-50 pt-2">
                    <span className="text-sm text-gray-500 font-medium">Jumlah pokok</span>
                    <RupiahAmount smallest={residu.principalAmount} className="text-sm font-bold" />
                  </div>
                  {residu.bankRef && (
                    <div className="flex items-center justify-between gap-2 border-t border-gray-50 pt-2">
                      <span className="text-sm text-gray-500 font-medium">Ref bank</span>
                      <span className="font-mono text-xs text-gray-900 font-bold">{residu.bankRef}</span>
                    </div>
                  )}
                  {residu.txHash && (
                    <div className="flex items-center justify-between border-t border-gray-50 pt-2">
                      <span className="text-sm text-gray-500 font-medium">Tx remitansi</span>
                      <TxHashLink hash={residu.txHash} />
                    </div>
                  )}
                  <p className="pt-2 text-xs text-gray-400 font-medium leading-relaxed border-t border-gray-50">
                    {RESIDU_EXPLANATION[residu.status]}
                  </p>
                </div>
              </div>
            )}

            {/* Payment history for this agreement */}
            {payments.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-bold text-gray-900">
                  Riwayat Pembayaran Perjanjian Ini
                </h3>
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-2 mb-3">
                        <span className="text-sm font-bold text-gray-900">{p.settledAt}</span>
                        <TxHashLink hash={p.txHash} />
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs font-semibold text-gray-700">
                        <div>
                          <p className="text-gray-400 font-medium">Nilai panen</p>
                          <RupiahAmount smallest={p.gross} className="text-xs font-bold text-gray-900 mt-0.5" />
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium">Diterima petani</p>
                          <RupiahAmount smallest={p.netPaid} tone="positive" className="text-xs font-bold mt-0.5" />
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium">Volume</p>
                          <span className="tabular-nums text-gray-900 font-bold block mt-0.5">
                            {p.settledVolKg.toLocaleString("id-ID")} kg
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium">Ref bank</p>
                          <span className="font-mono text-gray-900 font-bold block mt-0.5">{p.rupiahRef}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </>
  );
}
