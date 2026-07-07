"use client";

/**
 * Logistik — KMP forwards stored harvest to gudang Agrinas.
 *
 * Data: MOCK_SHIPMENTS, unshippedDeliveries(), weightedMoistureBps() from lib/mock-data.
 *
 * Layout:
 *   1. PageHeader
 *   2. Stat row: stok gudang KMP / dalam perjalanan / sudah diterima Agrinas
 *   3. "Stok Siap Kirim" — unshipped deliveries grouped by commodity + grade lot
 *   4. "Buat Pengiriman" — select deliveries via checkboxes, preview lot, pick tujuan,
 *      confirm (off-chain only; no fake tx; shows "Dicatat off-chain" notice)
 *   5. "Riwayat Pengiriman" — always-visible searchable table + DateRangePicker;
 *      row click opens ShipmentDetailSheet (portal-free fixed overlay, button backdrop).
 *
 * No em dashes. Money via RupiahAmount. No Stellar tx shown for off-chain logistics.
 */

import { DateRangePicker, type DateRange } from "@/components/kmp/date-range-picker";
import { PageHeader } from "@/components/kmp/page-header";
import { SearchSelect, type SearchSelectItem } from "@/components/kmp/search-select";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { ScrollArea } from "@/components/scroll-area";
import {
  MOCK_AGRINAS,
  MOCK_SHIPMENTS,
  type MockDelivery,
  type MockShipment,
  type ShipmentStatus,
  getFarmer,
  getAgreement,
  unshippedDeliveries,
  weightedMoistureBps,
} from "@/lib/mock-data";
import { Alert, Button, Card, CardContent, CardHeader, StatCard } from "@annona/ui";
import {
  AlertTriangle,
  ArrowRight,
  Box,
  CheckCircle2,
  Info,
  Package,
  Search,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shipmentStatusLabel(s: ShipmentStatus): string {
  if (s === "Draft") return "Draft";
  if (s === "Dikirim") return "Dikirim";
  if (s === "Diterima") return "Diterima";
  return "Selisih";
}

function shipmentStatusColors(s: ShipmentStatus): string {
  if (s === "Diterima") return "bg-verdant-100 text-verdant-700";
  if (s === "Dikirim") return "bg-aqua-100 text-aqua-700";
  if (s === "Selisih") return "bg-amber-100 text-amber-700";
  return "bg-surface-muted text-muted-foreground";
}

function ShipmentBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${shipmentStatusColors(status)}`}
    >
      {shipmentStatusLabel(status)}
    </span>
  );
}

function inDateRange(dateStr: string | null, range: DateRange): boolean {
  if (!range.start) return true;
  if (!dateStr) return true;
  const d = new Date(dateStr).getTime();
  const s = range.start.getTime();
  const e = range.end ? range.end.getTime() : s;
  return d >= s && d <= e + 86_399_999; // inclusive of end day
}

// ─── Shipment detail side sheet ───────────────────────────────────────────────

function ShipmentDetailSheet({
  shipment,
  onClose,
}: {
  shipment: MockShipment;
  onClose: () => void;
}) {
  // ESC closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
        aria-label={`Detail pengiriman ${shipment.ref}`}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-border bg-surface shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{shipment.ref}</h2>
              <ShipmentBadge status={shipment.status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {shipment.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan Kering"}{" "}
              ke {shipment.agrinasName}
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

        {/* Body */}
        <ScrollArea className="min-h-0 flex-1" viewportClassName="px-6 py-5" fade>
          <div className="space-y-5">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Total dikirim</p>
                <p className="font-semibold tabular-nums">
                  {shipment.totalVolumeKg.toLocaleString("id-ID")} kg
                </p>
              </div>
              {shipment.receivedVolumeKg !== null && (
                <div>
                  <p className="text-xs text-muted-foreground">Diterima Agrinas</p>
                  <p className="font-semibold tabular-nums">
                    {shipment.receivedVolumeKg.toLocaleString("id-ID")} kg
                  </p>
                </div>
              )}
              {shipment.sentAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal kirim</p>
                  <p>{shipment.sentAt}</p>
                </div>
              )}
              {shipment.receivedAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal terima</p>
                  <p>{shipment.receivedAt}</p>
                </div>
              )}
            </div>

            {/* Discrepancy note */}
            {shipment.status === "Selisih" && shipment.discrepancyNote && (
              <Alert tone="warning" title="Catatan Selisih">
                {shipment.discrepancyNote}
              </Alert>
            )}
            {shipment.discrepancyNote && shipment.status === "Diterima" && (
              <Alert tone="info" title="Catatan Penerimaan">
                {shipment.discrepancyNote}
              </Alert>
            )}

            {/* Line items per farmer */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Rincian per Petani
              </h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                        Petani
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                        Volume
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">
                        Grade
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                        Kadar Air
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {shipment.lines.map((line) => {
                      const farmer = getFarmer(line.farmerId);
                      return (
                        <tr key={line.id} className="bg-surface">
                          <td className="px-3 py-2">
                            {farmer?.name ?? line.farmerId}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {line.volumeKg.toLocaleString("id-ID")} kg
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={
                                line.grade === "A"
                                  ? "font-semibold text-verdant-700"
                                  : line.grade === "B"
                                    ? "font-semibold text-foreground"
                                    : "font-semibold text-amber-600"
                              }
                            >
                              Grade {line.grade}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {(line.moistureBps / 100).toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="rounded-lg bg-surface-muted/60 px-3 py-2 text-xs text-muted-foreground">
              Data logistik ini dicatat off-chain. Konfirmasi penerimaan dilakukan oleh Agrinas.
            </p>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

// ─── Lot grouping helpers ─────────────────────────────────────────────────────

interface DeliveryLot {
  commodityCode: string;
  grade: string;
  totalKg: number;
  avgMoistureBps: number;
  lines: Array<{ delivery: MockDelivery; farmerName: string; agreementRef: string }>;
}

function groupIntoLots(deliveries: MockDelivery[]): DeliveryLot[] {
  const map = new Map<string, DeliveryLot>();
  for (const d of deliveries) {
    const agreement = getAgreement(d.agreementId);
    const farmer = agreement ? getFarmer(agreement.farmerId) : undefined;
    const commodity = agreement?.commodityCode ?? "GABAH";
    const key = `${commodity}|${d.grade}`;
    let lot = map.get(key);
    if (!lot) {
      lot = {
        commodityCode: commodity,
        grade: d.grade,
        totalKg: 0,
        avgMoistureBps: 0,
        lines: [],
      };
      map.set(key, lot);
    }
    lot.lines.push({
      delivery: d,
      farmerName: farmer?.name ?? d.agreementId,
      agreementRef: `#${agreement ? String(agreement.onchainId) : d.agreementId}`,
    });
    lot.totalKg += d.volumeKg;
  }
  // compute weighted average moisture per lot
  for (const lot of map.values()) {
    lot.avgMoistureBps = weightedMoistureBps(
      lot.lines.map((l) => ({
        id: l.delivery.id,
        deliveryId: l.delivery.id,
        agreementId: l.delivery.agreementId,
        farmerId: getAgreement(l.delivery.agreementId)?.farmerId ?? "",
        volumeKg: l.delivery.volumeKg,
        grade: l.delivery.grade,
        moistureBps: l.delivery.moistureBps,
      })),
    );
  }
  return [...map.values()];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AGRINAS_OPTIONS: SearchSelectItem[] = [
  {
    id: MOCK_AGRINAS.id,
    label: "Gudang Agrinas Cianjur",
    sublabel: MOCK_AGRINAS.name,
  },
];

