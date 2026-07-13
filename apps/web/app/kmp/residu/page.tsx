"use client";

/**
 * Screen: Residu Supplier — manage principal remittances owed back to Supplier.
 *
 * Key constraint: residu pokok is Supplier's money, not KMP's. KMP holds it
 * in pre-funded cash until remitted. The dual gate (KMP submits evidence,
 * Supplier verifies) is the anti-moral-hazard mechanism.
 *
 * No automatic accusation. Disputed status = human review freezes reputation
 * pending resolution. This page: record off-chain bank transfer + watch
 * status updates. No gradient button here.
 */

import { fetchPayableOverview, fetchResidu } from "@/lib/api";
import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { useTx } from "@/components/kmp/use-tx";
import { sha256Hex } from "@/lib/hash";
import { markResiduRemitted } from "@/lib/invocations";
import { useApi } from "@/lib/use-api";
import { formatRupiah } from "@annona/core";
import type { ResiduStatus } from "@annona/core";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  ResiduStatusBadge,
  RupiahAmount,
  StatCard,
  TxHashLink,
} from "@annona/ui";
import { Building2, CheckCircle2, Landmark, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useMemo, useState } from "react";

interface ResiduRowState {
  status: ResiduStatus;
  bankRef: string | null;
  remittedAt: string | null;
  txHash: string | null;
}

