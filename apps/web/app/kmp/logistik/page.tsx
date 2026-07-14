"use client";

/**
 * Logistik — KMP forwards stored harvest to gudang Agrinas.
 *
 * REAL data (off-chain ledger): unshipped deliveries + shipments come from the
 * API (/logistics). Dispatching persists a harvest_shipment, which auto-reduces
 * the gudang harvest balance (Screen F). Two-way gate: a shipment is "Dikirim"
 * until Agrinas confirms receipt ("Diterima").
 *
 * No em dashes. No Stellar tx shown for off-chain logistics.
 */

import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { ScrollArea } from "@/components/scroll-area";
import {
  type ApiShipment,
  type ApiUnshippedDelivery,
  type ShipmentStatus,
  createShipment,
  fetchShipments,
  fetchUnshippedDeliveries,
  receiveShipment,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Alert, Button, Card, CardContent, CardHeader, Skeleton, StatCard } from "@annona/ui";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Info,
  Package,
  Search,
  Truck,
  Warehouse,
} from "lucide-react";
import { useMemo, useState } from "react";

const g2kg = (g: bigint): number => Number(g) / 1000;
function commodityLabel(code: string): string {
  return code === "GABAH" ? "Gabah Kering Panen" : code === "JAGUNG" ? "Jagung Pipilan Kering" : code;
}

