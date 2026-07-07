"use client";

/**
 * Screen I: Rekonsiliasi Residu (Agrinas view).
 *
 * Inter-institutional ledger: per-KMP residu collected, owed, remitted, cleared.
 * Drill into a KMP to see its individual residu rows.
 * Two write actions:
 *   - Setujui Remitansi (confirm_remittance) -> Cleared + TxHashLink
 *   - Ajukan Sengketa (flag_remittance_dispute) -> Disputed + frozen indicator
 * Both via useMockTx. Disputed is a human-review indicator, never automatic accusation.
 */

import { OversightPageHeader } from "@/components/oversight/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { useMockTx } from "@/components/kmp/use-mock-tx";
import { ScrollArea } from "@/components/scroll-area";
import {
  MOCK_COOP_PROFILES,
  OVERSIGHT_RESIDU_ROWS,
  type OversightResiduRow,
  protocolMetrics,
} from "@/lib/oversight-data";
import { formatRupiah } from "@annona/core";
import type { ResiduStatus } from "@annona/core";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  ResiduStatusBadge,
  RupiahAmount,
  StatCard,
  TxHashLink,
} from "@annona/ui";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Landmark,
  Lock,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Per-row local state ──────────────────────────────────────────────────────

interface RowState {
  status: ResiduStatus;
  txHash: string | null;
  clearedAt: string | null;
  disputed: boolean;
  disputeReason: string | null;
}

function initRowStates(): Record<string, RowState> {
  const init: Record<string, RowState> = {};
  for (const row of OVERSIGHT_RESIDU_ROWS) {
    init[row.id] = {
      status: row.status,
      txHash: row.txHash,
      clearedAt: row.clearedAt,
      disputed: row.status === "Disputed",
      disputeReason: null,
    };
  }
  return init;
}

// ─── Per-row action panel ─────────────────────────────────────────────────────

