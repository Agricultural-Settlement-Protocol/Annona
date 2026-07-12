"use client";

/**
 * Penerimaan Hasil Panen (Agrinas view) — inbound harvest receiving desk.
 *
 * Inbound shipments FROM KMPs to Agrinas gudang. Status Dikirim = KMP marked as sent,
 * awaiting Agrinas confirmation. Agrinas inputs volume diterima; if it differs from
 * declared, status becomes Selisih with mandatory catatan.
 *
 * OFF-CHAIN for MVP: no tx hash shown. Label "Dicatat off-chain" displayed clearly.
 * History (Diterima + Selisih) is searchable with ScrollArea.
 * No em dashes anywhere.
 */

import { OversightPageHeader } from "@/components/oversight/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { ScrollArea } from "@/components/scroll-area";
import {
  OVERSIGHT_SHIPMENTS,
  type OversightShipment,
} from "@/lib/oversight-data";
import { weightedMoistureBps } from "@/lib/mock-data";
import { Alert, Badge, Button, Card, CardContent, CardHeader, Input, StatCard } from "@annona/ui";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Package,
  Truck,
  X,
} from "lucide-react";
import { Fragment, useCallback, useMemo, useRef, useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function moistureLabel(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

function ShipmentStatusBadge({ status }: { status: OversightShipment["status"] }) {
  if (status === "Dikirim") return <Badge tone="aqua">Dikirim</Badge>;
  if (status === "Diterima") return <Badge tone="success">Diterima</Badge>;
  if (status === "Selisih") return <Badge tone="danger">Selisih</Badge>;
  return <Badge tone="neutral">Draft</Badge>;
}

// ─── Inbound card (for Dikirim shipments) ─────────────────────────────────────

function InboundCard({
  shipment,
  onOpenDetail,
}: {
  shipment: OversightShipment;
  onOpenDetail: (s: OversightShipment) => void;
}) {
  const avgMoisture = weightedMoistureBps(shipment.lines);
  const grades = [...new Set(shipment.lines.map((l) => l.grade))].sort().join(", ");

  return (
    <div className="flex flex-col rounded-[14px] border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{shipment.coopName}</p>
          <p className="text-xs text-muted-foreground">Ref: {shipment.ref}</p>
        </div>
        <ShipmentStatusBadge status={shipment.status} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Komoditas</p>
          <p className="font-medium text-foreground">{shipment.commodityCode}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Volume Dikirim</p>
          <p className="font-medium text-foreground tabular-nums">
            {shipment.totalVolumeKg.toLocaleString("id-ID")} kg
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Grade Lot</p>
          <p className="font-medium text-foreground">{grades}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Kadar Air (rata-rata)</p>
          <p className="font-medium text-foreground">{moistureLabel(avgMoisture)}</p>
        </div>
      </div>
      {shipment.sentAt && (
        <p className="mt-2 text-xs text-muted-foreground">Tanggal kirim: {shipment.sentAt}</p>
      )}
      <div className="mt-4">
        <Button
          variant="primary"
          size="sm"
          leftIcon={<ChevronRight size={13} />}
          onClick={() => onOpenDetail(shipment)}
          className="w-full"
        >
          Konfirmasi Penerimaan
        </Button>
      </div>
    </div>
  );
}

// ─── Confirmation side sheet ──────────────────────────────────────────────────

function ConfirmSheet({
  shipment,
  onClose,
  onConfirm,
}: {
  shipment: OversightShipment | null;
  onClose: () => void;
  onConfirm: (id: string, receivedKg: number, catatan: string) => void;
}) {
  const [receivedInput, setReceivedInput] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("");
  const [errors, setErrors] = useState<{ received?: string; catatan?: string }>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  // Reset form when shipment changes
  if (shipment && shipment.id !== activeId) {
    setActiveId(shipment.id);
    setReceivedInput("");
    setCatatan("");
    setErrors({});
  }

  if (!shipment) return null;

  // Capture non-null reference so closures retain narrowed type
  const s = shipment;
  const declared = s.totalVolumeKg;
  const receivedKg = Number.parseInt(receivedInput.replace(/\D/g, ""), 10);
  const isSelisih = !Number.isNaN(receivedKg) && receivedKg !== declared;
  const selisihKg = !Number.isNaN(receivedKg) ? declared - receivedKg : null;

  function validate(): boolean {
    const errs: { received?: string; catatan?: string } = {};
    if (!receivedInput || Number.isNaN(receivedKg) || receivedKg <= 0) {
      errs.received = "Volume diterima wajib diisi";
    }
    if (isSelisih && !catatan.trim()) {
      errs.catatan = "Catatan selisih wajib diisi jika volume berbeda";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleConfirm() {
    if (!validate()) return;
    onConfirm(s.id, receivedKg, catatan);
    onClose();
  }

  const avgMoisture = weightedMoistureBps(s.lines);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Tutup panel"
      />
      {/* biome-ignore lint/a11y/useSemanticElements: side-sheet uses role="dialog" on div; native <dialog> lacks the CSS positioning primitives needed for this fixed-right layout */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Konfirmasi penerimaan kiriman"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-md overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="font-semibold text-foreground">Konfirmasi Penerimaan</p>
            <p className="text-xs text-muted-foreground">
              {s.coopName}, {s.ref}
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
          {/* Shipment summary */}
          <div className="rounded-[10px] border border-border bg-surface-muted p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Komoditas</span>
              <span className="font-medium">{s.commodityCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume Dinyatakan</span>
              <span className="font-medium tabular-nums">
                {declared.toLocaleString("id-ID")} kg
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kadar Air (rata-rata)</span>
              <span className="font-medium">{moistureLabel(avgMoisture)}</span>
            </div>
          </div>

          {/* Per-farmer lines */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rincian Per Petani
            </p>
            <div className="divide-y divide-border rounded-[10px] border border-border text-sm">
              {s.lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-xs text-muted-foreground">ID {line.farmerId}</p>
                    <p className="font-medium">Grade {line.grade}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">
                      {line.volumeKg.toLocaleString("id-ID")} kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Kadar air {moistureLabel(line.moistureBps)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div>
            <label
              className="mb-1 block text-sm font-medium text-foreground"
              htmlFor="confirm-received"
            >
              Volume Diterima (kg)
            </label>
            <Input
              id="confirm-received"
              type="number"
              value={receivedInput}
              onChange={(e) => {
                setReceivedInput(e.target.value);
                if (errors.received) setErrors((prev) => ({ ...prev, received: undefined }));
              }}
              placeholder={`Mis. ${declared}`}
            />
            {errors.received && (
              <p className="mt-1 text-xs text-red-600">{errors.received}</p>
            )}
          </div>

          {/* Selisih preview */}
          {!Number.isNaN(receivedKg) && receivedInput && (
            <div
              className={`flex items-start gap-3 rounded-[10px] border px-4 py-3 text-sm ${
                isSelisih
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-verdant-200 bg-verdant-50 text-verdant-800"
              }`}
            >
              {isSelisih ? (
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              )}
              <span>
                {isSelisih
                  ? `Selisih ${selisihKg != null && selisihKg > 0 ? "kurang" : "lebih"} ${Math.abs(selisihKg ?? 0).toLocaleString("id-ID")} kg dari volume yang dinyatakan.`
                  : "Volume sesuai dengan yang dinyatakan KMP."}
              </span>
            </div>
          )}

          {/* Catatan selisih */}
          {isSelisih && (
            <div>
              <label
                className="mb-1 block text-sm font-medium text-foreground"
                htmlFor="confirm-catatan"
              >
                Catatan Selisih (wajib)
              </label>
              <textarea
                id="confirm-catatan"
                value={catatan}
                onChange={(e) => {
                  setCatatan(e.target.value);
                  if (errors.catatan) setErrors((prev) => ({ ...prev, catatan: undefined }));
                }}
                rows={3}
                placeholder="Jelaskan penyebab selisih..."
                className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.catatan && (
                <p className="mt-1 text-xs text-red-600">{errors.catatan}</p>
              )}
            </div>
          )}

          {/* Off-chain notice */}
          <div className="flex items-start gap-2 rounded-[10px] bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>
              Dicatat off-chain. Jalur on-chain (confirm_receipt on Stellar) direncanakan v3.1.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirm}>
            {isSelisih && receivedInput ? "Tandai Selisih" : "Konfirmasi Diterima"}
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── History detail sheet ─────────────────────────────────────────────────────

function HistoryDetailSheet({
  shipment,
  onClose,
}: {
  shipment: OversightShipment | null;
  onClose: () => void;
}) {
  if (!shipment) return null;

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
        aria-label="Detail kiriman"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-md overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="font-semibold text-foreground">Detail Kiriman</p>
            <p className="text-xs text-muted-foreground">
              {shipment.coopName}, {shipment.ref}
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

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center gap-3">
            <ShipmentStatusBadge status={shipment.status} />
            {shipment.status === "Selisih" && (
              <span className="text-sm text-amber-700 font-medium">Perlu tindak lanjut</span>
            )}
          </div>

          <div className="rounded-[10px] border border-border bg-surface-muted p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Komoditas</span>
              <span className="font-medium">{shipment.commodityCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume Dinyatakan</span>
              <span className="font-medium tabular-nums">
                {shipment.totalVolumeKg.toLocaleString("id-ID")} kg
              </span>
            </div>
            {shipment.receivedVolumeKg != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume Diterima</span>
                <span className={`font-medium tabular-nums ${shipment.receivedVolumeKg !== shipment.totalVolumeKg ? "text-amber-700" : "text-verdant-700"}`}>
                  {shipment.receivedVolumeKg.toLocaleString("id-ID")} kg
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tanggal Kirim</span>
              <span className="font-medium">{shipment.sentAt ?? "-"}</span>
            </div>
            {shipment.receivedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal Terima</span>
                <span className="font-medium">{shipment.receivedAt}</span>
              </div>
            )}
          </div>

          {shipment.discrepancyNote && (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-medium mb-1">Catatan Selisih</p>
              <p>{shipment.discrepancyNote}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rincian Per Petani
            </p>
            <div className="divide-y divide-border rounded-[10px] border border-border text-sm">
              {shipment.lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-xs text-muted-foreground">ID {line.farmerId}</p>
                    <p className="font-medium">Grade {line.grade}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">
                      {line.volumeKg.toLocaleString("id-ID")} kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Kadar air {moistureLabel(line.moistureBps)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-[10px] bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>
              Dicatat off-chain. Jalur on-chain direncanakan v3.1.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PenerimaanPage() {
  const [shipments, setShipments] = useState<OversightShipment[]>(OVERSIGHT_SHIPMENTS);
  const [confirmTarget, setConfirmTarget] = useState<OversightShipment | null>(null);
  const [historySearch, setHistorySearch] = useState<string>("");
  const [historyDetail, setHistoryDetail] = useState<OversightShipment | null>(null);

  const pendingShipments = useMemo(
    () => shipments.filter((s) => s.status === "Dikirim"),
    [shipments],
  );

  const historyShipments = useMemo(
    () => shipments.filter((s) => s.status === "Diterima" || s.status === "Selisih"),
    [shipments],
  );

  const filteredHistory = useMemo(() => {
    const q = historySearch.toLowerCase();
    if (!q) return historyShipments;
    return historyShipments.filter(
      (s) =>
        s.coopName.toLowerCase().includes(q) ||
        s.ref.toLowerCase().includes(q) ||
        s.commodityCode.toLowerCase().includes(q),
    );
  }, [historyShipments, historySearch]);

  const handleConfirm = useCallback(
    (id: string, receivedKg: number, catatan: string) => {
      setShipments((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const hasSelisih = receivedKg !== s.totalVolumeKg;
          return {
            ...s,
            status: hasSelisih ? "Selisih" : "Diterima",
            receivedVolumeKg: receivedKg,
            receivedAt: new Date().toISOString().slice(0, 10),
            discrepancyNote: hasSelisih ? catatan : null,
          } as OversightShipment;
        }),
      );
    },
    [],
  );

  // Stats
  const diterimaBulanIni = historyShipments
    .filter((s) => s.status === "Diterima")
    .reduce((sum, s) => sum + (s.receivedVolumeKg ?? 0), 0);
  const selisihCount = historyShipments.filter((s) => s.status === "Selisih").length;

  return (
    <div className="space-y-8">
      <OversightPageHeader
        title="Penerimaan Hasil Panen"
        description="Konfirmasi kiriman gabah dari koperasi ke gudang Agrinas. Pencatatan off-chain; jalur on-chain direncanakan v3.1."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Menunggu Konfirmasi"
          value={String(pendingShipments.length)}
          hint="Kiriman belum dikonfirmasi Agrinas"
          tone={pendingShipments.length > 0 ? "warn" : "good"}
          icon={<Truck size={18} />}
        />
        <StatCard
          label="Diterima Bulan Ini"
          value={`${diterimaBulanIni.toLocaleString("id-ID")} kg`}
          hint="Volume gabah dikonfirmasi Agrinas"
          tone="good"
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label="Selisih Tercatat"
          value={String(selisihCount)}
          hint="Kiriman dengan selisih volume"
          tone={selisihCount > 0 ? "bad" : "neutral"}
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {/* Off-chain notice */}
      <Alert tone="info" title="Penerimaan dicatat off-chain">
        <span className="text-sm">
          Konfirmasi di halaman ini belum terhubung ke Stellar. Jalur on-chain
          (confirm_receipt) direncanakan pada versi v3.1.
        </span>
      </Alert>

      {/* Pending shipments */}
      <div>
        <div className="mb-4">
          <p className="font-semibold text-foreground">Kiriman Menunggu Konfirmasi</p>
          <p className="text-xs text-muted-foreground">
            Klik "Konfirmasi Penerimaan" untuk mencatat volume aktual yang diterima di gudang.
          </p>
        </div>

        {pendingShipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-border py-12 text-center">
            <CheckCircle2 size={36} className="mb-3 text-emerald-500" />
            <p className="font-medium text-foreground">Semua kiriman telah dikonfirmasi</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tidak ada kiriman yang menunggu konfirmasi.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingShipments.map((s) => (
              <InboundCard
                key={s.id}
                shipment={s}
                onOpenDetail={setConfirmTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-foreground">Riwayat Penerimaan</p>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Cari KMP atau ref..."
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
                    <Th>Ref</Th>
                    <Th>KMP Asal</Th>
                    <Th>Komoditas</Th>
                    <Th className="text-right">Dinyatakan (kg)</Th>
                    <Th className="text-right">Diterima (kg)</Th>
                    <Th>Status</Th>
                    <Th>Tanggal Terima</Th>
                    <Th>Detail</Th>
                  </THead>
                  <TBody>
                    {filteredHistory.length === 0 ? (
                      <Tr>
                        <Td colSpan={8} className="py-8 text-center text-muted-foreground">
                          Tidak ada riwayat penerimaan.
                        </Td>
                      </Tr>
                    ) : (
                      filteredHistory.map((s) => (
                        <Fragment key={s.id}>
                          <Tr>
                            <Td className="font-mono text-xs text-muted-foreground">{s.ref}</Td>
                            <Td className="font-medium">{s.coopName}</Td>
                            <Td className="text-xs text-muted-foreground">{s.commodityCode}</Td>
                            <Td className="text-right tabular-nums text-sm">
                              {s.totalVolumeKg.toLocaleString("id-ID")}
                            </Td>
                            <Td className="text-right tabular-nums text-sm">
                              {s.receivedVolumeKg != null
                                ? s.receivedVolumeKg.toLocaleString("id-ID")
                                : "-"}
                            </Td>
                            <Td>
                              <ShipmentStatusBadge status={s.status} />
                            </Td>
                            <Td className="text-xs text-muted-foreground whitespace-nowrap">
                              {s.receivedAt ?? "-"}
                            </Td>
                            <Td>
                              <button
                                type="button"
                                onClick={() => setHistoryDetail(s)}
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

      {/* Confirmation sheet */}
      <ConfirmSheet
        shipment={confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
      />

      {/* History detail sheet */}
      <HistoryDetailSheet
        shipment={historyDetail}
        onClose={() => setHistoryDetail(null)}
      />
    </div>
  );
}
