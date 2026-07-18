"use client";

/**
 * Screen I: Rekonsiliasi Residu (Supplier view) — LIVE.
 *
 * Ledger = GET /residu (indexer-projected residu_remittance rows, keyed by the
 * agreement's REAL on-chain id). Two write actions on Remitted rows:
 *   - Setujui Remitansi (confirm_remittance)     -> Cleared
 *   - Ajukan Sengketa  (flag_remittance_dispute) -> Disputed + frozen indicator
 * Both Supplier-signed via useTx on row.agreementOnchainId — no mock mapping.
 * Disputed is a human-review indicator, never an automatic accusation.
 */

import { OversightPageHeader } from "@/components/oversight/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { useTx } from "@/components/kmp/use-tx";
import { confirmRemittance, flagRemittanceDispute, toReasonSymbol } from "@/lib/invocations";
import { type ApiResidu, fetchCoop, fetchResidu } from "@/lib/api";
import { useApi } from "@/lib/use-api";
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
  Building2,
  CheckCircle2,
  Landmark,
  Lock,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Fragment, useMemo, useRef, useState, useEffect } from "react";

// ─── Per-row local overlay (until the indexer projects the new status) ────────

interface RowOverlay {
  status: ResiduStatus;
  txHash: string | null;
  clearedAt: string | null;
}

// ─── Per-row action panel ─────────────────────────────────────────────────────

