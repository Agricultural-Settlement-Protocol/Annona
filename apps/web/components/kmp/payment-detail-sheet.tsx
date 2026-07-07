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
        aria-label={`Detail pembayaran ${farmer.name}`}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-border bg-surface shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{farmer.name}</h2>
              <ReputationBadge tier={farmer.repTier} />
              <StatusBadge status={agreement.status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {agreement.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan"} ·
              Perjanjian #{String(agreement.onchainId)} · {formatKg(unsettledKg)} belum dibayar
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
            {/* Flagged blocking notice */}
            {isFlagged && (
              <Alert tone="warning" title="Perjanjian Perlu Ditinjau">
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
              <Alert tone="info">
                Ini adalah pembayaran bertahap. Pembayaran dilakukan untuk {formatKg(unsettledKg)}{" "}
                yang sudah disetor. Utang dicicil terlebih dulu dari setiap tahap pembayaran.
              </Alert>
            )}

            {/* Split settlement preview */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Prakiraan Pembagian Kas
              </h3>
              <SplitSettlementCard
                gross={split.grossSmallest}
                handlingCut={split.handlingCut}
                netToFarmer={split.netToFarmer}
                residuPrincipal={split.principalToAgrinas}
                coopMargin={split.coopMargin}
              />
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">HPP</span>
                  <span className="tabular-nums text-foreground">
                    {formatRupiah(agreement.hppPerKg)}/kg
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Utang tersisa sebelum bayar</span>
                  <RupiahAmount smallest={agreement.remainingDebt} className="text-sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Utang dicicil kali ini</span>
                  <RupiahAmount smallest={split.debtPaid} className="text-sm" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Ini adalah prakiraan. Jumlah final dikunci saat transaksi on-chain selesai. Kas
                keluar via BRILink atau BRI, bukan langsung dari kontrak.
              </p>
            </div>

            {/* Lunas success panel */}
            {showLunas && txSettle.txHash && (
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/80 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2 size={22} className="text-emerald-600" />
                    </span>
                    <div>
                      <h3 className="font-bold text-foreground">Pembayaran Tercatat</h3>
                      <p className="text-sm text-muted-foreground">
                        Catatan anti-manipulasi di Stellar. Kas keluar dari BRILink atau BRI.
                      </p>
                    </div>
                  </div>
                  <TxHashLink hash={txSettle.txHash} />
                </div>

                <div className="rounded-lg border border-border bg-surface px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">Referensi kas / BRILink</p>
                  <p className="mt-0.5 font-mono text-sm text-foreground">
                    BRILink-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}-
                    {String(agreement.onchainId).padStart(4, "0")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Catat referensi ini di buku kas koperasi untuk rekonsiliasi.
                  </p>
                </div>

                <Alert tone="warning" title="Residu pokok Agrinas terkunci di kas">
                  Sebesar{" "}
                  <RupiahAmount smallest={split.principalToAgrinas} className="text-sm" /> adalah
                  uang Agrinas yang tersimpan sementara di kas koperasi. Segera remitkan ke rekening
                  Agrinas.
                </Alert>

                <div className="flex flex-wrap gap-2">
                  <Link href="/kmp/residu" onClick={onClose}>
                    <Button
                      variant="accent"
                      size="sm"
                      leftIcon={<Landmark size={14} />}
                      rightIcon={<ArrowRight size={14} />}
                    >
                      Kelola Residu
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Settle action */}
            {!showLunas && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Selesaikan Pembayaran
                </h3>
                {isFlagged ? (
                  <p className="text-sm text-muted-foreground">
                    Pembayaran diblokir sampai petugas menyelesaikan peninjauan perjanjian ini.
                    Hubungi pengawas untuk melanjutkan.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {/* Gradient button: THE ONE allowed use across the setor/pembayaran/residu trio */}
                    <Button
                      variant="gradient"
                      size="md"
                      leftIcon={<Banknote size={16} />}
                      disabled={!canSettle}
                      onClick={txSettle.run}
                      className="w-full"
                    >
                      {txSettle.state === "signing"
                        ? "Menandatangani..."
                        : txSettle.state === "submitting"
                          ? "Mencatat di Stellar..."
                          : "Selesaikan Pembayaran"}
                    </Button>
                    {txSettle.state === "signing" && (
                      <p className="text-xs text-muted-foreground">
                        Konfirmasi tanda tangan di Freighter. Jangan tutup jendela.
                      </p>
                    )}
                    {txSettle.state === "submitting" && (
                      <p className="text-xs text-muted-foreground">
                        Mencatat split tiga arah di blockchain. Proses 5 hingga 10 detik.
                      </p>
                    )}
                    {txSettle.state === "idle" && (
                      <p className="text-xs text-muted-foreground">
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
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Status Residu Agrinas
                </h3>
                <div className="rounded-lg border border-border bg-surface-muted/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <ResiduStatusBadge status={residu.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Jumlah pokok</span>
                    <RupiahAmount smallest={residu.principalAmount} className="text-sm" />
                  </div>
                  {residu.bankRef && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Ref bank</span>
                      <span className="font-mono text-xs text-foreground">{residu.bankRef}</span>
                    </div>
                  )}
                  {residu.txHash && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tx remitansi</span>
                      <TxHashLink hash={residu.txHash} />
                    </div>
                  )}
                  <p className="pt-1 text-xs text-muted-foreground">
                    {RESIDU_EXPLANATION[residu.status]}
                  </p>
                </div>
              </div>
            )}

            {/* Payment history for this agreement */}
            {payments.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Riwayat Pembayaran Perjanjian Ini
                </h3>
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg border border-border bg-surface-muted/50 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{p.settledAt}</span>
                        <TxHashLink hash={p.txHash} />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div>
                          <p className="text-muted-foreground">Nilai panen</p>
                          <RupiahAmount smallest={p.gross} className="text-xs" />
                        </div>
                        <div>
                          <p className="text-muted-foreground">Diterima petani</p>
                          <RupiahAmount smallest={p.netPaid} tone="positive" className="text-xs" />
                        </div>
                        <div>
                          <p className="text-muted-foreground">Volume</p>
                          <span className="tabular-nums text-foreground">
                            {p.settledVolKg.toLocaleString("id-ID")} kg
                          </span>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ref bank</p>
                          <span className="font-mono text-foreground">{p.rupiahRef}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