function shipmentStatusColors(s: ShipmentStatus): string {
  if (s === "Diterima") return "bg-[#ebf5e9] text-[#0c7a48] border border-[#d2f9de]";
  if (s === "Dikirim") return "bg-cyan-50 text-cyan-800 border border-cyan-200/40";
  if (s === "Selisih") return "bg-amber-50 text-amber-800 border border-amber-200/50";
  return "bg-gray-50 text-gray-500 border border-gray-200/40";
}
function ShipmentBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${shipmentStatusColors(status)}`}
    >
      {status}
    </span>
  );
}

// ─── Lot grouping ──────────────────────────────────────────────────────────

interface DeliveryLot {
  commodityCode: string;
  grade: string;
  totalKg: number;
  avgMoistureBps: number;
  lines: ApiUnshippedDelivery[];
}
function groupIntoLots(deliveries: ApiUnshippedDelivery[]): DeliveryLot[] {
  const map = new Map<string, DeliveryLot>();
  for (const d of deliveries) {
    const key = `${d.commodityCode}|${d.grade}`;
    let lot = map.get(key);
    if (!lot) {
      lot = { commodityCode: d.commodityCode, grade: d.grade, totalKg: 0, avgMoistureBps: 0, lines: [] };
      map.set(key, lot);
    }
    lot.lines.push(d);
    lot.totalKg += g2kg(d.volumeG);
  }
  for (const lot of map.values()) {
    const totalG = lot.lines.reduce((s, l) => s + Number(l.volumeG), 0);
    lot.avgMoistureBps = totalG
      ? Math.round(lot.lines.reduce((s, l) => s + (l.moistureBps ?? 0) * Number(l.volumeG), 0) / totalG)
      : 0;
  }
  return [...map.values()];
}

export default function LogistikPage() {
  const { t } = useI18n();
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  const { data: unshippedData, loading: unshippedLoading } = useApi<ApiUnshippedDelivery[]>(
    fetchUnshippedDeliveries,
    [refreshKey],
  );
  const { data: shipmentsData } = useApi<ApiShipment[]>(fetchShipments, [refreshKey]);
  const unshipped = useMemo(() => unshippedData ?? [], [unshippedData]);
  const shipments = useMemo(() => shipmentsData ?? [], [shipmentsData]);
  const lots = useMemo(() => groupIntoLots(unshipped), [unshipped]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Stats
  const stokKMPKg = useMemo(() => unshipped.reduce((s, d) => s + g2kg(d.volumeG), 0), [unshipped]);
  const dalamPerjalananKg = useMemo(
    () => shipments.filter((s) => s.status === "Dikirim").reduce((sum, s) => sum + g2kg(s.totalVolumeG), 0),
    [shipments],
  );
  const sudahDiterimaKg = useMemo(
    () =>
      shipments
        .filter((s) => s.status === "Diterima" || s.status === "Selisih")
        .reduce((sum, s) => sum + g2kg(s.receivedVolumeG ?? s.totalVolumeG), 0),
    [shipments],
  );

  const selectedDeliveries = useMemo(
    () => unshipped.filter((d) => selectedIds.has(d.id)),
    [unshipped, selectedIds],
  );
  const previewTotalKg = selectedDeliveries.reduce((s, d) => s + g2kg(d.volumeG), 0);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setFeedback(null);
  }
  function toggleLot(lot: DeliveryLot) {
    const ids = lot.lines.map((l) => l.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    setFeedback(null);
  }

  async function handleKirim() {
    if (selectedDeliveries.length === 0 || sending) return;
    setSending(true);
    setError(null);
    try {
      await createShipment([...selectedIds]);
      setSelectedIds(new Set());
      setFeedback("Pengiriman dicatat. Status: Dikirim. Menunggu konfirmasi Agrinas.");
      bump();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mencatat pengiriman.");
    } finally {
      setSending(false);
    }
  }

  async function handleConfirm(id: string) {
    setConfirmingId(id);
    setError(null);
    try {
      await receiveShipment(id);
      setFeedback("Agrinas mengkonfirmasi penerimaan. Status: Diterima.");
      bump();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengkonfirmasi penerimaan.");
    } finally {
      setConfirmingId(null);
    }
  }

  const q = search.trim().toLowerCase();
  const filteredShipments = useMemo(
    () =>
      shipments.filter(
        (s) =>
          !q ||
          s.commodityCode.toLowerCase().includes(q) ||
          s.status.toLowerCase().includes(q) ||
          (s.discrepancyNote ?? "").toLowerCase().includes(q),
      ),
    [shipments, q],
  );

  const canKirim = selectedDeliveries.length > 0 && !sending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.kmp.logistik.title")}
        description={t("page.kmp.logistik.desc")}
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("page.kmp.gudang.stats.totalStock")}
          value={`${stokKMPKg.toLocaleString("id-ID")} kg`}
          icon={<Warehouse size={18} />}
          tone={stokKMPKg > 0 ? "warn" : "good"}
          hint={t("page.kmp.gudang.stats.readyShipHint")}
        />
        <StatCard
          label={t("page.kmp.logistik.badge.inTransit")}
          value={`${dalamPerjalananKg.toLocaleString("id-ID")} kg`}
          icon={<Truck size={18} />}
          tone={dalamPerjalananKg > 0 ? "warn" : "neutral"}
          hint="Dikirim, menunggu konfirmasi penerimaan Agrinas"
        />
        <StatCard
          label={t("page.kmp.logistik.badge.delivered")}
          value={`${sudahDiterimaKg.toLocaleString("id-ID")} kg`}
          icon={<CheckCircle2 size={18} />}
          tone="good"
          hint="Dikonfirmasi diterima di gudang Agrinas"
        />
      </div>

      {error ? (
        <Alert tone="warning" className="rounded-xl">{error}</Alert>
      ) : null}

      {/* Stok Siap Kirim */}
      <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
        <CardHeader
          title={t("page.kmp.gudang.stats.readyShip")}
          description="Setoran panen petani yang sudah ada di gudang KMP, belum dikirim ke Agrinas. Pilih lot untuk buat pengiriman."
          action={<Package size={18} className="text-emerald-700" />}
          className="pb-3"
        />
        <CardContent className="pt-3">
          {unshippedLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : unshipped.length === 0 ? (
            <div className="flex items-center gap-3.5 rounded-2xl bg-gray-55/40 px-5 py-6">
              <CheckCircle2 size={20} className="shrink-0 text-emerald-700" />
              <p className="text-sm text-gray-500 font-semibold">
                Semua hasil panen sudah dikirim ke gudang Agrinas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {lots.map((lot) => {
                const ids = lot.lines.map((l) => l.id);
                const allSelected = ids.every((id) => selectedIds.has(id));
                const someSelected = ids.some((id) => selectedIds.has(id));
                return (
                  <div key={`${lot.commodityCode}-${lot.grade}`} className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 bg-gray-50/50">
                      <input
                        type="checkbox"
                        id={`lot-${lot.commodityCode}-${lot.grade}`}
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected && !allSelected;
                        }}
                        onChange={() => toggleLot(lot)}
                        className="h-4 w-4 rounded border-gray-300 accent-primary"
                      />
                      <label
                        htmlFor={`lot-${lot.commodityCode}-${lot.grade}`}
                        className="flex flex-1 cursor-pointer flex-wrap items-center gap-3"
                      >
                        <span className="font-bold text-gray-900 text-sm">
                          {commodityLabel(lot.commodityCode)} / Grade {lot.grade}
                        </span>
                        <span className="tabular-nums text-xs text-gray-500 font-bold bg-gray-100 rounded-full px-2.5 py-0.5">
                          {lot.totalKg.toLocaleString("id-ID")} kg total
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">
                          Rata-rata kadar air: {(lot.avgMoistureBps / 100).toFixed(1)}%
                        </span>
                      </label>
                    </div>
                    <div className="divide-y divide-gray-55/70">
                      {lot.lines.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/40 transition-colors">
                          <input
                            type="checkbox"
                            id={`dlv-${d.id}`}
                            checked={selectedIds.has(d.id)}
                            onChange={() => toggle(d.id)}
                            className="h-4 w-4 rounded border-gray-300 accent-primary"
                          />
                          <label htmlFor={`dlv-${d.id}`} className="flex flex-1 cursor-pointer flex-wrap items-center gap-3 text-sm">
                            <span className="font-bold text-gray-900">{d.farmerName ?? d.farmerId}</span>
                            <span className="text-xs text-gray-400 font-semibold bg-gray-55/60 rounded px-1.5 py-0.5">
                              Perjanjian #{d.agreementOnchainId ?? "-"}
                            </span>
                            <span className="tabular-nums text-gray-800 font-semibold">
                              {g2kg(d.volumeG).toLocaleString("id-ID")} kg
                            </span>
                            <span className="text-gray-550 font-medium">
                              {((d.moistureBps ?? 0) / 100).toFixed(1)}% air
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                              Disetor {String(d.deliveredAt).slice(0, 10)}
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

      {/* Buat Pengiriman */}
      {unshipped.length > 0 ? (
        <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm p-5 sm:p-6">
          <CardHeader
            title={t("page.kmp.logistik.shipments")}
            description="Pilih lot di atas, lalu kirim ke gudang Agrinas."
            action={<Truck size={18} className="text-cyan-800" />}
            className="pb-3"
          />
          <CardContent className="space-y-5 pt-3">
            {selectedDeliveries.length > 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-gray-55/20 p-5 space-y-2 shadow-sm">
                <p className="text-sm font-bold text-gray-900">Ringkasan Pengiriman</p>
                <div className="text-sm font-bold text-gray-700">
                  <span className="text-gray-400 font-medium">Total volume: </span>
                  <span className="font-bold text-gray-950 tabular-nums">
                    {previewTotalKg.toLocaleString("id-ID")} kg
                  </span>
                  <span className="text-gray-400 font-medium"> dari {selectedDeliveries.length} setoran</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm text-gray-500 font-semibold shadow-sm">
                <Info size={15} className="text-gray-400 shrink-0" />
                Pilih setoran di atas untuk membuat pengiriman.
              </div>
            )}

            <Alert tone="info" title="Dicatat off-chain untuk MVP" className="rounded-xl">
              Pengiriman dicatat di ledger lokal koperasi. Mengirim otomatis mengurangi sisa hasil
              panen di Gudang. Gerbang ganda: catatan ini menunggu konfirmasi penerimaan dari Agrinas.
            </Alert>

            {feedback ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[#d2f9de] bg-[#ebf5e9] px-5 py-4 shadow-sm">
                <CheckCircle2 size={18} className="shrink-0 text-[#0c7a48]" />
                <p className="text-sm font-bold text-gray-900">{feedback}</p>
              </div>
            ) : null}

            <Button
              type="button"
              variant="primary"
              size="md"
              leftIcon={<ArrowRight size={16} />}
              disabled={!canKirim}
              onClick={handleKirim}
              className="w-full rounded-full bg-primary-dark hover:bg-opacity-95 text-white py-3 font-semibold shadow-sm"
            >
              {sending ? "Mencatat pengiriman..." : "Kirim ke Agrinas"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Riwayat Pengiriman */}
      <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
        <CardHeader
          title={t("page.kmp.logistik.history")}
          description="Semua catatan pengiriman ke gudang Agrinas. Konfirmasi penerimaan untuk menutup gerbang kedua."
          action={<Box size={18} className="text-cyan-800" />}
          className="pb-3"
        />
        <CardContent className="space-y-4 pt-3">
          <div className="flex h-12 min-w-52 max-w-md items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring">
            <Search size={15} className="shrink-0 text-gray-400" />
            <input
              type="search"
              placeholder="Cari komoditas, status, catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-full w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 font-semibold"
            />
          </div>

          {filteredShipments.length === 0 ? (
            <div className="flex items-center gap-3.5 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-8 justify-center shadow-sm">
              <Truck size={20} className="shrink-0 text-gray-400" />
              <p className="text-sm text-gray-500 font-semibold">Belum ada pengiriman.</p>
            </div>
          ) : (
            <ScrollArea maxHeight={480} fade>
              <TableFrame className="border-0 shadow-none">
                <Table>
                  <THead>
                    <Th>Komoditas</Th>
                    <Th className="text-right">Dikirim</Th>
                    <Th className="text-right">Diterima</Th>
                    <Th>Tanggal Kirim</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Aksi</Th>
                  </THead>
                  <TBody>
                    {filteredShipments.map((s) => (
                      <Tr key={s.id}>
                        <Td className="font-bold text-gray-900">{commodityLabel(s.commodityCode)}</Td>
                        <Td className="text-right tabular-nums font-bold text-gray-900">
                          {g2kg(s.totalVolumeG).toLocaleString("id-ID")} kg
                        </Td>
                        <Td className="text-right tabular-nums text-gray-600 font-semibold">
                          {s.receivedVolumeG != null ? `${g2kg(s.receivedVolumeG).toLocaleString("id-ID")} kg` : "-"}
                        </Td>
                        <Td className="text-gray-500 font-semibold">
                          {s.sentAt ? String(s.sentAt).slice(0, 10) : String(s.createdAt).slice(0, 10)}
                        </Td>
                        <Td>
                          <ShipmentBadge status={s.status} />
                        </Td>
                        <Td className="text-right">
                          {s.status === "Dikirim" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={confirmingId === s.id}
                              onClick={() => handleConfirm(s.id)}
                              className="rounded-full h-7 px-3 text-xs"
                            >
                              {confirmingId === s.id ? "..." : "Konfirmasi Diterima"}
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">-</span>
                          )}
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
    </div>
  );
}
