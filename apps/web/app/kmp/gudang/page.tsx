"use client";

/** Screen F — Gudang dan Pasokan (PRD §8.1). Two clearly labeled zones:
 *  (1) Kargo masuk on-chain (aqua) — accept_supply double-confirmation gate.
 *  (2) Stok off-chain (muted badge) — catatan lokal, persisted to Postgres. */

import {
  type ApiAgreement,
  type ApiWarehouseStock,
  type CreateWarehouseStockInput,
  type UpdateWarehouseStockPatch,
  createWarehouseStock,
  fetchOverview,
  fetchWarehouseStock,
  updateWarehouseStock,
} from "@/lib/api";
import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { type TxState, useTx } from "@/components/kmp/use-tx";
import { acceptSupply } from "@/lib/invocations";
import { useApi } from "@/lib/use-api";
import { formatKg } from "@/lib/mock-data";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  RupiahAmount,
  Skeleton,
  StatCard,
  TxHashLink,
} from "@annona/ui";
import {
  ArrowUpFromLine,
  CheckCircle2,
  Database,
  Link as LinkIcon,
  Package,
  Plus,
  Search,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Parse a string like "19.150 kg" or "4.580 kg" to a number (ID locale: dots = thousands). */
function parseKgQty(qty: string): number {
  const clean = qty.replace(/\./g, "").replace(/[^0-9]/g, "");
  return clean ? Number(clean) : 0;
}

/** Single inbound-supply card for one SupplyDispatched agreement.
 *  Handles its own accept flow independently of sibling cards. */
function InboundCard({
  agreement,
  farmerName,
  isAnyProcessing,
  onAccept,
  state,
  txHash,
  isDone,
  doneTxHash,
}: {
  agreement: ApiAgreement;
  farmerName: string;
  isAnyProcessing: boolean;
  onAccept: () => void;
  state: TxState;
  txHash: string | null;
  isDone: boolean;
  doneTxHash: string | null;
}) {
  const { t } = useI18n();
  const isMine = state !== "idle" && !isDone;

  if (isDone) {
    return (
      <div className="rounded-2xl border border-cyan-150 bg-[#e7fafc]/45 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#0c6a78]" />
              <span className="font-bold text-gray-900">
                Perjanjian #{String(agreement.onchainId)}, {farmerName}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600 font-medium">
              Barang diterima. Utang saprotan{" "}
              <RupiahAmount smallest={agreement.inputDebt} className="text-sm font-bold text-gray-900" /> kini aktif sebagai
              kewajiban petani.
            </p>
          </div>
          {doneTxHash && <TxHashLink hash={doneTxHash} />}
        </div>
        <Alert tone="success" className="mt-4 rounded-xl">
          Status perjanjian berubah menjadi Berjalan. Gerbang konfirmasi ganda selesai: Supplier
          kirim, KMP terima. Utang saprotan mulai dihitung.
        </Alert>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-bold text-gray-900">
            Perjanjian #{String(agreement.onchainId)}, {farmerName}
          </p>
          <p className="mt-1 text-xs text-gray-500 font-semibold">
            {agreement.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan"}
          </p>
          <div className="mt-4 flex flex-wrap gap-6 text-sm font-bold text-gray-700">
            <div>
              <span className="text-gray-400 font-medium">Pokok Supplier: </span>
              <RupiahAmount smallest={agreement.basePriceSupplier} className="text-sm font-bold text-gray-900" />
            </div>
            <div>
              <span className="text-gray-400 font-medium">Utang petani jika diterima: </span>
              <RupiahAmount smallest={agreement.inputDebt} className="text-sm font-bold text-gray-900" />
            </div>
            <div>
              <span className="text-gray-400 font-medium">Perkiraan panen: </span>
              <span className="text-gray-900">{formatKg(agreement.expectedVolKg)}</span>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-gray-400 font-semibold">
            Tanggal pengiriman Supplier: {agreement.createdAt}
          </p>
        </div>

        {/* Accept button */}
        <div className="flex flex-col items-end gap-2">
          <Button
            type="button"
            variant="accent"
            size="md"
            leftIcon={<Truck size={16} />}
            disabled={isAnyProcessing && !isMine}
            onClick={onAccept}
            className="rounded-full bg-[#0c6a78] hover:bg-[#0c6a78]/95 text-white"
          >
            {isMine && state === "signing"
              ? "Menandatangani..."
              : isMine && state === "submitting"
                ? "Mengirim ke chain..."
                : "Periksa dan Terima Barang"}
          </Button>
          {isMine && (
            <span className="text-xs text-amber-700 font-semibold">
              {state === "signing"
                ? "Konfirmasi di dompet Freighter"
                : "Menunggu konfirmasi Stellar"}
            </span>
          )}
        </div>
      </div>

      <Alert tone="info" className="mt-4 rounded-xl">
        Setelah diterima, utang saprotan petani menjadi kewajiban aktif. Tindakan ini mencatat
        konfirmasi fisik penerimaan barang oleh KMP di blockchain.
      </Alert>
    </div>
  );
}

/** Inline edit form for a single stock row. Shows inputs for inQty/outQty/balance/note. */
function InlineEditRow({
  row,
  onSave,
  onCancel,
  saving,
}: {
  row: ApiWarehouseStock;
  onSave: (patch: UpdateWarehouseStockPatch) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [inQty, setInQty] = useState(row.inQty);
  const [outQty, setOutQty] = useState(row.outQty);
  const [balance, setBalance] = useState(row.balance);
  const [note, setNote] = useState(row.note);

  return (
    <Tr className="bg-verdant-50/30">
      <Td className="font-bold text-gray-900">{row.itemName}</Td>
      <Td>
        <Input
          name={`inQty-${row.id}`}
          value={inQty}
          onChange={(e) => setInQty(e.target.value)}
          placeholder="mis. 18 karung"
          className="h-8 w-28 text-sm rounded-xl"
        />
      </Td>
      <Td>
        <Input
          name={`outQty-${row.id}`}
          value={outQty}
          onChange={(e) => setOutQty(e.target.value)}
          placeholder="mis. 16 karung"
          className="h-8 w-28 text-sm rounded-xl"
        />
      </Td>
      <Td>
        <Input
          name={`balance-${row.id}`}
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="mis. 2 karung"
          className="h-8 w-28 text-sm rounded-xl"
        />
      </Td>
      <Td>
        <Input
          name={`note-${row.id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan..."
          className="h-8 w-40 text-sm rounded-xl"
        />
      </Td>
      <Td className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="primary"
            disabled={saving}
            onClick={() => onSave({ inQty, outQty, balance, note })}
            className="rounded-full h-7 px-3 text-xs"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="rounded-full h-7 px-2 text-xs"
          >
            <X size={12} />
          </Button>
        </div>
      </Td>
    </Tr>
  );
}

/** Static display row for a stock item, with an edit button. */
function StockRow({
  row,
  isHasil,
  onEdit,
}: {
  row: ApiWarehouseStock;
  isHasil: boolean;
  onEdit: () => void;
}) {
  const colorClass = isHasil ? "text-[#0c6a78]" : "text-emerald-800";
  const zeroClass = "text-gray-400 font-medium";

  return (
    <Tr>
      <Td className="font-bold text-gray-900">{row.itemName}</Td>
      <Td className="text-right tabular-nums text-gray-500 font-medium">
        {row.inQty || <span className="text-gray-300">-</span>}
      </Td>
      <Td className="text-right tabular-nums text-gray-500 font-medium">
        {row.outQty || <span className="text-gray-300">-</span>}
      </Td>
      <Td className="text-right tabular-nums">
        <span className={row.balance === "0" || !row.balance ? zeroClass : `font-bold ${colorClass}`}>
          {row.balance || "0"}
        </span>
      </Td>
      <Td className="text-gray-500 font-medium">{row.note || <span className="text-gray-300">-</span>}</Td>
      <Td className="text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="rounded-full h-7 px-3 text-xs"
        >
          Edit
        </Button>
      </Td>
    </Tr>
  );
}

/** "Tambah Stok" form panel (inline card above the table). */
function TambahStokForm({
  category,
  onSuccess,
  onClose,
}: {
  category: "saprotan" | "hasil-panen";
  onSuccess: (row: ApiWarehouseStock) => void;
  onClose: () => void;
}) {
  const [itemName, setItemName] = useState("");
  const [inQty, setInQty] = useState("");
  const [outQty, setOutQty] = useState("");
  const [balance, setBalance] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!itemName.trim()) {
      setError("Nama barang wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const row = await createWarehouseStock({ itemName: itemName.trim(), category, inQty, outQty, balance, note });
      onSuccess(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  const label = category === "saprotan" ? "Saprotan" : "Hasil Panen";

  return (
    <div className="rounded-2xl border border-verdant-200 bg-verdant-50/30 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold text-gray-900 text-sm">Tambah Stok {label}</p>
        <Button size="sm" variant="ghost" onClick={onClose} className="rounded-full h-7 w-7 p-0">
          <X size={14} />
        </Button>
      </div>
      {error ? (
        <Alert tone="warning" className="mb-3 rounded-xl text-sm">{error}</Alert>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Nama Barang"
            name="tambah-item-name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder={category === "saprotan" ? "mis. Pupuk Urea 50kg" : "mis. Gabah Kering Panen"}
            className="rounded-2xl"
          />
        </div>
        <Input
          label="Qty Masuk"
          name="tambah-in-qty"
          value={inQty}
          onChange={(e) => setInQty(e.target.value)}
          placeholder="mis. 18 karung"
          className="rounded-2xl"
        />
        <Input
          label="Qty Keluar"
          name="tambah-out-qty"
          value={outQty}
          onChange={(e) => setOutQty(e.target.value)}
          placeholder="mis. 16 karung"
          className="rounded-2xl"
        />
        <Input
          label="Sisa"
          name="tambah-balance"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="mis. 2 karung"
          className="rounded-2xl"
        />
        <Input
          label="Catatan"
          name="tambah-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan opsional"
          className="rounded-2xl"
        />
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={saving}
          onClick={handleSubmit}
          className="rounded-full"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button variant="outline" size="sm" onClick={onClose} className="rounded-full">
          Batal
        </Button>
      </div>
    </div>
  );
}

export default function GudangPage() {
  const { t } = useI18n();
  const { data: overview } = useApi(fetchOverview);
  const inbound = overview?.inboundSupply ?? [];

  // One tx instance at a time; track which card is processing and which are done.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [doneMap, setDoneMap] = useState<Record<string, string>>({}); // agreementId -> txHash
  const txAccept = useTx();
  const prevState = useRef<TxState>("idle");

  useEffect(() => {
    const prev = prevState.current;
    prevState.current = txAccept.state;
    const hash = txAccept.txHash;
    if (prev !== "success" && txAccept.state === "success" && activeId && hash) {
      setDoneMap((m) => ({ ...m, [activeId]: hash }));
    }
  }, [txAccept.state, txAccept.txHash, activeId]);

  function handleAccept(id: string, onchainId: bigint) {
    if (txAccept.state !== "idle") return;
    setActiveId(id);
    // GATE 2: KMP confirms physical receipt of dispatched supply -> Active.
    txAccept.run((coop) => acceptSupply(coop, onchainId));
  }

  const isAnyProcessing = txAccept.state !== "idle" && txAccept.state !== "success";

  // Live stock from Postgres (replaces MOCK_STOCK)
  const { data: stockData, loading: stockLoading, error: stockError } = useApi(fetchWarehouseStock);
  const [localStock, setLocalStock] = useState<ApiWarehouseStock[]>([]);

  // Merge server data + optimistic additions (new rows added this session).
  // After the first load resolves, local additions are merged in so we don't
  // lose newly-created rows between the optimistic add and the next refetch.
  useEffect(() => {
    if (stockData) setLocalStock(stockData);
  }, [stockData]);

  const saprotanStock = useMemo(() => localStock.filter((s) => s.category === "saprotan"), [localStock]);
  const hasilPanenStock = useMemo(() => localStock.filter((s) => s.category === "hasil-panen"), [localStock]);

  // Summary totals for the stat strip
  const totalPanenDiterima = hasilPanenStock.reduce((sum, s) => sum + parseKgQty(s.inQty), 0);
  const totalDiteruskan = hasilPanenStock.reduce((sum, s) => sum + parseKgQty(s.outQty), 0);

  // Stock table search
  const [stockSearch, setStockSearch] = useState("");
  const filteredSaprotan = useMemo(() => {
    const q = stockSearch.toLowerCase().trim();
    if (!q) return saprotanStock;
    return saprotanStock.filter((s) => s.itemName.toLowerCase().includes(q));
  }, [saprotanStock, stockSearch]);
  const filteredHasil = useMemo(() => {
    const q = stockSearch.toLowerCase().trim();
    if (!q) return hasilPanenStock;
    return hasilPanenStock.filter((s) => s.itemName.toLowerCase().includes(q));
  }, [hasilPanenStock, stockSearch]);

  // Add-form visibility per category
  const [showAddSaprotan, setShowAddSaprotan] = useState(false);
  const [showAddHasil, setShowAddHasil] = useState(false);

  // Inline edit tracking: id -> true while editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const handleAddSuccess = useCallback((row: ApiWarehouseStock) => {
    setLocalStock((prev) => [row, ...prev]);
    setShowAddSaprotan(false);
    setShowAddHasil(false);
  }, []);

  const handleSavePatch = useCallback(
    async (id: string, patch: UpdateWarehouseStockPatch) => {
      setEditError(null);
      setSavingId(id);
      try {
        const updated = await updateWarehouseStock(id, patch);
        setLocalStock((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setEditingId(null);
      } catch (e) {
        setEditError(e instanceof Error ? e.message : "Gagal menyimpan perubahan.");
      } finally {
        setSavingId(null);
      }
    },
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.kmp.gudang.title")}
        description={t("page.kmp.gudang.desc")}
      />

      {/* Summary stat strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("page.kmp.logistik.badge.inTransit")}
          value={String(inbound.length)}
          hint="Kiriman saprotan dari Supplier menunggu konfirmasi penerimaan"
          icon={<Truck size={18} />}
          tone={inbound.length > 0 ? "warn" : "good"}
        />
        <StatCard
          label={t("page.kmp.gudang.stats.totalStock")}
          value={`${totalPanenDiterima.toLocaleString("id-ID")} kg`}
          hint="Total hasil panen yang diterima di gudang"
          icon={<Package size={18} />}
        />
        <StatCard
          label={t("page.kmp.gudang.stats.readyShip")}
          value={`${totalDiteruskan.toLocaleString("id-ID")} kg`}
          hint="Total yang sudah dikirim ke gudang Agrinas"
          icon={<ArrowUpFromLine size={18} />}
        />
      </div>

      {/* Zone 1: On-chain inbound supply */}
      <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
        <CardHeader
          title={t("page.kmp.gudang.title")}
          description="Barang dalam perjalanan menunggu konfirmasi penerimaan fisik. Konfirmasi Anda mengaktifkan utang saprotan petani."
          action={
            <span className="flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-150/40 px-3 py-0.5 text-xs font-bold text-[#0c6a78] uppercase">
              <LinkIcon size={11} />
              On-chain
            </span>
          }
          className="pb-3"
        />
        <CardContent className="space-y-4 pt-3">
          {inbound.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-150 py-10 text-center text-sm text-gray-500 font-semibold bg-gray-50/30">
              Tidak ada kiriman saprotan yang sedang menunggu konfirmasi.
            </div>
          ) : (
            inbound.map((a) => {
              return (
                <InboundCard
                  key={a.id}
                  agreement={a}
                  farmerName={a.farmerName}
                  isAnyProcessing={isAnyProcessing}
                  onAccept={() => handleAccept(a.id, a.onchainId)}
                  state={activeId === a.id ? txAccept.state : "idle"}
                  txHash={activeId === a.id ? txAccept.txHash : null}
                  isDone={!!doneMap[a.id]}
                  doneTxHash={doneMap[a.id] ?? null}
                />
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Zone 2: Off-chain stock (clearly labeled) */}
      <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
        <CardHeader
          title={t("page.kmp.gudang.title")}
          description={t("page.kmp.gudang.desc")}
          action={
            <Badge tone="neutral" icon={<Database size={11} />} className="rounded-full font-bold">
              {t("page.kmp.gudang.label.offChain")}
            </Badge>
          }
          className="pb-3"
        />
        <CardContent className="space-y-6 p-0 pb-4 pt-3">
          {/* Warning banner */}
          <div className="mx-5">
            <Alert tone="warning" title="Data off-chain" className="rounded-xl">
              Tabel stok di bawah adalah catatan lokal koperasi. Tidak ada catatan blockchain untuk
              ini. Konfirmasi kargo Supplier di zona atas yang menciptakan rekam on-chain.
            </Alert>
          </div>

          {editError ? (
            <div className="mx-5">
              <Alert tone="warning" className="rounded-xl text-sm">{editError}</Alert>
            </div>
          ) : null}

          {/* Stock search */}
          <div className="mx-5">
            <Input
              name="stock-search"
              placeholder="Cari nama barang..."
              leading={<Search size={15} className="text-gray-400" />}
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              className="max-w-xs rounded-2xl border-gray-150"
            />
          </div>

          {stockLoading ? (
            <div className="mx-5 space-y-2">
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          ) : null}

          {stockError ? (
            <div className="mx-5">
              <Alert tone="warning" className="rounded-xl text-sm">{stockError}</Alert>
            </div>
          ) : null}

          {/* Saprotan stock */}
          {!stockLoading ? (
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-[#ebf5e9]/30 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Warehouse size={15} className="text-emerald-700" />
                  <span className="text-sm font-bold text-gray-900">{t("page.kmp.gudang.zone.saprotan")}</span>
                  <Badge tone="verdant" className="rounded-full">Pertanian</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Plus size={13} />}
                  onClick={() => { setShowAddSaprotan((v) => !v); setShowAddHasil(false); }}
                  className="rounded-full h-8 text-xs"
                >
                  Tambah Stok
                </Button>
              </div>

              {showAddSaprotan ? (
                <div className="px-5 pt-4">
                  <TambahStokForm
                    category="saprotan"
                    onSuccess={handleAddSuccess}
                    onClose={() => setShowAddSaprotan(false)}
                  />
                </div>
              ) : null}

              <TableFrame className="border-0 shadow-none rounded-none overflow-visible">
                <Table>
                  <THead>
                    <Th>Barang</Th>
                    <Th className="text-right">Masuk</Th>
                    <Th className="text-right">Keluar</Th>
                    <Th className="text-right">Sisa</Th>
                    <Th>Catatan</Th>
                    <Th className="w-20" />
                  </THead>
                  <TBody>
                    {filteredSaprotan.length > 0 ? (
                      filteredSaprotan.map((s) =>
                        editingId === s.id ? (
                          <InlineEditRow
                            key={s.id}
                            row={s}
                            saving={savingId === s.id}
                            onSave={(patch) => handleSavePatch(s.id, patch)}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <StockRow
                            key={s.id}
                            row={s}
                            isHasil={false}
                            onEdit={() => { setEditingId(s.id); setEditError(null); }}
                          />
                        )
                      )
                    ) : (
                      <Tr>
                        <Td colSpan={6} className="py-6 text-center text-gray-450 font-medium">
                          {stockSearch
                            ? "Tidak ada barang saprotan yang cocok."
                            : "Belum ada stok saprotan. Tambah dengan tombol di atas."}
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
              </TableFrame>
            </div>
          ) : null}

          {/* Hasil panen stock */}
          {!stockLoading ? (
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-cyan-50/20 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Warehouse size={15} className="text-[#0c6a78]" />
                  <span className="text-sm font-bold text-gray-900">Hasil Panen</span>
                  <Badge tone="aqua" className="rounded-full">Diteruskan ke Gudang Agrinas</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Plus size={13} />}
                  onClick={() => { setShowAddHasil((v) => !v); setShowAddSaprotan(false); }}
                  className="rounded-full h-8 text-xs"
                >
                  Tambah Stok
                </Button>
              </div>

              {showAddHasil ? (
                <div className="px-5 pt-4">
                  <TambahStokForm
                    category="hasil-panen"
                    onSuccess={handleAddSuccess}
                    onClose={() => setShowAddHasil(false)}
                  />
                </div>
              ) : null}

              <TableFrame className="border-0 shadow-none rounded-none overflow-visible">
                <Table>
                  <THead>
                    <Th>Komoditas</Th>
                    <Th className="text-right">Diterima</Th>
                    <Th className="text-right">Diteruskan</Th>
                    <Th className="text-right">Sisa di Gudang</Th>
                    <Th>Catatan</Th>
                    <Th className="w-20" />
                  </THead>
                  <TBody>
                    {filteredHasil.length > 0 ? (
                      filteredHasil.map((s) =>
                        editingId === s.id ? (
                          <InlineEditRow
                            key={s.id}
                            row={s}
                            saving={savingId === s.id}
                            onSave={(patch) => handleSavePatch(s.id, patch)}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <StockRow
                            key={s.id}
                            row={s}
                            isHasil
                            onEdit={() => { setEditingId(s.id); setEditError(null); }}
                          />
                        )
                      )
                    ) : (
                      <Tr>
                        <Td colSpan={6} className="py-6 text-center text-gray-450 font-medium">
                          {stockSearch
                            ? "Tidak ada hasil panen yang cocok."
                            : "Belum ada stok hasil panen. Tambah dengan tombol di atas."}
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
              </TableFrame>

              {/* Summary cards for hasil-panen (shown when data available) */}
              {hasilPanenStock.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-4 px-5 text-sm">
                  {hasilPanenStock.map((s) => (
                    <div key={s.id} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 shadow-sm font-semibold">
                      <p className="font-bold text-gray-900">{s.itemName}</p>
                      <p className="text-xs text-gray-500 font-medium mt-1 leading-normal">
                        Diterima: {s.inQty || "-"}. Diteruskan ke Gudang Agrinas: {s.outQty || "-"}
                      </p>
                      <p className="mt-1.5 text-xs font-bold text-[#0c6a78]">
                        Sisa di gudang: {s.balance || "0"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
