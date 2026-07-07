"use client";

/**
 * Screen: Residu Agrinas — manage principal remittances owed back to Agrinas.
 *
 * Key constraint: residu pokok is Agrinas's money, not KMP's. KMP holds it
 * in pre-funded cash until remitted. The dual gate (KMP submits evidence,
 * Agrinas verifies) is the anti-moral-hazard mechanism.
 *
 * No automatic accusation. Disputed status = human review freezes reputation
 * pending resolution. This page: record off-chain bank transfer + watch
 * status updates. No gradient button here.
 */

import { fetchResidu } from "@/lib/api";
import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { useMockTx } from "@/components/kmp/use-mock-tx";
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
import { useMemo, useState } from "react";

interface ResiduRowState {
  status: ResiduStatus;
  bankRef: string | null;
  remittedAt: string | null;
  txHash: string | null;
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

  /* ── TX hook for the remit action ───────────────────────────────────── */
  const txRemit = useMockTx();

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
    txRemit.run();
    // Update row state after tx completes. We watch txRemit in the JSX.
    // The effect is handled in the success branch below.
    void rowId; // used in JSX branch
  }

  /* ── JSX ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <PageHeader
        title="Residu Agrinas"
        description="Residu pokok adalah uang Agrinas yang dikumpulkan saat panen, disimpan sementara di kas KMP, dan wajib disetor balik."
      />

      {loading && <Alert tone="info">Memuat ledger residu...</Alert>}
      {error && (
        <Alert tone="warning" title="Gagal memuat ledger residu">
          {error}
        </Alert>
      )}

      {/* Top alert: mandatory, prominent */}
      <Alert tone="warning" title="Residu pokok bukan milik koperasi">
        Uang ini adalah pokok saprotan Agrinas yang dikembalikan saat panen. KMP hanya memegang
        sementara. Segera remitkan ke rekening Agrinas setelah pembayaran panen selesai.
        Keterlambatan dapat membekukan reputasi on-chain koperasi.
      </Alert>

      {/* 3 Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Belum Disetor"
          value={<RupiahAmount smallest={stats.pending} className="text-3xl" />}
          hint="Residu yang belum diremitkan ke Agrinas"
          tone={stats.pending > 0n ? "warn" : "good"}
          icon={<Landmark size={18} />}
        />
        <StatCard
          label="Menunggu Verifikasi"
          value={<RupiahAmount smallest={stats.remitted} className="text-3xl" />}
          hint="Transfer terkirim, menunggu konfirmasi Agrinas"
          icon={<Building2 size={18} />}
        />
        <StatCard
          label="Terverifikasi"
          value={<RupiahAmount smallest={stats.cleared} className="text-3xl" />}
          hint="Residu diterima dan dikonfirmasi Agrinas"
          tone="good"
          icon={<ShieldCheck size={18} />}
        />
      </div>

      {/* Ledger table */}
      <Card>
        <CardHeader
          title="Ledger Residu"
          description="Satu baris per perjanjian yang menghasilkan residu pokok. Tandai Disetor untuk mencatat bukti transfer."
          action={<Landmark size={18} className="text-aqua-400" />}
        />
        <CardContent className="space-y-4">
          <TableFrame>
            <Table>
              <THead>
                <Th>Perjanjian</Th>
                <Th>Petani</Th>
                <Th>Pokok Agrinas</Th>
                <Th>Status</Th>
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
                    <>
                      <Tr key={row.id}>
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
                          <RupiahAmount smallest={row.principalAmount} className="font-semibold" />
                        </Td>
                        <Td>
                          <ResiduStatusBadge status={currentStatus} />
                        </Td>
                        <Td className="font-mono text-xs text-muted-foreground">
                          {currentBankRef ?? <span className="text-muted-foreground">-</span>}
                        </Td>
                        <Td className="tabular-nums text-muted-foreground">
                          {currentRemittedAt ?? <span className="text-muted-foreground">-</span>}
                        </Td>
                        <Td className="tabular-nums text-muted-foreground">
                          {row.clearedAt ?? <span className="text-muted-foreground">-</span>}
                        </Td>
                        <Td>
                          {currentTxHash ? (
                            <TxHashLink hash={currentTxHash} />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </Td>
                        <Td>
                          {currentStatus === "Pending" && !isActiveRow && (
                            <Button
                              variant="accent"
                              size="sm"
                              onClick={() => handleOpenRemit(row.id)}
                            >
                              Tandai Disetor
                            </Button>
                          )}
                          {currentStatus === "Pending" && isActiveRow && (
                            <span className="text-xs text-muted-foreground">Sedang diisi...</span>
                          )}
                          {currentStatus === "Remitted" && (
                            <span className="text-xs text-muted-foreground">Menunggu Agrinas</span>
                          )}
                          {currentStatus === "Cleared" && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                              <CheckCircle2 size={13} />
                              Selesai
                            </span>
                          )}
                        </Td>
                      </Tr>

                      {/* Inline action panel for the active row */}
                      {isActiveRow && currentStatus === "Pending" && (
                        <tr key={`${row.id}-panel`}>
                          <td colSpan={9} className="bg-aqua-50/60 px-4 py-4">
                            {txRemit.state !== "success" ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold text-aqua-800">
                                    Tandai Disetor ke Agrinas
                                  </p>
                                  <button
                                    type="button"
                                    onClick={handleCloseRemit}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                                <Alert tone="info">
                                  Masukkan referensi transfer bank dan unggah bukti transfer.
                                  Agrinas akan memverifikasi dan mengkonfirmasi via sistem mereka.
                                  Catatan ini dikunci di blockchain sebagai komitmen KMP.
                                </Alert>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                  <Input
                                    label="Referensi Transfer Bank"
                                    name="bank-ref"
                                    placeholder="Contoh: BCA-20260704-123"
                                    value={bankRefInput}
                                    onChange={(e) => setBankRefInput(e.target.value)}
                                    hint={`Nilai: ${formatRupiah(row.principalAmount)}`}
                                  />
                                  <div>
                                    <label
                                      htmlFor={`file-${row.id}`}
                                      className="mb-1.5 block text-sm font-medium text-foreground"
                                    >
                                      Bukti Transfer
                                    </label>
                                    <label
                                      htmlFor={`file-${row.id}`}
                                      className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground hover:border-ring"
                                    >
                                      {fileName ? fileName : "Pilih file bukti transfer..."}
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
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Format: gambar atau PDF. Tidak diunggah ke server dalam demo
                                      ini.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="accent"
                                    size="sm"
                                    leftIcon={<ShieldCheck size={14} />}
                                    disabled={!bankRefInput.trim() || txRemit.state !== "idle"}
                                    onClick={() => handleConfirmRemit(row.id)}
                                  >
                                    {txRemit.state === "signing"
                                      ? "Menandatangani..."
                                      : txRemit.state === "submitting"
                                        ? "Mencatat di Stellar..."
                                        : "Konfirmasi Disetor"}
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={handleCloseRemit}>
                                    Batal
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
                    </>
                  );
                })}
              </TBody>
            </Table>
          </TableFrame>
        </CardContent>
      </Card>

      {/* Bottom explainer */}
      <Card>
        <CardHeader
          title="Cara Kerja Dual Gate Residu"
          description="Dua tahap verifikasi melindungi Agrinas dan memastikan KMP tidak mengklaim residu sebagai milik sendiri."
          action={<ShieldCheck size={18} className="text-verdant-400" />}
        />
        <CardContent className="space-y-3">
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-verdant-100 text-xs font-bold text-verdant-700">
                1
              </span>
              <div>
                <p className="font-medium">KMP Tandai Disetor</p>
                <p className="text-muted-foreground">
                  Petugas KMP mencatat referensi transfer dan bukti pengiriman. Komitmen dikunci di
                  blockchain. Status berubah menjadi Menunggu Verifikasi.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-aqua-100 text-xs font-bold text-aqua-700">
                2
              </span>
              <div>
                <p className="font-medium">Agrinas Verifikasi</p>
                <p className="text-muted-foreground">
                  Agrinas mengkonfirmasi penerimaan transfer. Status berubah menjadi Terverifikasi.
                  Kewajiban KMP selesai.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                !
              </span>
              <div>
                <p className="font-medium">Jika Ada Sengketa</p>
                <p className="text-muted-foreground">
                  Agrinas dapat menandai sebagai Bermasalah jika ada perbedaan. Ini hanya indikator
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
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-aqua-200 bg-aqua-50 px-4 py-3">
        <CheckCircle2 size={18} className="text-aqua-700" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-aqua-700">Remitansi residu tercatat di chain</p>
          <p className="text-xs text-muted-foreground">
            Ref: {bankRef}. Menunggu verifikasi Agrinas.
          </p>
        </div>
        <TxHashLink hash={txHash} />
      </div>
      <Button variant="ghost" size="sm" onClick={onDone}>
        Tutup
      </Button>
    </div>
  );
}