function RemittanceActionPanel({
  row,
  coopName,
  onCleared,
  onDisputed,
  onClose,
}: {
  row: ApiResidu;
  coopName: string;
  onCleared: (rowId: string, txHash: string) => void;
  onDisputed: (rowId: string, txHash: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"approve" | "dispute" | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>("");

  const { t } = useI18n();
  const txApprove = useTx();
  const txDispute = useTx();

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
      onDisputed(row.id, txDispute.txHash);
    }
  }, [txDispute.state, txDispute.txHash, row.id, onDisputed]);

  return (
    <tr>
      <td colSpan={9} className="bg-aqua-50/60 px-4 py-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-aqua-800">
              Tindakan untuk remitansi {coopName}, Perjanjian #{String(row.agreementOnchainId)}
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
            {coopName} (Ref: {row.bankRef ?? "tidak ada referensi bank"}). Verifikasi catatan bank
            sebelum menyetujui.
          </Alert>

          {(txApprove.error || txDispute.error) && (
            <Alert tone="warning" title={t("common.error")}>
              {txApprove.error ?? txDispute.error}
            </Alert>
          )}

          {mode === null && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCircle2 size={13} />}
                onClick={() => setMode("approve")}
              >
                {t("page.oversight.supplier.residu.action.approve")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ShieldAlert size={13} />}
                onClick={() => setMode("dispute")}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                {t("page.oversight.supplier.residu.action.dispute")}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t("page.oversight.supplier.residu.action.cancel")}
              </Button>
            </div>
          )}

          {mode === "approve" && txApprove.state !== "success" && (
            <div className="space-y-3">
              <Alert tone="info">
                <span className="text-sm">
                  {t("page.oversight.supplier.residu.action.approveHint")}
                </span>
              </Alert>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<ShieldCheck size={13} />}
                  disabled={txApprove.state !== "idle"}
                  onClick={() =>
                    txApprove.run((signer) => confirmRemittance(signer, row.agreementOnchainId))
                  }
                >
                  {txApprove.state === "signing"
                    ? "Menandatangani..."
                    : txApprove.state === "submitting"
                      ? "Mencatat di Stellar..."
                      : t("page.oversight.supplier.residu.action.confirm")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                  {t("common.back")}
                </Button>
              </div>
            </div>
          )}

          {mode === "dispute" && txDispute.state !== "success" && (
            <div className="space-y-3">
              <Alert tone="warning" title="Ini hanya indikator untuk peninjauan manusia">
                <span className="text-sm">
                  {t("page.oversight.supplier.residu.action.disputeHint")}
                </span>
              </Alert>
              <div>
                <label
                  htmlFor="dispute-reason"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  {t("page.oversight.supplier.residu.disputeReason")}
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
                  onClick={() =>
                    txDispute.run((signer) =>
                      flagRemittanceDispute(
                        signer,
                        row.agreementOnchainId,
                        toReasonSymbol(disputeReason, "DISPUTE"),
                      ),
                    )
                  }
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {txDispute.state === "signing"
                    ? "Menandatangani..."
                    : txDispute.state === "submitting"
                      ? "Mencatat di Stellar..."
                      : t("page.oversight.supplier.residu.action.submitDispute")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                  {t("common.back")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResiduRekonsiliasiPage() {
  const { t } = useI18n();
  const { data: ledger, loading, error, refetch } = useApi(fetchResidu);
  const { data: coopData } = useApi(fetchCoop);
  const coopName = coopData?.coop?.name ?? "KMP";

  // Local overlay: rows we just wrote, until the indexer projects them.
  const [overlays, setOverlays] = useState<Record<string, RowOverlay>>({});
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  const rows = useMemo(() => {
    const all = ledger ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? all.filter(
          (r) =>
            r.farmerName.toLowerCase().includes(q) ||
            String(r.agreementOnchainId).includes(q) ||
            r.commodityCode.toLowerCase().includes(q),
        )
      : all;
    return filtered.map((r) => {
      const o = overlays[r.id];
      return o
        ? { ...r, status: o.status, txHash: o.txHash ?? r.txHash, clearedAt: o.clearedAt }
        : r;
    });
  }, [ledger, overlays, search]);

  const sum = (status: ResiduStatus) =>
    rows.filter((r) => r.status === status).reduce((s, r) => s + r.principalAmount, 0n);
  const totalPending = sum("Pending");
  const totalRemitted = sum("Remitted");
  const totalCleared = sum("Cleared");
  const disputedCount = rows.filter((r) => r.status === "Disputed").length;

  function handleCleared(rowId: string, txHash: string) {
    setOverlays((prev) => ({
      ...prev,
      [rowId]: {
        status: "Cleared",
        txHash,
        clearedAt: new Date().toISOString().slice(0, 10),
      },
    }));
    setActiveRowId(null);
    setTimeout(() => refetch(), 6000);
  }

  function handleDisputed(rowId: string, txHash: string) {
    setOverlays((prev) => ({
      ...prev,
      [rowId]: { status: "Disputed", txHash, clearedAt: null },
    }));
    setActiveRowId(null);
    setTimeout(() => refetch(), 6000);
  }

  return (
    <div className="space-y-6">
      <OversightPageHeader
        title={t("page.oversight.supplier.residu.title")}
        description={t("page.oversight.supplier.residu.desc")}
      />

      <Alert tone="warning" title="Residu pokok bukan milik koperasi">
        Ini adalah uang pokok saprotan Supplier yang dikumpulkan saat panen dan disimpan sementara
        di kas KMP. Verifikasi setelah menerima konfirmasi bank. Sengketa membekukan reputasi
        on-chain KMP sebagai indikator, bukan tuduhan.
      </Alert>

      {loading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
      {error && (
        <Alert tone="warning" title={t("common.error")}>
          {error}
        </Alert>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Belum Diterima"
          value={<RupiahAmount smallest={totalPending} className="text-3xl" />}
          hint="KMP belum remit ke Supplier"
          tone={totalPending > 0n ? "warn" : "good"}
          icon={<Landmark size={18} />}
        />
        <StatCard
          label="Menunggu Verifikasi"
          value={<RupiahAmount smallest={totalRemitted} className="text-3xl" />}
          hint="KMP sudah remit, Supplier perlu verifikasi"
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
          label="Sengketa Berjalan"
          value={String(disputedCount)}
          hint="Baris residu berstatus Disputed"
          tone={disputedCount > 0 ? "bad" : "good"}
          icon={<Lock size={18} />}
        />
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Cari nama petani, nomor perjanjian, atau komoditas..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-ring sm:max-w-sm"
      />

      {/* Ledger */}
      <Card>
        <CardHeader
          title={coopName}
          description="Semua baris residu dari perjanjian koperasi ini, langsung dari ledger on-chain."
        />
        <CardContent className="p-0">
          <TableFrame className="rounded-none border-0 shadow-none">
            <Table>
              <THead>
                <Th>Perjanjian</Th>
                <Th>{t("page.kmp.perjanjian.colHeader.farmer")}</Th>
                <Th>Pokok Supplier</Th>
                <Th>{t("common.status")}</Th>
                <Th>Ref Bank</Th>
                <Th>Tgl Remit</Th>
                <Th>Tgl Verif</Th>
                <Th>Tx</Th>
                <Th>{t("page.kmp.permintaan.table.col.actions")}</Th>
              </THead>
              <TBody>
                {rows.length === 0 ? (
                  <Tr>
                    <Td colSpan={9} className="py-8 text-center text-muted-foreground">
                      Belum ada baris residu.
                    </Td>
                  </Tr>
                ) : (
                  rows.map((row) => {
                    const isActive = activeRowId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <Tr>
                          <Td className="font-mono text-xs font-bold">
                            #{String(row.agreementOnchainId)}
                          </Td>
                          <Td className="font-medium">{row.farmerName}</Td>
                          <Td>
                            <RupiahAmount smallest={row.principalAmount} />
                          </Td>
                          <Td>
                            <ResiduStatusBadge status={row.status} />
                          </Td>
                          <Td className="font-mono text-xs text-muted-foreground">
                            {row.bankRef ?? <span className="text-muted-foreground">-</span>}
                          </Td>
                          <Td className="tabular-nums text-muted-foreground text-xs">
                            {row.remittedAt ? row.remittedAt.slice(0, 10) : "-"}
                          </Td>
                          <Td className="tabular-nums text-muted-foreground text-xs">
                            {row.clearedAt ? row.clearedAt.slice(0, 10) : "-"}
                          </Td>
                          <Td>
                            {row.txHash ? (
                              <TxHashLink hash={row.txHash} />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </Td>
                          <Td>
                            {row.status === "Remitted" && !isActive && (
                              <Button
                                size="sm"
                                variant="accent"
                                onClick={() => setActiveRowId(row.id)}
                              >
                                {t("common.view")}
                              </Button>
                            )}
                            {row.status === "Cleared" && (
                              <span className="flex items-center gap-1 text-xs text-emerald-700">
                                <CheckCircle2 size={12} />
                                {t("badge.residu.Cleared")}
                              </span>
                            )}
                            {row.status === "Disputed" && (
                              <span className="flex items-center gap-1 text-xs text-red-700">
                                <ShieldAlert size={12} />
                                Bermasalah
                              </span>
                            )}
                            {row.status === "Pending" && (
                              <span className="text-xs text-muted-foreground">Menunggu KMP</span>
                            )}
                          </Td>
                        </Tr>
                        {isActive && row.status === "Remitted" && (
                          <RemittanceActionPanel
                            key={`${row.id}-panel`}
                            row={row}
                            coopName={coopName}
                            onCleared={handleCleared}
                            onDisputed={handleDisputed}
                            onClose={() => setActiveRowId(null)}
                          />
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TBody>
            </Table>
          </TableFrame>
        </CardContent>
      </Card>

      {/* Dual gate explainer */}
      <Card>
        <CardHeader
          title="Dual Gate Residu: Cara Kerja"
          description="Dua tahap verifikasi melindungi Supplier dan mendisiplinkan KMP."
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
                  KMP memasukkan referensi bank dan menandai sudah remit. Status berubah ke
                  Menunggu Verifikasi. Komitmen ini dikunci on-chain.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-aqua-100 text-[10px] font-bold text-aqua-700">
                2
              </span>
              <div>
                <p className="font-medium">Supplier Verifikasi</p>
                <p className="text-muted-foreground">
                  Supplier menekan Setujui Remitansi setelah mengkonfirmasi catatan bank. Status
                  berubah ke Terverifikasi. <span className="font-mono">confirm_remittance</span>{" "}
                  dicatat di Stellar.
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
                  Supplier dapat Ajukan Sengketa jika ada selisih. Ini hanya indikator untuk
                  peninjauan manusia, bukan tuduhan otomatis. Reputasi on-chain KMP dibekukan
                  sementara. Penyelesaian dilakukan di luar sistem oleh pihak berwenang.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