function RemittanceActionPanel({
  row,
  onCleared,
  onDisputed,
  onClose,
}: {
  row: OversightResiduRow;
  onCleared: (rowId: string, txHash: string) => void;
  onDisputed: (rowId: string, txHash: string, reason: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"approve" | "dispute" | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>("");

  const txApprove = useMockTx();
  const txDispute = useMockTx();

  const prevApprove = useRef(txApprove.state);
  const prevDispute = useRef(txDispute.state);

  useEffect(() => {
    const prev = prevApprove.current;
    prevApprove.current = txApprove.state;
    if (prev !== "success" && txApprove.state === "success" && txApprove.txHash) {
      onCleared(row.id, txApprove.txHash);
    }
  }, [txApprove.state, txApprove.txHash, row.id, onCleared]);

  useEffect(() => {
    const prev = prevDispute.current;
    prevDispute.current = txDispute.state;
    if (prev !== "success" && txDispute.state === "success" && txDispute.txHash) {
      onDisputed(row.id, txDispute.txHash, disputeReason);
    }
  }, [txDispute.state, txDispute.txHash, row.id, onDisputed, disputeReason]);

  return (
    <tr>
      <td
        colSpan={9}
        className="bg-aqua-50/60 px-4 py-4"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-aqua-800">
              Tindakan untuk remitansi {row.coopName}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          <Alert tone="info">
            Remitansi sebesar{" "}
            <span className="font-semibold">{formatRupiah(row.principalAmount)}</span> dari{" "}
            {row.coopName} (Ref: {row.bankRef ?? "tidak ada referensi bank"}).
            Verifikasi catatan bank sebelum menyetujui.
          </Alert>

          {mode === null && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCircle2 size={13} />}
                onClick={() => setMode("approve")}
              >
                Setujui Remitansi
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ShieldAlert size={13} />}
                onClick={() => setMode("dispute")}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                Ajukan Sengketa
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Batal
              </Button>
            </div>
          )}

          {mode === "approve" && txApprove.state !== "success" && (
            <div className="space-y-3">
              <Alert tone="info">
                Menyetujui remitansi akan mencatat{" "}
                <span className="font-mono">confirm_remittance</span> di Stellar
                dan mengubah status menjadi Terverifikasi.
              </Alert>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<ShieldCheck size={13} />}
                  disabled={txApprove.state !== "idle"}
                  onClick={() => txApprove.run()}
                >
                  {txApprove.state === "signing"
                    ? "Menandatangani..."
                    : txApprove.state === "submitting"
                      ? "Mencatat di Stellar..."
                      : "Konfirmasi Terverifikasi"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                  Kembali
                </Button>
              </div>
            </div>
          )}

          {mode === "dispute" && txDispute.state !== "success" && (
            <div className="space-y-3">
              <Alert tone="warning" title="Ini hanya indikator untuk peninjauan manusia">
                Mengajukan sengketa akan membekukan reputasi on-chain KMP sementara.
                Ini bukan tuduhan otomatis. Keputusan diselesaikan oleh pihak berwenang
                di luar sistem.
              </Alert>
              <div>
                <label
                  htmlFor="dispute-reason"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Alasan sengketa
                </label>
                <input
                  id="dispute-reason"
                  type="text"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Contoh: Selisih Rp400.000 antara bukti dan klaim"
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ShieldAlert size={13} />}
                  disabled={!disputeReason.trim() || txDispute.state !== "idle"}
                  onClick={() => txDispute.run()}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {txDispute.state === "signing"
                    ? "Menandatangani..."
                    : txDispute.state === "submitting"
                      ? "Mencatat di Stellar..."
                      : "Ajukan Sengketa"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                  Kembali
                </Button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── KMP section (drillable) ─────────────────────────────────────────────────

function CoopResiduSection({
  coopId,
  coopName,
  rows,
  rowStates,
  onCleared,
  onDisputed,
  expanded,
  onToggle,
}: {
  coopId: string;
  coopName: string;
  rows: OversightResiduRow[];
  rowStates: Record<string, RowState>;
  onCleared: (rowId: string, txHash: string) => void;
  onDisputed: (rowId: string, txHash: string, reason: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const coop = MOCK_COOP_PROFILES.find((c) => c.id === coopId);

  const pending = rows.reduce(
    (s, r) =>
      rowStates[r.id]?.status === "Pending" ? s + r.principalAmount : s,
    0n,
  );
  const remitted = rows.reduce(
    (s, r) =>
      rowStates[r.id]?.status === "Remitted" ? s + r.principalAmount : s,
    0n,
  );
  const cleared = rows.reduce(
    (s, r) =>
      rowStates[r.id]?.status === "Cleared" ? s + r.principalAmount : s,
    0n,
  );

  const frozen = coop?.reputation.frozen ?? false;
  const hasRemitted = rows.some((r) => rowStates[r.id]?.status === "Remitted");

  return (
    <Card>
      {/* Header: collapsible */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-4 rounded-t-xl p-5 text-left hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{coopName}</p>
            {frozen && (
              <Badge tone="danger" icon={<Lock size={10} />}>
                Dibekukan
              </Badge>
            )}
            {hasRemitted && (
              <Badge tone="aqua">Menunggu Verifikasi</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Pending: {formatRupiah(pending)} / Remitted: {formatRupiah(remitted)} /
            Cleared: {formatRupiah(cleared)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
          <span className="text-xs">
            {rows.length} baris residu
          </span>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-border">
          <TableFrame className="rounded-none border-0 shadow-none">
            <Table>
              <THead>
                <Th>Petani</Th>
                <Th>Komoditas</Th>
                <Th>Pokok Agrinas</Th>
                <Th>Status</Th>
                <Th>Ref Bank</Th>
                <Th>Tgl Remit</Th>
                <Th>Tgl Verif</Th>
                <Th>Tx</Th>
                <Th>Aksi</Th>
              </THead>
              <TBody>
                {rows.map((row) => {
                  const state = rowStates[row.id];
                  const currentStatus = state?.status ?? row.status;
                  const currentTx = state?.txHash ?? row.txHash;
                  const currentClearedAt = state?.clearedAt ?? row.clearedAt;
                  const isActive = activeRowId === row.id;

                  return (
                    <Fragment key={row.id}>
                      <Tr>
                        <Td className="font-medium">{row.farmerName}</Td>
                        <Td className="text-xs text-muted-foreground">
                          {row.commodityCode}
                        </Td>
                        <Td>
                          <RupiahAmount smallest={row.principalAmount} />
                        </Td>
                        <Td>
                          <ResiduStatusBadge status={currentStatus} />
                        </Td>
                        <Td className="font-mono text-xs text-muted-foreground">
                          {row.bankRef ?? (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </Td>
                        <Td className="tabular-nums text-muted-foreground text-xs">
                          {row.remittedAt ?? "-"}
                        </Td>
                        <Td className="tabular-nums text-muted-foreground text-xs">
                          {currentClearedAt ?? "-"}
                        </Td>
                        <Td>
                          {currentTx ? (
                            <TxHashLink hash={currentTx} />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </Td>
                        <Td>
                          {currentStatus === "Remitted" && !isActive && (
                            <Button
                              size="sm"
                              variant="accent"
                              onClick={() =>
                                setActiveRowId(isActive ? null : row.id)
                              }
                            >
                              Tinjau
                            </Button>
                          )}
                          {currentStatus === "Cleared" && (
                            <span className="flex items-center gap-1 text-xs text-emerald-700">
                              <CheckCircle2 size={12} />
                              Terverifikasi
                            </span>
                          )}
                          {currentStatus === "Disputed" && (
                            <span className="flex items-center gap-1 text-xs text-red-700">
                              <ShieldAlert size={12} />
                              Bermasalah
                            </span>
                          )}
                          {currentStatus === "Pending" && (
                            <span className="text-xs text-muted-foreground">
                              Menunggu KMP
                            </span>
                          )}
                        </Td>
                      </Tr>
                      {isActive && currentStatus === "Remitted" && (
                        <RemittanceActionPanel
                          key={`${row.id}-panel`}
                          row={row}
                          onCleared={(rowId, txHash) => {
                            onCleared(rowId, txHash);
                            setActiveRowId(null);
                          }}
                          onDisputed={(rowId, txHash, reason) => {
                            onDisputed(rowId, txHash, reason);
                            setActiveRowId(null);
                          }}
                          onClose={() => setActiveRowId(null)}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </TBody>
            </Table>
          </TableFrame>
        </div>
      ) : null}
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResiduRekonsiliasiPage() {
  const metrics = useMemo(() => protocolMetrics(), []);

  const [rowStates, setRowStates] = useState<Record<string, RowState>>(
    initRowStates,
  );

  const [expandedCoops, setExpandedCoops] = useState<Set<string>>(
    () => new Set(["coop-0001"]), // expand Sukamaju by default
  );

  const [search, setSearch] = useState<string>("");

  const handleCleared = useCallback(
    (rowId: string, txHash: string) => {
      setRowStates((prev) => {
        const next: RowState = {
          status: "Cleared",
          txHash,
          clearedAt: new Date().toISOString().slice(0, 10),
          disputed: false,
          disputeReason: null,
        };
        return { ...prev, [rowId]: next };
      });
    },
    [],
  );

  const handleDisputed = useCallback(
    (rowId: string, txHash: string, reason: string) => {
      setRowStates((prev) => {
        const existing = prev[rowId];
        const next: RowState = {
          status: "Disputed",
          txHash,
          clearedAt: existing?.clearedAt ?? null,
          disputed: true,
          disputeReason: reason,
        };
        return { ...prev, [rowId]: next };
      });
    },
    [],
  );

  function toggleCoop(coopId: string) {
    setExpandedCoops((prev) => {
      const next = new Set(prev);
      if (next.has(coopId)) next.delete(coopId);
      else next.add(coopId);
      return next;
    });
  }

  // Group rows by coop
  const rowsByCoopId = useMemo(() => {
    const map = new Map<string, OversightResiduRow[]>();
    for (const row of OVERSIGHT_RESIDU_ROWS) {
      if (!map.has(row.coopId)) map.set(row.coopId, []);
      map.get(row.coopId)?.push(row);
    }
    return map;
  }, []);

  // Filter coops by search
  const filteredCoopIds = useMemo(() => {
    const coopIds = [...new Set(OVERSIGHT_RESIDU_ROWS.map((r) => r.coopId))];
    if (!search.trim()) return coopIds;
    const q = search.toLowerCase();
    return coopIds.filter((id) => {
      const rows = rowsByCoopId.get(id) ?? [];
      const coopName = rows[0]?.coopName ?? "";
      return (
        coopName.toLowerCase().includes(q) ||
        rows.some((r) => r.farmerName.toLowerCase().includes(q))
      );
    });
  }, [search, rowsByCoopId]);

  // Protocol residu stats
  const totalPending = metrics.residuPending;
  const totalRemitted = metrics.residuRemitted;
  const totalCleared = metrics.residuCleared;
  const frozenCoops = MOCK_COOP_PROFILES.filter((c) => c.reputation.frozen).length;

  return (
    <div className="space-y-6">
      <OversightPageHeader
        title="Rekonsiliasi Residu"
        description="Ledger antar-lembaga: pokok Agrinas yang tersimpan di kas koperasi. Dual gate: KMP mencatat, Agrinas memverifikasi. Sengketa adalah indikator tinjauan manusia."
      />

      {/* Alert: residu is Agrinas's money */}
      <Alert tone="warning" title="Residu pokok bukan milik koperasi">
        Ini adalah uang pokok saprotan Agrinas yang dikumpulkan saat panen dan
        disimpan sementara di kas KMP. Verifikasi setelah menerima konfirmasi bank.
        Sengketa membekukan reputasi on-chain KMP sebagai indikator, bukan tuduhan.
      </Alert>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Belum Diterima"
          value={<RupiahAmount smallest={totalPending} className="text-3xl" />}
          hint="KMP belum remit ke Agrinas"
          tone={totalPending > 0n ? "warn" : "good"}
          icon={<Landmark size={18} />}
        />
        <StatCard
          label="Menunggu Verifikasi"
          value={<RupiahAmount smallest={totalRemitted} className="text-3xl" />}
          hint="KMP sudah remit, Agrinas perlu verifikasi"
          tone={totalRemitted > 0n ? "warn" : "good"}
          icon={<Building2 size={18} />}
        />
        <StatCard
          label="Terverifikasi"
          value={<RupiahAmount smallest={totalCleared} className="text-3xl" />}
          hint="Residu diterima dan dikonfirmasi"
          tone="good"
          icon={<ShieldCheck size={18} />}
        />
        <StatCard
          label="KMP Dibekukan"
          value={String(frozenCoops)}
          hint="Reputasi on-chain dibekukan sementara"
          tone={frozenCoops > 0 ? "bad" : "good"}
          icon={<Lock size={18} />}
        />
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Cari nama koperasi atau petani..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-ring sm:max-w-sm"
      />

      {/* Per-coop sections */}
      <div className="space-y-4">
        {filteredCoopIds.map((coopId) => {
          const rows = rowsByCoopId.get(coopId) ?? [];
          const coopName = rows[0]?.coopName ?? coopId;
          return (
            <CoopResiduSection
              key={coopId}
              coopId={coopId}
              coopName={coopName}
              rows={rows}
              rowStates={rowStates}
              onCleared={handleCleared}
              onDisputed={handleDisputed}
              expanded={expandedCoops.has(coopId)}
              onToggle={() => toggleCoop(coopId)}
            />
          );
        })}
        {filteredCoopIds.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada koperasi yang sesuai pencarian.
          </p>
        )}
      </div>

      {/* Dual gate explainer */}
      <Card>
        <CardHeader
          title="Dual Gate Residu: Cara Kerja"
          description="Dua tahap verifikasi melindungi Agrinas dan mendisiplinkan KMP."
          action={<ShieldCheck size={16} className="text-aqua-400" />}
        />
        <CardContent className="space-y-3">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-verdant-100 text-[10px] font-bold text-verdant-700">
                1
              </span>
              <div>
                <p className="font-medium">KMP Tandai Disetor</p>
                <p className="text-muted-foreground">
                  KMP memasukkan referensi bank dan menandai sudah remit. Status
                  berubah ke Menunggu Verifikasi. Komitmen ini dikunci on-chain.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-aqua-100 text-[10px] font-bold text-aqua-700">
                2
              </span>
              <div>
                <p className="font-medium">Agrinas Verifikasi</p>
                <p className="text-muted-foreground">
                  Agrinas menekan Setujui Remitansi setelah mengkonfirmasi catatan
                  bank. Status berubah ke Terverifikasi.{" "}
                  <span className="font-mono">confirm_remittance</span> dicatat di
                  Stellar.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                !
              </span>
              <div>
                <p className="font-medium">Jika Ada Sengketa</p>
                <p className="text-muted-foreground">
                  Agrinas dapat Ajukan Sengketa jika ada selisih. Ini hanya indikator
                  untuk peninjauan manusia, bukan tuduhan otomatis. Reputasi on-chain
                  KMP dibekukan sementara. Penyelesaian dilakukan di luar sistem oleh
                  pihak berwenang.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