type LocalShipment = MockShipment & { isLocal?: boolean };

export default function LogistikPage() {
  const [search, setSearch] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [selectedShipment, setSelectedShipment] = useState<LocalShipment | null>(null);

  // Buat Pengiriman state
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set());
  const [tujuanId, setTujuanId] = useState<string | null>(MOCK_AGRINAS.id);
  const [shipmentSent, setShipmentSent] = useState(false);
  const [sending, setSending] = useState(false);

  // Local shipments created in this session
  const [localShipments, setLocalShipments] = useState<LocalShipment[]>([]);

  const unshipped = useMemo(() => unshippedDeliveries(), []);
  const lots = useMemo(() => groupIntoLots(unshipped), [unshipped]);

  // Shipments to show in history (mock + locally created)
  const allShipments: LocalShipment[] = useMemo(
    () => [...MOCK_SHIPMENTS, ...localShipments],
    [localShipments],
  );

  // Stats
  const stokKMPKg = useMemo(() => unshipped.reduce((s, d) => s + d.volumeKg, 0), [unshipped]);
  const dalamPerjalananKg = useMemo(
    () =>
      allShipments
        .filter((s) => s.status === "Dikirim")
        .reduce((sum, s) => sum + s.totalVolumeKg, 0),
    [allShipments],
  );
  const sudahDiterimaKg = useMemo(
    () =>
      allShipments
        .filter((s) => s.status === "Diterima")
        .reduce((sum, s) => sum + (s.receivedVolumeKg ?? s.totalVolumeKg), 0),
    [allShipments],
  );

  // Selected deliveries for preview
  const selectedDeliveries = useMemo(
    () => unshipped.filter((d) => selectedDeliveryIds.has(d.id)),
    [unshipped, selectedDeliveryIds],
  );
  const previewLots = useMemo(() => groupIntoLots(selectedDeliveries), [selectedDeliveries]);
  const previewTotalKg = selectedDeliveries.reduce((s, d) => s + d.volumeKg, 0);

  function toggleDelivery(id: string) {
    setSelectedDeliveryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShipmentSent(false);
  }

  function toggleLot(lot: DeliveryLot) {
    const lotIds = lot.lines.map((l) => l.delivery.id);
    const allSelected = lotIds.every((id) => selectedDeliveryIds.has(id));
    setSelectedDeliveryIds((prev) => {
      const next = new Set(prev);
      for (const id of lotIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    setShipmentSent(false);
  }

  function handleKirim() {
    if (!tujuanId || selectedDeliveries.length === 0) return;
    setSending(true);
    // Simulate a brief async off-chain record (no tx hash)
    setTimeout(() => {
      const now = new Date().toISOString().slice(0, 10);
      const newId = `shp-local-${Date.now()}`;
      const newShipment: LocalShipment = {
        id: newId,
        ref: `SHP-2026-${String(allShipments.length + 1).padStart(3, "0")}`,
        coopName: "KMP Sukamaju",
        agrinasId: MOCK_AGRINAS.id,
        agrinasName: "Gudang Agrinas Cianjur",
        commodityCode: selectedDeliveries[0]?.agreementId
          ? (getAgreement(selectedDeliveries[0].agreementId)?.commodityCode ?? "GABAH")
          : "GABAH",
        status: "Dikirim",
        totalVolumeKg: previewTotalKg,
        receivedVolumeKg: null,
        discrepancyNote: null,
        sentAt: now,
        receivedAt: null,
        createdAt: now,
        lines: selectedDeliveries.map((d, idx) => {
          const agr = getAgreement(d.agreementId);
          return {
            id: `shl-local-${idx}-${d.id}`,
            deliveryId: d.id,
            agreementId: d.agreementId,
            farmerId: agr?.farmerId ?? "",
            volumeKg: d.volumeKg,
            grade: d.grade,
            moistureBps: d.moistureBps,
          };
        }),
        isLocal: true,
      };
      setLocalShipments((prev) => [...prev, newShipment]);
      setSending(false);
      setShipmentSent(true);
      setSelectedDeliveryIds(new Set());
    }, 1200);
  }

  // Filtered history
  const q = search.trim().toLowerCase();
  const filteredShipments = useMemo(
    () =>
      allShipments.filter((s) => {
        const matchSearch =
          !q ||
          s.ref.toLowerCase().includes(q) ||
          s.commodityCode.toLowerCase().includes(q) ||
          s.status.toLowerCase().includes(q) ||
          s.agrinasName.toLowerCase().includes(q);
        const matchDate = inDateRange(s.sentAt ?? s.createdAt, dateRange);
        return matchSearch && matchDate;
      }),
    [allShipments, q, dateRange],
  );

  const canKirim = selectedDeliveries.length > 0 && !!tujuanId && !sending && !shipmentSent;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logistik Panen"
        description="Catat pengiriman hasil panen dari gudang KMP ke gudang Agrinas. Data logistik dicatat off-chain untuk MVP."
      />

      {/* ── Stat row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Stok Gudang KMP"
          value={`${stokKMPKg.toLocaleString("id-ID")} kg`}
          icon={<Warehouse size={18} />}
          tone={stokKMPKg > 0 ? "warn" : "good"}
          hint="Volume sudah disetor petani, belum dikirim ke Agrinas"
        />
        <StatCard
          label="Dalam Perjalanan"
          value={`${dalamPerjalananKg.toLocaleString("id-ID")} kg`}
          icon={<Truck size={18} />}
          tone={dalamPerjalananKg > 0 ? "warn" : "neutral"}
          hint="Dikirim, menunggu konfirmasi penerimaan Agrinas"
        />
        <StatCard
          label="Sudah Diterima Agrinas"
          value={`${sudahDiterimaKg.toLocaleString("id-ID")} kg`}
          icon={<CheckCircle2 size={18} />}
          tone="good"
          hint="Dikonfirmasi diterima di gudang Agrinas"
        />
      </div>

      {/* ── Stok Siap Kirim ── */}
      <Card>
        <CardHeader
          title="Stok Siap Kirim"
          description="Setoran panen petani yang sudah ada di gudang KMP, belum dikirim ke Agrinas. Pilih lot untuk buat pengiriman."
          action={<Package size={18} className="text-verdant-400" />}
        />
        <CardContent>
          {unshipped.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg bg-surface-muted/50 px-4 py-5">
              <CheckCircle2 size={20} className="shrink-0 text-verdant-400" />
              <p className="text-sm text-muted-foreground">
                Semua hasil panen sudah dikirim ke gudang Agrinas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {lots.map((lot) => {
                const lotIds = lot.lines.map((l) => l.delivery.id);
                const allSelected = lotIds.every((id) => selectedDeliveryIds.has(id));
                const someSelected = lotIds.some((id) => selectedDeliveryIds.has(id));
                const commodityLabel =
                  lot.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan Kering";
                return (
                  <div key={`${lot.commodityCode}-${lot.grade}`} className="rounded-lg border border-border">
                    {/* Lot header */}
                    <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-surface-muted/30">
                      <input
                        type="checkbox"
                        id={`lot-${lot.commodityCode}-${lot.grade}`}
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected && !allSelected;
                        }}
                        onChange={() => toggleLot(lot)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <label
                        htmlFor={`lot-${lot.commodityCode}-${lot.grade}`}
                        className="flex flex-1 cursor-pointer flex-wrap items-center gap-3"
                      >
                        <span className="font-semibold text-foreground">
                          {commodityLabel} / Grade {lot.grade}
                        </span>
                        <span className="tabular-nums text-sm text-muted-foreground">
                          {lot.totalKg.toLocaleString("id-ID")} kg total
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Rata-rata kadar air: {(lot.avgMoistureBps / 100).toFixed(1)}%
                        </span>
                      </label>
                    </div>
                    {/* Per-farmer lines */}
                    <div className="divide-y divide-border">
                      {lot.lines.map(({ delivery, farmerName, agreementRef }) => (
                        <div
                          key={delivery.id}
                          className="flex items-center gap-3 px-4 py-2.5"
                        >
                          <input
                            type="checkbox"
                            id={`dlv-${delivery.id}`}
                            checked={selectedDeliveryIds.has(delivery.id)}
                            onChange={() => toggleDelivery(delivery.id)}
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                          <label
                            htmlFor={`dlv-${delivery.id}`}
                            className="flex flex-1 cursor-pointer flex-wrap items-center gap-3 text-sm"
                          >
                            <span className="font-medium text-foreground">{farmerName}</span>
                            <span className="text-muted-foreground">
                              Perjanjian {agreementRef}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {delivery.volumeKg.toLocaleString("id-ID")} kg
                            </span>
                            <span className="text-muted-foreground">
                              {(delivery.moistureBps / 100).toFixed(1)}% air
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Disetor {delivery.deliveredAt}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Buat Pengiriman ── */}
      {unshipped.length > 0 && (
        <Card>
          <CardHeader
            title="Buat Pengiriman"
            description="Pilih lot di atas, tentukan tujuan gudang, lalu kirim."
            action={<Truck size={18} className="text-aqua-500" />}
          />
          <CardContent className="space-y-5">
            {/* Tujuan gudang */}
            <div>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: SearchSelect renders its own combobox trigger internally, htmlFor cannot target it */}
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Tujuan Gudang
              </label>
              <SearchSelect
                items={AGRINAS_OPTIONS}
                value={tujuanId}
                onChange={setTujuanId}
                placeholder="Pilih gudang Agrinas..."
                searchPlaceholder="Cari gudang..."
              />
            </div>

            {/* Preview lot summary */}
            {selectedDeliveries.length > 0 && (
              <div className="rounded-lg border border-border bg-surface-muted/30 p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Ringkasan Pengiriman
                </p>
                <div className="text-sm">
                  <span className="text-muted-foreground">Total volume: </span>
                  <span className="font-semibold tabular-nums">
                    {previewTotalKg.toLocaleString("id-ID")} kg
                  </span>
                </div>
                {previewLots.map((lot) => (
                  <div
                    key={`prev-${lot.commodityCode}-${lot.grade}`}
                    className="rounded border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      <span>
                        {lot.commodityCode === "GABAH" ? "Gabah" : "Jagung"} / Grade {lot.grade}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {lot.totalKg.toLocaleString("id-ID")} kg
                      </span>
                      <span className="text-muted-foreground">
                        Kadar air rata-rata: {(lot.avgMoistureBps / 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      {lot.lines
                        .map((l) => `${l.farmerName} (${l.delivery.volumeKg.toLocaleString("id-ID")} kg)`)
                        .join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedDeliveries.length === 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-surface-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <Info size={15} />
                Pilih setoran di atas untuk membuat pengiriman.
              </div>
            )}

            {/* Off-chain notice */}
            <Alert tone="info" title="Dicatat off-chain untuk MVP">
              Pengiriman ini dicatat secara lokal (bukan di blockchain). Gerbang ganda: catatan
              ini menunggu konfirmasi penerimaan dari Agrinas. Tidak ada transaksi Stellar untuk
              logistik di tahap ini.
            </Alert>

            {/* Success state */}
            {shipmentSent && (
              <div className="flex items-center gap-3 rounded-lg border border-verdant-200 bg-verdant-50 px-4 py-3">
                <CheckCircle2 size={18} className="shrink-0 text-verdant-600" />
                <div>
                  <p className="text-sm font-semibold text-verdant-700">
                    Pengiriman dicatat. Menunggu konfirmasi Agrinas.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: Dikirim. Agrinas akan mengkonfirmasi penerimaan.
                  </p>
                </div>
              </div>
            )}

            {/* Send button */}
            <Button
              variant="primary"
              size="md"
              leftIcon={<ArrowRight size={16} />}
              disabled={!canKirim}
              onClick={handleKirim}
            >
              {sending ? "Mencatat pengiriman..." : "Kirim ke Agrinas"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Riwayat Pengiriman ── */}
      <Card>
        <CardHeader
          title="Riwayat Pengiriman"
          description="Semua catatan pengiriman ke gudang Agrinas. Klik baris untuk detail rincian per petani."
          action={<Box size={18} className="text-aqua-400" />}
        />
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 min-w-52 flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
              <Search size={15} className="shrink-0 text-muted-foreground" />
              <input
                type="search"
                placeholder="Cari referensi, komoditas, status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-full w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>

          {/* Table */}
          {filteredShipments.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg bg-surface-muted/50 px-4 py-8 justify-center">
              <Truck size={20} className="shrink-0 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Tidak ada pengiriman yang cocok.</p>
            </div>
          ) : (
            <ScrollArea maxHeight={480} fade>
              <TableFrame className="border-0 shadow-none">
                <Table>
                  <THead>
                    <Th>Referensi</Th>
                    <Th>Komoditas</Th>
                    <Th className="text-right">Volume</Th>
                    <Th>Tanggal Kirim</Th>
                    <Th>Status</Th>
                    <Th>Catatan</Th>
                  </THead>
                  <TBody>
                    {filteredShipments.map((s) => (
                      <Tr
                        key={s.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedShipment(s)}
                      >
                        <Td className="font-mono text-xs font-medium">{s.ref}</Td>
                        <Td>
                          {s.commodityCode === "GABAH" ? "Gabah" : "Jagung"}
                        </Td>
                        <Td className="text-right tabular-nums">
                          {s.totalVolumeKg.toLocaleString("id-ID")} kg
                        </Td>
                        <Td className="text-muted-foreground">
                          {s.sentAt ?? s.createdAt}
                        </Td>
                        <Td>
                          <ShipmentBadge status={s.status} />
                        </Td>
                        <Td className="text-xs text-muted-foreground max-w-40 truncate">
                          {s.discrepancyNote ?? "-"}
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </TableFrame>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail side sheet */}
      {selectedShipment && (
        <ShipmentDetailSheet
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
        />
      )}
    </div>
  );
}
