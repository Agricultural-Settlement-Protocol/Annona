"use client";

/**
 * Logistik Saprotan (Agrinas view) — saprotan dispatch desk.
 *
 * Pending dispatch requests from KMPs (from buildDispatchRequests) shown as
 * responsive cards. Each dispatch records dispatch_supply on Stellar via useMockTx.
 * Dispatched cards move to "Riwayat Dispatch" searchable table below.
 * "Cara Kerja Dispatch" explainer sits at the bottom, full-width 3-step horizontal.
 * No em dashes anywhere.
 */

import { OversightPageHeader } from "@/components/oversight/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { ScrollArea } from "@/components/scroll-area";
import { useMockTx } from "@/components/kmp/use-mock-tx";
import {
  DISPATCH_HISTORY,
  type DispatchHistoryRow,
  type DispatchRequest,
  buildDispatchRequests,
} from "@/lib/oversight-data";
import { formatRupiah } from "@annona/core";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  RupiahAmount,
  StatCard,
  TxHashLink,
} from "@annona/ui";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Package,
  Send,
  Truck,
  X,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Dispatch request card ────────────────────────────────────────────────────

function DispatchCard({
  request,
  onDispatched,
}: {
  request: DispatchRequest;
  onDispatched: (requestId: string, txHash: string) => void;
}) {
  const tx = useMockTx();
  const prevState = useRef(tx.state);

  useEffect(() => {
    const prev = prevState.current;
    prevState.current = tx.state;
    if (prev !== "success" && tx.state === "success" && tx.txHash) {
      onDispatched(request.requestId, tx.txHash);
      tx.reset();
    }
  }, [tx.state, tx.txHash, request.requestId, onDispatched, tx]);

  return (
    <div className="flex flex-col rounded-[14px] border border-aqua-200 bg-aqua-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{request.coopName}</p>
          <p className="text-xs text-muted-foreground">
            {request.kabupaten}, {request.agreementIds.length} perjanjian
          </p>
        </div>
        <Badge tone="aqua">Menunggu Dispatch</Badge>
      </div>

      <div className="mt-4 flex-1 space-y-2">
        {request.items.map(({ item, qty, principal }) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="text-foreground">
              {item.name}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {qty} {item.unitLabel}
              </span>
            </span>
            <RupiahAmount smallest={principal} className="text-sm tabular-nums" />
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-aqua-200 pt-2 text-sm font-semibold">
          <span>Total Pokok</span>
          <RupiahAmount smallest={request.grandTotal} className="text-sm font-bold tabular-nums" />
        </div>
      </div>

      <div className="mt-4">
        <Button
          variant="accent"
          size="sm"
          leftIcon={<Send size={13} />}
          disabled={tx.state !== "idle"}
          onClick={() => tx.run()}
          className="w-full"
        >
          {tx.state === "signing"
            ? "Menandatangani..."
            : tx.state === "submitting"
              ? "Mencatat di Stellar..."
              : `Dispatch ke ${request.coopName}`}
        </Button>
      </div>
    </div>
  );
}

// ─── History detail side sheet ────────────────────────────────────────────────

function HistoryDetailSheet({
  row,
  onClose,
}: {
  row: DispatchHistoryRow | null;
  onClose: () => void;
}) {
  if (!row) return null;
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Tutup detail"
      />
      {/* biome-ignore lint/a11y/useSemanticElements: side-sheet uses role="dialog" on div; native <dialog> lacks the CSS positioning primitives needed for this fixed-right layout */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detail riwayat dispatch"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-md overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="font-semibold text-foreground">Detail Dispatch</p>
            <p className="text-xs text-muted-foreground">
              {row.coopName}, {row.kabupaten}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status timeline */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Alur
            </p>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-aqua-100 text-aqua-700">
                  <Send size={13} />
                </div>
                <div className="mt-1 h-8 w-px bg-border" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Dispatched oleh Agrinas</p>
                <p className="text-xs text-muted-foreground">{row.dispatchedAt}</p>
                <TxHashLink hash={row.txHash} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-verdant-100 text-verdant-700">
                <CheckCircle2 size={13} />
              </div>
              <div>
                <p className={`text-sm font-medium ${row.status === "Diterima" ? "text-foreground" : "text-muted-foreground"}`}>
                  Diterima oleh KMP
                </p>
                {row.acceptedAt ? (
                  <p className="text-xs text-muted-foreground">{row.acceptedAt}</p>
                ) : (
                  <p className="text-xs text-amber-600">Menunggu accept_supply dari KMP</p>
                )}
              </div>
            </div>
          </div>

          {/* Item breakdown */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Barang Dikirim
            </p>
            <div className="divide-y divide-border rounded-[10px] border border-border">
              {row.items.map((item) => (
                <div key={item.code} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.qty} {item.unitLabel}
                    </p>
                  </div>
                  <RupiahAmount smallest={item.principal} className="text-sm tabular-nums" />
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 text-sm font-semibold bg-surface-muted">
                <span>Total Pokok</span>
                <RupiahAmount smallest={row.totalPokok} className="text-sm font-bold tabular-nums" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LogistikPage() {
  const initialRequests = useMemo(() => buildDispatchRequests(), []);
  const [dispatchedMap, setDispatchedMap] = useState<Record<string, string>>({});
  const [localHistory, setLocalHistory] = useState<DispatchHistoryRow[]>(DISPATCH_HISTORY);
  const [historySearch, setHistorySearch] = useState<string>("");
  const [detailRow, setDetailRow] = useState<DispatchHistoryRow | null>(null);

  const pendingRequests = initialRequests.filter((r) => !dispatchedMap[r.requestId]);

  const handleDispatched = useCallback(
    (requestId: string, txHash: string) => {
      const req = initialRequests.find((r) => r.requestId === requestId);
      if (!req) return;
      setDispatchedMap((prev) => ({ ...prev, [requestId]: txHash }));
      const newRow: DispatchHistoryRow = {
        id: `dsp-live-${requestId}`,
        coopId: req.coopId,
        coopName: req.coopName,
        kabupaten: req.kabupaten,
        dispatchedAt: new Date().toISOString().slice(0, 10),
        itemCount: req.items.length,
        totalPokok: req.grandTotal,
        status: "Dikirim",
        txHash,
        items: req.items.map(({ item, qty, principal }) => ({
          name: item.name,
          code: item.code,
          qty,
          unitLabel: item.unitLabel,
          principal,
        })),
        acceptedAt: null,
      };
      setLocalHistory((prev) => [newRow, ...prev]);
    },
    [initialRequests],
  );

  const filteredHistory = useMemo(() => {
    const q = historySearch.toLowerCase();
    if (!q) return localHistory;
    return localHistory.filter(
      (r) =>
        r.coopName.toLowerCase().includes(q) ||
        r.kabupaten.toLowerCase().includes(q) ||
        r.txHash.toLowerCase().includes(q),
    );
  }, [localHistory, historySearch]);

  const totalPending = pendingRequests.reduce((s, r) => s + r.grandTotal, 0n);
  const dispatchedCount = Object.keys(dispatchedMap).length;

  return (
    <div className="space-y-8">
      <OversightPageHeader
        title="Logistik Saprotan"
        description="Proses permintaan gabungan saprotan dari koperasi. Setiap dispatch dicatat on-chain sebagai dispatch_supply di Stellar."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Antrean Dispatch"
          value={String(pendingRequests.length)}
          hint="Permintaan KMP menunggu pengiriman"
          tone={pendingRequests.length > 0 ? "warn" : "good"}
          icon={<Truck size={18} />}
        />
        <StatCard
          label="Nilai Antrean"
          value={<RupiahAmount smallest={totalPending} className="text-3xl" />}
          hint="Total pokok permintaan belum dispatch"
          tone={totalPending > 0n ? "warn" : "good"}
          icon={<Package size={18} />}
        />
        <StatCard
          label="Dispatch Sesi Ini"
          value={String(dispatchedCount)}
          hint="Berhasil diproses sesi ini"
          tone={dispatchedCount > 0 ? "good" : "neutral"}
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label="Total Riwayat"
          value={String(localHistory.length)}
          hint="Seluruh riwayat dispatch"
          icon={<Send size={18} />}
        />
      </div>

      {/* Success banner */}
      {dispatchedCount > 0 && (
        <Alert
          tone="success"
          title={`${dispatchedCount} permintaan berhasil di-dispatch`}
        >
          <span className="text-sm">
            Koperasi akan menerima notifikasi dan mengkonfirmasi penerimaan saprotan.
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.values(dispatchedMap).map((hash) => (
              <TxHashLink key={hash} hash={hash} />
            ))}
          </div>
        </Alert>
      )}

      {/* Pending request cards */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Permintaan Menunggu Dispatch</p>
            <p className="text-xs text-muted-foreground">
              Setiap dispatch memanggil dispatch_supply dan dicatat di Stellar testnet.
            </p>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-border py-12 text-center">
            <CheckCircle2 size={36} className="mb-3 text-emerald-500" />
            <p className="font-medium text-foreground">Semua permintaan telah diproses</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tidak ada antrean dispatch saat ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingRequests.map((req) => (
              <DispatchCard
                key={req.requestId}
                request={req}
                onDispatched={handleDispatched}
              />
            ))}
          </div>
        )}
      </div>

      {/* Riwayat Dispatch */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-foreground">Riwayat Dispatch</p>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Cari KMP atau tx hash..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface py-1.5 pl-3 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <ScrollArea maxHeight={420}>
              <TableFrame>
                <Table>
                  <THead>
                    <Th>Tanggal</Th>
                    <Th>KMP</Th>
                    <Th>Kabupaten</Th>
                    <Th>Item</Th>
                    <Th className="text-right">Total Pokok</Th>
                    <Th>Status</Th>
                    <Th>Tx</Th>
                    <Th>Detail</Th>
                  </THead>
                  <TBody>
                    {filteredHistory.length === 0 ? (
                      <Tr>
                        <Td colSpan={8} className="py-8 text-center text-muted-foreground">
                          Tidak ada riwayat dispatch.
                        </Td>
                      </Tr>
                    ) : (
                      filteredHistory.map((row) => (
                        <Fragment key={row.id}>
                          <Tr>
                            <Td className="text-xs text-muted-foreground whitespace-nowrap">
                              {row.dispatchedAt}
                            </Td>
                            <Td className="font-medium">{row.coopName}</Td>
                            <Td className="text-xs text-muted-foreground">{row.kabupaten}</Td>
                            <Td className="text-sm tabular-nums">{row.itemCount}</Td>
                            <Td className="text-right">
                              <RupiahAmount smallest={row.totalPokok} className="text-sm tabular-nums" />
                            </Td>
                            <Td>
                              <Badge
                                tone={row.status === "Diterima" ? "success" : "aqua"}
                              >
                                {row.status}
                              </Badge>
                            </Td>
                            <Td>
                              <TxHashLink hash={row.txHash} />
                            </Td>
                            <Td>
                              <button
                                type="button"
                                onClick={() => setDetailRow(row)}
                                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-ring hover:text-foreground"
                              >
                                <ChevronRight size={12} />
                                Detail
                              </button>
                            </Td>
                          </Tr>
                        </Fragment>
                      ))
                    )}
                  </TBody>
                </Table>
              </TableFrame>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Cara Kerja Dispatch — bottom full-width */}
      <Card>
        <CardHeader
          title="Cara Kerja Dispatch Saprotan"
          description="Alur logistik dari permintaan KMP hingga saprotan aktif di lapangan."
        />
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {(
              [
                {
                  step: 1,
                  title: "Permintaan dari KMP",
                  desc: "KMP mengirim permintaan gabungan saprotan berdasarkan perjanjian aktif. Agrinas melihat total kebutuhan per koperasi.",
                },
                {
                  step: 2,
                  title: "Agrinas Dispatch",
                  desc: "Operator Agrinas menekan Dispatch. Transaksi dispatch_supply dicatat di Stellar testnet dengan detail item dan nilai pokok.",
                },
                {
                  step: 3,
                  title: "KMP Konfirmasi (accept_supply)",
                  desc: "Petugas KMP mengkonfirmasi penerimaan fisik saprotan. Transaksi accept_supply mengaktifkan utang petani sesuai perjanjian.",
                },
              ] as const
            ).map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aqua-100 text-sm font-bold text-aqua-700">
                  {step}
                </div>
                <div>
                  <p className="font-medium text-foreground">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                  {step < 3 && (
                    <ArrowRight
                      size={14}
                      className="mt-2 hidden text-muted-foreground sm:block"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* History detail sheet */}
      <HistoryDetailSheet row={detailRow} onClose={() => setDetailRow(null)} />
    </div>
  );
}
