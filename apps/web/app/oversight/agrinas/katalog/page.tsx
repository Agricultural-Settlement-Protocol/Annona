"use client";

/**
 * Screen M: Katalog dan Logistik (Agrinas view).
 *
 * 1. Base Price Control Matrix: saprotan catalog table, editable price per
 *    item (off-chain label). Edit state is local (demo).
 * 2. KMP Bulk Request Terminal: aggregated Created agreements grouped per KMP,
 *    dispatch_supply action per request group via useMockTx.
 */

import { OversightPageHeader } from "@/components/oversight/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { useMockTx } from "@/components/kmp/use-mock-tx";
import {
  type DispatchRequest,
  buildDispatchRequests,
  buildEditableCatalog,
  type EditableCatalogRow,
} from "@/lib/oversight-data";
import { formatRupiah } from "@annona/core";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  RupiahAmount,
  StatCard,
  TxHashLink,
} from "@annona/ui";
import {
  CheckCircle2,
  Edit3,
  Package,
  Save,
  Send,
  Truck,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";

// ─── Dispatch terminal item ──────────────────────────────────────────────────

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
    <div className="rounded-lg border border-aqua-200 bg-aqua-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{request.coopName}</p>
          <p className="text-xs text-muted-foreground">
            {request.kabupaten}, {request.agreementIds.length} perjanjian
          </p>
        </div>
        <Badge tone="aqua">Menunggu Dispatch</Badge>
      </div>

      {/* Item breakdown */}
      <div className="mt-3 space-y-1">
        {request.items.map(({ item, qty, principal }) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="text-foreground">
              {item.name}
              <span className="ml-1 text-xs text-muted-foreground">
                {qty} {item.unitLabel}
              </span>
            </span>
            <RupiahAmount smallest={principal} className="text-sm" />
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-aqua-200 pt-2 text-sm font-semibold">
          <span>Total Pokok</span>
          <RupiahAmount smallest={request.grandTotal} className="text-sm font-bold" />
        </div>
      </div>

      {/* Dispatch action */}
      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="accent"
          size="sm"
          leftIcon={<Send size={13} />}
          disabled={tx.state !== "idle"}
          onClick={() => tx.run()}
          className="flex-1"
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

// ─── Main page ───────────────────────────────────────────────────────────────

export default function KatalogPage() {
  // ── Catalog edit state ────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<EditableCatalogRow[]>(() =>
    buildEditableCatalog(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savedId, setSavedId] = useState<string | null>(null);

  function openEdit(id: string, current: bigint) {
    setEditingId(id);
    // Show as whole rupiah for editing
    const wholeRupiah = Number(current / 10_000_000n);
    setEditValue(String(wholeRupiah));
    setSavedId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  function saveEdit(id: string) {
    const parsed = Number.parseInt(editValue.replace(/\D/g, ""), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setCatalog((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, proposedPrice: BigInt(parsed) * 10_000_000n }
            : row,
        ),
      );
      setSavedId(id);
    }
    setEditingId(null);
    setEditValue("");
  }

  // ── Dispatch requests ─────────────────────────────────────────────────
  const initialRequests = useMemo(() => buildDispatchRequests(), []);
  const [dispatchedIds, setDispatchedIds] = useState<
    Record<string, string>
  >({}); // requestId -> txHash

  const handleDispatched = useCallback(
    (requestId: string, txHash: string) => {
      setDispatchedIds((prev) => ({ ...prev, [requestId]: txHash }));
    },
    [],
  );

  const pendingRequests = initialRequests.filter(
    (r) => !dispatchedIds[r.requestId],
  );

  // Stats
  const totalItems = catalog.length;
  const modifiedItems = catalog.filter((r) => r.proposedPrice !== null).length;
  const totalPending = pendingRequests.reduce(
    (s, r) => s + r.grandTotal,
    0n,
  );
  const dispatchedCount = Object.keys(dispatchedIds).length;

  return (
    <div className="space-y-6">
      <OversightPageHeader
        title="Katalog dan Logistik"
        description="Kelola harga pokok saprotan dan proses permintaan gabungan dari koperasi. Data harga adalah off-chain; dispatch dicatat di Stellar."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Item Katalog"
          value={String(totalItems)}
          hint="Jenis saprotan terdaftar"
          icon={<Package size={18} />}
        />
        <StatCard
          label="Harga Direvisi"
          value={String(modifiedItems)}
          hint="Item dengan usulan harga baru (sesi ini)"
          tone={modifiedItems > 0 ? "warn" : "neutral"}
          icon={<Edit3 size={18} />}
        />
        <StatCard
          label="Nilai Antrean"
          value={<RupiahAmount smallest={totalPending} className="text-3xl" />}
          hint="Total pokok permintaan belum dispatch"
          tone={totalPending > 0n ? "warn" : "good"}
          icon={<Truck size={18} />}
        />
        <StatCard
          label="Dispatch Selesai"
          value={String(dispatchedCount)}
          hint="Permintaan KMP berhasil diproses"
          tone={dispatchedCount > 0 ? "good" : "neutral"}
          icon={<CheckCircle2 size={18} />}
        />
      </div>

      {/* Dispatch success banner */}
      {Object.entries(dispatchedIds).length > 0 && (
        <Alert
          tone="success"
          title={`${Object.keys(dispatchedIds).length} permintaan berhasil di-dispatch`}
        >
          <span className="block text-sm">
            Koperasi akan menerima notifikasi dan mengkonfirmasi penerimaan saprotan
            di dasbor KMP mereka.
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.values(dispatchedIds).map((hash) => (
              <TxHashLink key={hash} hash={hash} />
            ))}
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Base price matrix */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader
              title="Matriks Harga Pokok Saprotan"
              description="Harga dasar Agrinas per item. Perubahan bersifat off-chain (tidak dicatat di blockchain). Label subsidi mengikuti status Pupuk Indonesia."
              action={
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                  Data lokal, tidak di blockchain
                </span>
              }
            />
            <CardContent className="p-0">
              <TableFrame>
                <Table>
                  <THead>
                    <Th>Kode</Th>
                    <Th>Nama Barang</Th>
                    <Th>Kategori</Th>
                    <Th>Satuan</Th>
                    <Th className="text-right">Harga Pokok</Th>
                    <Th>Subsidi</Th>
                    <Th>Aksi</Th>
                  </THead>
                  <TBody>
                    {catalog.map((row) => {
                      const isEditing = editingId === row.id;
                      const effectivePrice =
                        row.proposedPrice ?? row.basePriceAgrinas;
                      const isModified = row.proposedPrice !== null;
                      const justSaved = savedId === row.id;
                      return (
                        <Tr key={row.id}>
                          <Td className="font-mono text-xs text-muted-foreground">
                            {row.code}
                          </Td>
                          <Td className="font-medium">
                            {row.name}
                            {isModified && (
                              <span className="ml-1 text-xs text-amber-600">
                                (direvisi)
                              </span>
                            )}
                          </Td>
                          <Td>
                            <Badge
                              tone={
                                row.category === "pupuk"
                                  ? "verdant"
                                  : row.category === "benih"
                                    ? "aqua"
                                    : row.category === "pestisida"
                                      ? "warning"
                                      : "neutral"
                              }
                            >
                              {row.category}
                            </Badge>
                          </Td>
                          <Td className="text-xs text-muted-foreground">
                            {row.unitLabel}
                          </Td>
                          <Td className="text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-28 rounded border border-ring px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Rp/unit"
                                ref={(el) => el?.focus()}
                              />
                            ) : (
                              <RupiahAmount
                                smallest={effectivePrice}
                                className={`text-sm ${isModified ? "text-amber-700" : ""}`}
                              />
                            )}
                          </Td>
                          <Td>
                            <Badge
                              tone={row.subsidiFlag ? "success" : "neutral"}
                            >
                              {row.subsidiFlag ? "Subsidi" : "Non-subsidi"}
                            </Badge>
                          </Td>
                          <Td>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => saveEdit(row.id)}
                                  className="flex items-center gap-1 rounded-md bg-verdant-600 px-2 py-1 text-xs font-medium text-white hover:bg-verdant-700"
                                >
                                  <Save size={11} />
                                  Simpan
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : justSaved ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 size={12} />
                                Tersimpan
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(row.id, row.basePriceAgrinas)
                                }
                                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-ring hover:text-foreground"
                              >
                                <Edit3 size={11} />
                                Edit
                              </button>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </TableFrame>
            </CardContent>
          </Card>
        </div>

        {/* Dispatch terminal */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader
                title="Terminal Dispatch KMP"
                description="Permintaan gabungan dari koperasi. Setiap dispatch dicatat on-chain sebagai dispatch_supply."
                action={<Truck size={16} className="text-aqua-400" />}
              />
              <CardContent className="space-y-4">
                {pendingRequests.length === 0 ? (
                  <div className="py-6 text-center">
                    <CheckCircle2
                      size={32}
                      className="mx-auto mb-2 text-emerald-500"
                    />
                    <p className="text-sm text-muted-foreground">
                      Semua permintaan telah diproses.
                    </p>
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <DispatchCard
                      key={req.requestId}
                      request={req}
                      onDispatched={handleDispatched}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* How dispatch works */}
            <Card>
              <CardHeader
                title="Cara Kerja Dispatch"
                description="Alur logistik dari Agrinas ke koperasi."
              />
              <CardContent>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-aqua-100 text-[10px] font-bold text-aqua-700">
                      1
                    </span>
                    <span className="text-muted-foreground">
                      KMP mengirim permintaan gabungan saprotan dari perjanjian
                      aktif.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-aqua-100 text-[10px] font-bold text-aqua-700">
                      2
                    </span>
                    <span className="text-muted-foreground">
                      Agrinas menekan Dispatch. Transaksi{" "}
                      <span className="font-mono">dispatch_supply</span> dicatat
                      di Stellar.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-aqua-100 text-[10px] font-bold text-aqua-700">
                      3
                    </span>
                    <span className="text-muted-foreground">
                      Petugas KMP mengkonfirmasi penerimaan fisik.{" "}
                      <span className="font-mono">accept_supply</span> mengaktifkan
                      utang petani.
                    </span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
