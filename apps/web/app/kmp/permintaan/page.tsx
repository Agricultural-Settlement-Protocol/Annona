"use client";

/** Screen: Permintaan Saprotan — the bulk-request desk.
 *  KMP aggregates Created agreements into a single on-chain bulk request to
 *  Agrinas. Agrinas reads the same mv_bulk_request_queue; no email or Excel
 *  needed. CSV export exists as offline fallback. */

import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { useMockTx } from "@/components/kmp/use-mock-tx";
import {
  type MockAgreement,
  type SupplyRequestRow,
  type SupplyRequestStatus,
  aggregateSaprotanNeeds,
  getCatalogItem,
  supplyRequestRows,
} from "@/lib/mock-data";
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
  CheckCircle2,
  ClipboardList,
  Download,
  Link as LinkIcon,
  Package,
  Send,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

// ─── Status badge helper ─────────────────────────────────────────────────────

function RequestStatusBadge({ status }: { status: SupplyRequestStatus }) {
  if (status === "Draft")
    return <Badge tone="neutral">Draf</Badge>;
  if (status === "Terkirim")
    return <Badge tone="aqua">Terkirim ke Agrinas</Badge>;
  if (status === "Dikirim")
    return <Badge tone="aqua">Dalam Pengiriman</Badge>;
  // Diterima
  return <Badge tone="success">Diterima</Badge>;
}

// ─── Compact item summary helper ────────────────────────────────────────────

function compactItems(agreement: MockAgreement): string {
  const parts = agreement.inputs.map((inp) => {
    const item = getCatalogItem(inp.catalogId);
    const shortName = item ? item.name.replace(/\s*\d+.*$/, "").trim() : inp.catalogId;
    return `${inp.qty}x ${shortName}`;
  });
  return parts.join(", ");
}

// ─── CSV export ──────────────────────────────────────────────────────────────