/** Payable panel — shows running trade payable KMP owes to Supplier. */
function PayablePanel() {
  const { data, loading, error } = useApi(fetchPayableOverview);
  const { t } = useI18n();
  if (loading) return null;
  if (error || !data) return null;
  const totals = data.totals;
  return (
    <Card className="rounded-[2rem] border border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
      <CardHeader
        title={t("page.kmp.residu.payable.title")}
        description={t("page.kmp.residu.payable.desc")}
        action={<Building2 size={18} className="text-cyan-800" />}
        className="pb-3"
      />
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard
            label={t("page.kmp.residu.payable.accrued")}
            value={<RupiahAmount smallest={totals.totalAccrued} className="text-2xl font-bold" />}
            hint={t("page.kmp.residu.payable.accruedHint")}
            icon={<Landmark size={16} />}
          />
          <StatCard
            label={t("page.kmp.residu.payable.settled")}
            value={<RupiahAmount smallest={totals.totalSettled} className="text-2xl font-bold" />}
            hint={t("page.kmp.residu.payable.settledHint")}
            tone="good"
            icon={<CheckCircle2 size={16} />}
          />
          <StatCard
            label={t("page.kmp.residu.payable.outstanding")}
            value={<RupiahAmount smallest={totals.totalOutstanding} className="text-2xl font-bold" />}
            hint={t("page.kmp.residu.payable.outstandingHint")}
            tone={totals.totalOutstanding > 0n ? "warn" : "good"}
            icon={<Landmark size={16} />}
          />
          <StatCard
            label={t("page.kmp.residu.payable.status")}
            value={
              <span className="text-2xl font-bold">
                {totals.byStatus.Outstanding}/{totals.count}
              </span>
            }
            hint={t("page.kmp.residu.payable.statusHint")}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResiduPage() {
  /* ── Live ledger from the REST read-model ────────────────────────────── */
  const { data: ledger, loading, error } = useApi(fetchResidu);
  const rows = ledger ?? [];

  /* ── Local state for each row's overrides (after Tandai Disetor) ─────── */
  /* Starts empty; each cell falls back to the row's own server value until
   * the officer records a remittance (write path stays mock for the demo). */
  const [rowStates, setRowStates] = useState<Record<string, ResiduRowState>>({});

  /* ── Which row's action panel is open ───────────────────────────────── */
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [bankRefInput, setBankRefInput] = useState("");
  const [fileName, setFileName] = useState("");

  /* ── I18n ──────────────────────────────────────────────────────────────── */
  const { t } = useI18n();

  /* ── TX hook for the remit action (mark_residu_remitted, coop-signed) ── */
  const txRemit = useTx();

  /* ── Computed stats ──────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    let pending = 0n;
    let remitted = 0n;
    let cleared = 0n;
    for (const r of rows) {
      const state = rowStates[r.id];
      const status = state?.status ?? r.status;
      if (status === "Pending") pending += r.principalAmount;
      else if (status === "Remitted") remitted += r.principalAmount;
      else if (status === "Cleared") cleared += r.principalAmount;
    }
    return { pending, remitted, cleared };
  }, [rowStates, rows]);

  function handleOpenRemit(rowId: string) {
    setActiveRowId(rowId);
    setBankRefInput("");
    setFileName("");
    txRemit.reset();
  }

  function handleCloseRemit() {
    setActiveRowId(null);
    setBankRefInput("");
    setFileName("");
    txRemit.reset();
  }

  function handleConfirmRemit(rowId: string) {
    if (!bankRefInput.trim()) return;
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    // Anchor a hash of the bank ref + proof filename as the on-chain ref_hash.
    txRemit.run(async (coop) => {
      const refHash = await sha256Hex(`${bankRefInput.trim()}:${fileName}`);
      return markResiduRemitted(coop, row.agreementOnchainId, refHash);
    });
    // Row state is updated in the JSX success branch (watches txRemit).
    void rowId;
  }

  /* ── JSX ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.kmp.residu.title")}
        description={t("page.kmp.residu.desc")}
      />

      {loading && <Alert tone="info">{t("common.loading")}</Alert>}
      {error && (
        <Alert tone="warning" title={t("common.error")}>
          {error}
        </Alert>
      )}

      {/* Top alert: mandatory, prominent */}
      <Alert tone="warning" title="Residu pokok bukan milik koperasi" className="rounded-xl">
        {t("page.kmp.residu.alert")}
      </Alert>

      {/* 3 Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("page.kmp.residu.pending")}
          value={<RupiahAmount smallest={stats.pending} className="text-3xl font-bold" />}
          hint={t("page.kmp.residu.pendingHint")}
          tone={stats.pending > 0n ? "warn" : "good"}
          icon={<Landmark size={18} />}
        />
        <StatCard
          label={t("page.kmp.residu.remitted")}
          value={<RupiahAmount smallest={stats.remitted} className="text-3xl font-bold" />}
          hint={t("page.kmp.residu.remittedHint")}
          icon={<Building2 size={18} />}
        />
        <StatCard
          label={t("page.kmp.residu.cleared")}
          value={<RupiahAmount smallest={stats.cleared} className="text-3xl font-bold" />}
          hint={t("page.kmp.residu.clearedHint")}
          tone="good"
          icon={<ShieldCheck size={18} />}
        />
      </div>

      {/* Utang ke Supplier panel — payable overview */}
      <PayablePanel />

      {/* Ledger table */}
      <Card className="rounded-[2rem] border border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
        <CardHeader
          title={t("page.kmp.residu.ledger")}
          description={t("page.kmp.residu.ledger.desc")}
          action={<Landmark size={18} className="text-cyan-800" />}
          className="pb-3"
        />
        <CardContent className="space-y-4 pt-3">
          <TableFrame>
            <Table>
              <THead>
                          <Th>Perjanjian</Th>
                                <Th>{t("page.kmp.petani.table.col.name")}</Th>
                                <Th>{t("common.amount")}</Th>
                                <Th>{t("common.status")}</Th>
                                <Th>Ref Bank</Th>
                                <Th>Tanggal Setor</Th>
                                <Th>Tanggal Verifikasi</Th>
                                <Th>Tx</Th>
                                <Th>Aksi</Th>
              </THead>
              <TBody>
                {rows.map((row) => {
                  const state = rowStates[row.id];
                  const currentStatus = state?.status ?? row.status;
                  const currentBankRef = state?.bankRef ?? row.bankRef;
                  const currentRemittedAt = state?.remittedAt ?? row.remittedAt;
                  const currentTxHash = state?.txHash ?? row.txHash;
                  const isActiveRow = activeRowId === row.id;

                  return (
                    <tr key={row.id} className="contents">
                      <Tr className={isActiveRow ? "bg-cyan-50/20" : undefined}>
                        <Td>
                          <Link
                            href={`/kmp/perjanjian/${row.agreementId}`}
                            className="text-accent hover:underline"
                          >
                            #{String(row.agreementOnchainId)}
                          </Link>
                        </Td>
                        <Td className="font-medium">{row.farmerName}</Td>
                        <Td>
                          <RupiahAmount smallest={row.principalAmount} className="font-bold text-gray-900" />
                        </Td>
                        <Td>
                          <ResiduStatusBadge status={currentStatus} />
                        </Td>
                        <Td className="font-mono text-xs text-gray-500 font-semibold">
                          {currentBankRef ?? <span className="text-gray-400">-</span>}
                        </Td>
                        <Td className="tabular-nums text-gray-505 font-medium">
                          {currentRemittedAt ?? <span className="text-gray-400">-</span>}
                        </Td>
                        <Td className="tabular-nums text-gray-505 font-medium">
                          {row.clearedAt ?? <span className="text-gray-400">-</span>}
                        </Td>
                        <Td>
                          {currentTxHash ? (
                            <TxHashLink hash={currentTxHash} />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </Td>
                        <Td>
                          {currentStatus === "Pending" && !isActiveRow && (
                            <Button
                              type="button"
                              variant="accent"
                              size="sm"
                              onClick={() => handleOpenRemit(row.id)}
                              className="rounded-full bg-[#0c6a78] hover:bg-[#0c6a78]/95 text-white"
                            >
                              {t("page.kmp.residu.reconcile.submit")}
                            </Button>
                          )}
                          {currentStatus === "Pending" && isActiveRow && (
                            <span className="text-xs text-gray-500 font-semibold">Sedang diisi...</span>
                          )}
                          {currentStatus === "Remitted" && (
                            <span className="text-xs text-gray-500 font-semibold">Menunggu Supplier</span>
                          )}
                          {currentStatus === "Cleared" && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                              <CheckCircle2 size={13} />
                              Selesai
                            </span>
                          )}
                        </Td>
                      </Tr>

                      {/* Inline action panel for the active row */}
                      {isActiveRow && currentStatus === "Pending" && (
                        <tr key={`${row.id}-panel`}>
                          <td colSpan={9} className="bg-[#e7fafc]/30 border-y border-[#c3f2f6]/40 px-5 py-6">
                            {txRemit.state !== "success" ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <p className="font-bold text-[#0c6a78]">
                                    {t("page.kmp.residu.reconcile.submit")}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={handleCloseRemit}
                                    className="text-gray-400 hover:text-gray-700 transition-colors"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                                <Alert tone="info" className="rounded-xl">
                                  {t("page.kmp.residu.reconcile.desc")}
                                </Alert>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                  <Input
                                    label={t("page.kmp.residu.reconcile.ref")}
                                    name="bank-ref"
                                    placeholder="Contoh: BCA-20260704-123"
                                    value={bankRefInput}
                                    onChange={(e) => setBankRefInput(e.target.value)}
                                    className="rounded-2xl border-gray-150"
                                    hint={`Nilai: ${formatRupiah(row.principalAmount)}`}
                                  />
                                  <div>
                                    <label
                                      htmlFor={`file-${row.id}`}
                                      className="mb-2 block text-sm font-bold text-gray-900"
                                    >
                                      {t("page.kmp.residu.reconcile.proof")}
                                    </label>
                                    <label
                                      htmlFor={`file-${row.id}`}
                                      className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-2xl border border-gray-150 bg-white px-4 text-sm font-semibold text-gray-500 hover:border-emerald-600 transition-all shadow-sm"
                                    >
                                      {fileName ? fileName : t("page.kmp.residu.reconcile.noFile")}
                                      <input
                                        id={`file-${row.id}`}
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="sr-only"
                                        onChange={(e) =>
                                          setFileName(e.target.files?.[0]?.name ?? "")
                                        }
                                      />
                                    </label>
                                    <p className="mt-1.5 text-xs text-gray-400 font-semibold leading-relaxed">
                                      Format: gambar atau PDF. Tidak diunggah ke server dalam demo
                                      ini.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="accent"
                                    size="sm"
                                    leftIcon={<ShieldCheck size={14} />}
                                    disabled={!bankRefInput.trim() || txRemit.state !== "idle"}
                                    onClick={() => handleConfirmRemit(row.id)}
                                    className="rounded-full bg-[#0c6a78] hover:bg-[#0c6a78]/95 text-white"
                                  >
                                    {txRemit.state === "signing"
                                      ? t("page.kmp.permintaanDana.signing")
                                      : txRemit.state === "submitting"
                                        ? t("page.kmp.permintaanDana.submitting")
                                        : "Konfirmasi Disetor"}
                                  </Button>
                                  <Button type="button" variant="ghost" size="sm" onClick={handleCloseRemit} className="rounded-full">
                                    {t("common.cancel")}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              /* Success state — update local state and show result */
                              <RemitSuccess
                                txHash={txRemit.txHash ?? ""}
                                bankRef={bankRefInput}
                                onDone={() => {
                                  setRowStates((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      status: "Remitted",
                                      bankRef: bankRefInput,
                                      remittedAt: new Date().toISOString().slice(0, 10),
                                      txHash: txRemit.txHash,
                                    },
                                  }));
                                  setActiveRowId(null);
                                  setBankRefInput("");
                                  setFileName("");
                                  txRemit.reset();
                                }}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          </TableFrame>
        </CardContent>
      </Card>

      {/* Bottom explainer */}
      <Card className="rounded-[2rem] border border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
        <CardHeader
          title="Cara Kerja Dual Gate Residu"
          description="Dua tahap verifikasi melindungi Supplier dan memastikan KMP tidak mengklaim residu sebagai milik sendiri."
          action={<ShieldCheck size={18} className="text-emerald-700" />}
          className="pb-3"
        />
        <CardContent className="space-y-4 pt-3">
          <ol className="space-y-4 text-sm text-gray-700">
            <li className="flex gap-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800 border border-emerald-200/50">
                1
              </span>
              <div>
                <p className="font-bold text-gray-900">KMP Tandai Disetor</p>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed mt-0.5">
                  Petugas KMP mencatat referensi transfer dan bukti pengiriman. Komitmen dikunci di
                  blockchain. Status berubah menjadi Menunggu Verifikasi.
                </p>
              </div>
            </li>
            <li className="flex gap-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-xs font-bold text-cyan-800 border border-cyan-200/50">
                2
              </span>
              <div>
                <p className="font-bold text-gray-900">Supplier Verifikasi</p>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed mt-0.5">
                  Supplier mengkonfirmasi penerimaan transfer. Status berubah menjadi Terverifikasi.
                  Kewajiban KMP selesai.
                </p>
              </div>
            </li>
            <li className="flex gap-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-800 border border-amber-200/50">
                !
              </span>
              <div>
                <p className="font-bold text-gray-900">Jika Ada Sengketa</p>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed mt-0.5">
                  Supplier dapat menandai sebagai Bermasalah jika ada perbedaan. Ini hanya indikator
                  untuk peninjauan manusia. Reputasi on-chain KMP dibekukan sementara. Keputusan
                  diselesaikan di luar sistem oleh pihak yang berwenang.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

/** Small sub-component to show remit success and trigger state update. */
function RemitSuccess({
  txHash,
  bankRef,
  onDone,
}: {
  txHash: string;
  bankRef: string;
  onDone: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-[#c3f2f6] bg-[#e7fafc]/45 px-5 py-4 shadow-sm">
        <CheckCircle2 size={18} className="text-[#0c6a78]" />
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">Remitansi residu tercatat di chain</p>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">
            Ref: {bankRef}. Menunggu verifikasi Supplier.
          </p>
        </div>
        <TxHashLink hash={txHash} />
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onDone} className="rounded-full">
        {t("common.close")}
      </Button>
    </div>
  );
}