function buildCsv(rows: (SupplyRequestRow & { effectiveStatus: SupplyRequestStatus })[]): string {
  const headers = ["Petani", "No. Perjanjian", "Rincian Barang", "Nilai Pokok (Rp)", "Perkiraan Panen", "Status"];
  const lines = rows.map((r) => {
    const items = compactItems(r.agreement);
    const principal = formatRupiah(r.agreement.basePriceAgrinas);
    return [
      r.farmer.name,
      `#${String(r.agreement.onchainId)}`,
      items,
      principal,
      r.agreement.expectedHarvestDate,
      r.effectiveStatus,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [headers.join(","), ...lines].join("\n");
}

function downloadCsv(rows: (SupplyRequestRow & { effectiveStatus: SupplyRequestStatus })[]) {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `permintaan-saprotan-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PermintaanPage() {
  // Base rows from mock read-model
  const baseRows = useMemo(() => supplyRequestRows(), []);

  // Local state: set of agreementIds that have been submitted (flipped to Terkirim)
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  // Effective rows with local-state override
  const rows = useMemo(
    () =>
      baseRows.map((r) => ({
        ...r,
        effectiveStatus: (submittedIds.has(r.agreement.id) ? "Terkirim" : r.status) as SupplyRequestStatus,
      })),
    [baseRows, submittedIds],
  );

  // Search filter
  const [search, setSearch] = useState("");
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.farmer.name.toLowerCase().includes(q));
  }, [rows, search]);

  // Checkbox selection (only Draft rows are selectable)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sync out de-selected if they become non-Draft
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of prev) {
        const row = rows.find((r) => r.agreement.id === id);
        if (!row || row.effectiveStatus !== "Draft") next.delete(id);
      }
      return next;
    });
  }, [rows]);

  const draftRows = filteredRows.filter((r) => r.effectiveStatus === "Draft");
  const allDraftSelected = draftRows.length > 0 && draftRows.every((r) => selectedIds.has(r.agreement.id));

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allDraftSelected) {
        for (const r of draftRows) next.delete(r.agreement.id);
      } else {
        for (const r of draftRows) next.add(r.agreement.id);
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Aggregation panel: selected Draft rows, fallback to all Draft rows
  const aggregationSource = useMemo(() => {
    const selDraft = rows.filter((r) => selectedIds.has(r.agreement.id) && r.effectiveStatus === "Draft");
    const allDraft = rows.filter((r) => r.effectiveStatus === "Draft");
    return selDraft.length > 0 ? selDraft : allDraft;
  }, [rows, selectedIds]);

  const aggregated = useMemo(
    () => aggregateSaprotanNeeds(aggregationSource.map((r) => r.agreement)),
    [aggregationSource],
  );

  const grandTotal = useMemo(
    () => aggregated.reduce((sum, a) => sum + a.principal, 0n),
    [aggregated],
  );

  // Stat counts
  const countDraft = rows.filter((r) => r.effectiveStatus === "Draft").length;
  const countTerkirim = rows.filter((r) => r.effectiveStatus === "Terkirim").length;
  const countDikirim = rows.filter((r) => r.effectiveStatus === "Dikirim").length;
  const countDiterima = rows.filter((r) => r.effectiveStatus === "Diterima").length;

  // Bulk submit tx
  const txSubmit = useMockTx();
  const prevState = useRef(txSubmit.state);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const prev = prevState.current;
    prevState.current = txSubmit.state;
    if (prev !== "success" && txSubmit.state === "success" && txSubmit.txHash) {
      setLastTxHash(txSubmit.txHash);
      setShowSuccess(true);
      // Flip selected Draft rows to Terkirim
      setSubmittedIds((prev) => {
        const next = new Set(prev);
        for (const id of selectedIds) next.add(id);
        return next;
      });
      setSelectedIds(new Set());
      txSubmit.reset();
    }
  }, [txSubmit.state, txSubmit.txHash, selectedIds, txSubmit]);

  function handleBulkSubmit() {
    if (txSubmit.state !== "idle" || selectedIds.size === 0) return;
    setShowSuccess(false);
    txSubmit.run();
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permintaan Saprotan"
        description="Rekap kebutuhan input petani (perjanjian Dibuat) yang dikirim KMP ke Agrinas sebagai permintaan gabungan. Setelah dikirim, Agrinas langsung melihat antrean ini di sistem operator tanpa perlu email atau berkas manual."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={() => downloadCsv(filteredRows)}
          >
            Ekspor CSV
          </Button>
        }
      />

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Draf"
          value={String(countDraft)}
          hint="Belum dikirim ke Agrinas"
          icon={<ClipboardList size={18} />}
          tone="neutral"
        />
        <StatCard
          label="Terkirim"
          value={String(countTerkirim)}
          hint="Menunggu pengiriman Agrinas"
          icon={<Send size={18} />}
          tone={countTerkirim > 0 ? "good" : "neutral"}
        />
        <StatCard
          label="Dalam Pengiriman"
          value={String(countDikirim)}
          hint="Saprotan sedang dikirim"
          icon={<Truck size={18} />}
          tone={countDikirim > 0 ? "good" : "neutral"}
        />
        <StatCard
          label="Diterima"
          value={String(countDiterima)}
          hint="Sudah diterima oleh KMP"
          icon={<CheckCircle2 size={18} />}
          tone={countDiterima > 0 ? "good" : "neutral"}
        />
      </div>

      {/* Success alert from last bulk submit */}
      {showSuccess && lastTxHash && (
        <Alert tone="success" title="Permintaan gabungan tercatat di chain">
          Agrinas melihat antrean ini di dasbor operatornya. Tidak perlu email atau berkas manual.{" "}
          <span className="mt-1 block">
            <TxHashLink hash={lastTxHash} />
          </span>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main table + bulk bar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search bar (bulk submit lives under the aggregation card) */}
          <input
            type="search"
            placeholder="Cari nama petani..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          />

          <TableFrame>
            <Table>
              <THead>
                <Th className="w-10">
                  <input
                    type="checkbox"
                    checked={allDraftSelected}
                    onChange={toggleAll}
                    aria-label="Pilih semua draf"
                    className="h-4 w-4 rounded border-border text-primary accent-primary"
                  />
                </Th>
                <Th>Petani</Th>
                <Th>Perjanjian</Th>
                <Th>Rincian Barang</Th>
                <Th className="text-right">Nilai Pokok</Th>
                <Th>Perkiraan Panen</Th>
                <Th>Status</Th>
              </THead>
              <TBody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Tidak ada permintaan yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const isDraft = r.effectiveStatus === "Draft";
                    const checked = selectedIds.has(r.agreement.id);
                    return (
                      <Tr key={r.agreement.id} className={checked ? "bg-verdant-50/60" : undefined}>
                        <Td>
                          {isDraft ? (
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRow(r.agreement.id)}
                              aria-label={`Pilih perjanjian ${r.farmer.name}`}
                              className="h-4 w-4 rounded border-border text-primary accent-primary"
                            />
                          ) : (
                            <span className="inline-block h-4 w-4" />
                          )}
                        </Td>
                        <Td>
                          <p className="font-medium text-foreground">{r.farmer.name}</p>
                          <p className="text-xs text-muted-foreground">{r.farmer.kecamatan}</p>
                        </Td>
                        <Td>
                          <Link
                            href={`/kmp/perjanjian/${r.agreement.id}`}
                            className="font-mono text-xs text-accent hover:underline"
                          >
                            #{String(r.agreement.onchainId)}
                          </Link>
                        </Td>
                        <Td>
                          <span className="text-xs text-muted-foreground">
                            {compactItems(r.agreement)}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <RupiahAmount smallest={r.agreement.basePriceAgrinas} className="text-sm" />
                        </Td>
                        <Td className="text-muted-foreground text-sm">
                          {r.agreement.expectedHarvestDate}
                        </Td>
                        <Td>
                          <RequestStatusBadge status={r.effectiveStatus} />
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </TBody>
            </Table>
          </TableFrame>

          {/* Explainer strip */}
          <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Alur selanjutnya:</span> Setelah Agrinas
            mengirim saprotan, kargo muncul di{" "}
            <Link href="/kmp/gudang" className="text-accent underline-offset-2 hover:underline">
              Gudang dan Pasokan
            </Link>{" "}
            untuk dikonfirmasi penerimaannya.
          </div>
        </div>

        {/* Aggregation panel + bulk submit */}
        <div className="lg:col-span-1">
          <div className="space-y-3 lg:sticky lg:top-6">
            <Card>
              <CardHeader
                title="Kebutuhan Gabungan"
                description={
                  selectedCount > 0
                    ? `Dari ${selectedCount} draf dipilih`
                    : "Semua draf (belum ada pilihan)"
                }
                action={<Package size={18} className="text-verdant-400" />}
              />
              <CardContent className="space-y-3">
                {aggregated.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada kebutuhan draf.</p>
                ) : (
                  <>
                    {aggregated.map(({ item, qty, principal }) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {qty} {item.unitLabel}
                          </p>
                        </div>
                        <RupiahAmount smallest={principal} className="shrink-0 text-sm" />
                      </div>
                    ))}

                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-sm font-semibold text-foreground">Total Pokok</span>
                      <RupiahAmount smallest={grandTotal} className="text-base" />
                    </div>

                    <div className="flex w-fit items-center gap-1 rounded-full bg-aqua-50 px-2.5 py-1 text-xs font-semibold text-aqua-700">
                      <LinkIcon size={10} />
                      Nilai dikunci saat submit ke Agrinas
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Bulk submit (moved out of the search row) */}
            <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                leftIcon={<Send size={16} />}
                disabled={selectedCount === 0 || txSubmit.state !== "idle"}
                onClick={handleBulkSubmit}
              >
                {txSubmit.state === "signing"
                  ? "Menandatangani..."
                  : txSubmit.state === "submitting"
                    ? "Mengirim ke chain..."
                    : selectedCount > 0
                      ? `Kirim Permintaan Gabungan (${selectedCount})`
                      : "Kirim Permintaan Gabungan"}
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {selectedCount > 0
                  ? "Permintaan dicatat di chain, langsung terlihat oleh Agrinas."
                  : "Pilih draf pada tabel untuk mengirim permintaan gabungan."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
