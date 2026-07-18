"use client";

// Screen C helper — Create Offtake Agreement form (PRD §8.1).
// Two-column layout: form steps left, sticky summary ledger right.
// All money via RupiahAmount/formatRupiah. No em dashes. No hardcoded hex.
//
// Reads come live from the REST read-model (farmers/catalog/hpp/yield/coop).
// Submit signs create_agreement through Freighter (coop-bound). Grade + moisture
// are ESTIMATES at creation (house rule: unknown until the first delivery), so
// we anchor placeholder estimates the contract overwrites on record_delivery.

import { SearchSelect, type SearchSelectItem } from "@/components/kmp/search-select";
import { useTx } from "@/components/kmp/use-tx";
import { ScrollArea } from "@/components/scroll-area";
import {
  annotateAgreement,
  fetchCatalog,
  fetchCoop,
  fetchFarmers,
  fetchHpp,
  fetchYield,
} from "@/lib/api";
import { createAgreement } from "@/lib/invocations";
import { getSupabase } from "@/lib/supabase";
import { useApi } from "@/lib/use-api";
import { deriveInputDebt, formatRupiah } from "@annona/core";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  ReputationBadge,
  SubsidyStatusBadge,
  RupiahAmount,
  TxHashLink,
  cn,
} from "@annona/ui";
import { Info, Lock, Minus, Plus, RotateCcw, Search, Wheat } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/** Default expected harvest window: ~3 months out (transparent estimate, the
 *  officer can adjust). */
function defaultHarvestDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}

// Catalog item category labels in Bahasa
const CATEGORY_LABEL: Record<string, string> = {
  pupuk: "Pupuk",
  benih: "Benih",
  pestisida: "Pestisida",
  alsintan: "Alsintan",
};

// HPP decree version anchored on the commodity struct (Inpres no.). The
// reference feed does not carry a per-price version, so we anchor the current
// decree as a constant; it is on-chain metadata, not settlement math.
const HPP_VERSION = 4;
// Placeholder harvest-quality estimates at creation (overwritten on first
// delivery). See the house rule on grade/moisture being unknown up front.
const GRADE_ESTIMATE = "B";
const MOISTURE_BPS_ESTIMATE = 1400; // 14.00%

export function CreateAgreementForm() {
  // ─── Live reference data ─────────────────────────────────────────────────
  const { data, loading, error } = useApi(() =>
    Promise.all([fetchFarmers(), fetchCatalog(), fetchHpp(), fetchYield(), fetchCoop()]),
  );
  const farmers = data?.[0] ?? [];
  const catalog = data?.[1] ?? [];
  const priceRefs = data?.[2] ?? [];
  const yieldTable = data?.[3] ?? [];
  const supplier = data?.[4]?.supplier ?? null;

  // Step 1: Farmer
  const [farmerId, setFarmerId] = useState<string | null>(null);

  // Step 2: Catalog cart (catalogId -> qty; qty 0 means not selected)
  const [cart, setCart] = useState<Record<string, number>>({});

  // Catalog filter
  const [catalogSearch, setCatalogSearch] = useState("");

  // Step 3: Markup and fees
  const [markupPct, setMarkupPct] = useState(10);
  const [handlingPct, setHandlingPct] = useState(5);
  const [tolerancePct, setTolerancePct] = useState(20);
  // Subsidy tier — controls which price column (HET for Subsidized, standard for Commercial)
  const [subsidyTier, setSubsidyTier] = useState<"Subsidized" | "Commercial">("Subsidized");
  // Expected harvest window start (off-chain estimate, drives "Panen Minggu Ini")
  const [harvestDate, setHarvestDate] = useState<string>(defaultHarvestDate);

  // TX (create_agreement, coop-signed)
  const { state: txState, txHash, error: txError, run: runTx, reset: resetTx } = useTx();

  // After the tx confirms, persist the OFF-CHAIN detail the chain never
  // carries: the saprotan basket lines + harvest date. Runs once per tx hash.
  const [annotateState, setAnnotateState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [annotateError, setAnnotateError] = useState<string | null>(null);
  const annotatedHash = useRef<string | null>(null);
  useEffect(() => {
    if (txState !== "success" || !txHash || annotatedHash.current === txHash) return;
    annotatedHash.current = txHash;
    const inputs = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([catalogId, qty]) => ({ catalogId, qty }));
    (async () => {
      setAnnotateState("saving");
      setAnnotateError(null);
      try {
        const {
          data: { session },
        } = await getSupabase().auth.getSession();
        if (!session) throw new Error("Sesi berakhir. Silakan masuk kembali.");
        await annotateAgreement(
          { txHash, expectedHarvestDate: harvestDate || undefined, inputs },
          session.access_token,
        );
        setAnnotateState("done");
      } catch (e) {
        setAnnotateState("error");
        setAnnotateError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [txState, txHash, cart, harvestDate]);

  // ─── Derived values ────────────────────────────────────────────────────────

  const selectedFarmer = useMemo(
    () => farmers.find((f) => f.id === farmerId) ?? null,
    [farmers, farmerId],
  );

  // SearchSelect items: one per farmer, with reputation badge as extra
  const farmerItems: SearchSelectItem[] = useMemo(
    () =>
      farmers.map((f) => ({
        id: f.id,
        label: f.name,
        sublabel: `${f.kecamatan} · ${f.plotAreaHa} ha`,
        keywords: `${f.defaultCommodityCode === "GABAH" ? "gabah padi" : "jagung"} ${f.kecamatan}`,
        extra: (
          <span className="flex items-center gap-1.5">
            <ReputationBadge tier={f.repTier} />
            <SubsidyStatusBadge status={f.subsidyStatus} />
          </span>
        ),
      })),
    [farmers],
  );

  // Catalog filtered by search
  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((cat) =>
      `${cat.name} ${cat.code} ${cat.category} ${CATEGORY_LABEL[cat.category] ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [catalog, catalogSearch]);

  // When the farmer changes, use their default commodity
  const commodityCode = selectedFarmer?.defaultCommodityCode ?? "GABAH";

  const priceRef = useMemo(
    () => priceRefs.find((p) => p.commodityCode === commodityCode) ?? null,
    [priceRefs, commodityCode],
  );

  const yieldRow = useMemo(
    () => yieldTable.find((y) => y.commodityCode === commodityCode) ?? null,
    [yieldTable, commodityCode],
  );

  // Sum of (qty * basePriceSupplier) for all selected items
  const basePrincipal = useMemo(
    () =>
      catalog.reduce((sum, cat) => {
        const qty = cart[cat.id] ?? 0;
        return qty > 0 ? sum + cat.basePriceSupplier * BigInt(qty) : sum;
      }, 0n),
    [catalog, cart],
  );

  const markupBps = markupPct * 100; // e.g. 10% -> 1000 bps
  const handlingBps = handlingPct * 100;
  const toleranceBps = tolerancePct * 100;

  // Utang petani = harga pokok x (1 + markupBps/10000)
  const inputDebt = useMemo(
    () => (basePrincipal > 0n ? deriveInputDebt(basePrincipal, markupBps) : 0n),
    [basePrincipal, markupBps],
  );
  const markupAmount = inputDebt - basePrincipal; // always >= 0 for markupBps >= 0

  // Harvest estimate: plotAreaHa x avgYieldTPerHa x 1000 kg
  const plotAreaHa = selectedFarmer ? Number(selectedFarmer.plotAreaHa) : 0;
  const expectedVolKg = useMemo(
    () => (selectedFarmer && yieldRow ? Math.round(plotAreaHa * yieldRow.avgYieldTPerHa * 1000) : 0),
    [selectedFarmer, yieldRow, plotAreaHa],
  );

  const canSubmit =
    farmerId !== null &&
    basePrincipal > 0n &&
    selectedFarmer !== null &&
    supplier !== null &&
    priceRef !== null &&
    expectedVolKg > 0 &&
    txState === "idle";
  const isLoading = txState === "signing" || txState === "submitting";

  // ─── Submit ────────────────────────────────────────────────────────────────

  function handleCreate() {
    if (!selectedFarmer || !supplier || !priceRef || basePrincipal <= 0n) return;
    const expectedVolG = BigInt(expectedVolKg) * 1000n;
    runTx((coop) =>
      createAgreement({
        coop,
        farmer: selectedFarmer.walletAddress,
        supplier: supplier.walletAddress,
        commodity: {
          code: commodityCode,
          grade: GRADE_ESTIMATE,
          moistureBps: MOISTURE_BPS_ESTIMATE,
          hppVersion: HPP_VERSION,
        },
        subsidyTier,
        basePriceSupplier: basePrincipal,
        saprotanMarkupBps: markupBps,
        hppHandlingFeeBps: handlingBps,
        expectedVolG,
        hppPerKg: priceRef.hpp,
        toleranceBps,
        ktpHashHex: selectedFarmer.ktpHash,
      }),
    );
  }

  // ─── Cart helpers ──────────────────────────────────────────────────────────

  function toggleItem(catId: string, checked: boolean) {
    setCart((c) => ({ ...c, [catId]: checked ? 1 : 0 }));
  }

  function adjustQty(catId: string, delta: number) {
    setCart((c) => {
      const next = Math.max(0, (c[catId] ?? 0) + delta);
      return { ...c, [catId]: next };
    });
  }

  function handleReset() {
    setFarmerId(null);
    setCart({});
    setCatalogSearch("");
    setMarkupPct(10);
    setHandlingPct(5);
    setTolerancePct(20);
    setHarvestDate(defaultHarvestDate());
    setAnnotateState("idle");
    setAnnotateError(null);
    resetTx();
  }

  // ─── Loading / error ─────────────────────────────────────────────────────

  if (loading) {
    return <p className="text-sm text-muted-foreground">Memuat data referensi...</p>;
  }
  if (error) {
    return (
      <Alert tone="warning" title="Gagal memuat data referensi">
        {error}
      </Alert>
    );
  }

  // ─── Success view ──────────────────────────────────────────────────────────

  if (txState === "success" && txHash) {
    return (
      <div className="max-w-xl space-y-5">
        <Alert tone="success" title="Perjanjian berhasil dibuat" className="rounded-2xl p-5">
          <p className="text-sm leading-relaxed">
            Perjanjian untuk{" "}
            <span className="font-bold text-gray-900">{selectedFarmer?.name ?? "petani"}</span> telah dicatat
            ke Stellar Testnet. Status saat ini: Dibuat. Menunggu pengiriman saprotan dari Supplier
            sebelum utang menjadi aktif.
          </p>
          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-500 font-semibold">Transaksi:</span>
            <TxHashLink hash={txHash} />
          </div>
          <p className="mt-2 text-xs text-gray-500 font-semibold">
            {annotateState === "saving"
              ? "Menyimpan rincian saprotan dan jadwal panen..."
              : annotateState === "done"
                ? "Rincian saprotan dan jadwal panen tersimpan."
                : annotateState === "error"
                  ? `Rincian saprotan gagal tersimpan: ${annotateError ?? "kesalahan tak dikenal"}`
                  : null}
          </p>
        </Alert>
        <Button type="button" variant="outline" leftIcon={<RotateCcw size={16} />} onClick={handleReset} className="rounded-full px-5 py-2.5">
          Buat Perjanjian Lagi
        </Button>
      </div>
    );
  }

  // ─── Main form view ────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
      {/* ── Left: form steps (2/3 width on desktop) ── */}
      <div className="space-y-6 lg:col-span-2">
        {/* Step 1: Pilih Petani */}
        <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm p-5 sm:p-6">
          <CardHeader
            title="1. Pilih Petani"
            description="Pilih petani yang akan menerima saprotan. Lahan dan komoditas terisi otomatis."
            className="pb-4"
          />
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="farmer-select-trigger"
                className="mb-2 block text-sm font-bold text-gray-900"
              >
                Petani
              </label>
              <SearchSelect
                items={farmerItems}
                value={farmerId}
                onChange={(id) => {
                  setFarmerId(id);
                  setCart({});
                }}
                placeholder="Pilih petani..."
                searchPlaceholder="Cari nama, kecamatan, atau komoditas..."
              />
            </div>

            {selectedFarmer ? (
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#d2f9de] bg-[#ebf5e9]/55 px-5 py-4 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">{selectedFarmer.name}</p>
                  <p className="mt-1 text-xs text-gray-500 font-semibold">
                    {selectedFarmer.kecamatan}, lahan {selectedFarmer.plotAreaHa} ha,{" "}
                    {commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan Kering"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ReputationBadge tier={selectedFarmer.repTier} />
                  <SubsidyStatusBadge status={selectedFarmer.subsidyStatus} />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Step 2: Katalog Saprotan */}
        <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
          <CardHeader
            title="2. Katalog Saprotan"
            description="Centang barang yang akan diberikan, lalu atur jumlahnya."
            className="pb-4"
          />
          <CardContent className="p-0 pt-0">
            {/* Catalog search filter */}
            <div className="px-1 pb-4">
              <Input
                name="catalog-search"
                placeholder="Cari barang, kode, atau kategori..."
                leading={<Search size={15} className="text-gray-400" />}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="rounded-2xl border-gray-150"
              />
            </div>

            <p className="flex items-center gap-1.5 px-1 pb-3 text-xs text-gray-400 font-semibold">
              <Lock size={12} className="shrink-0 text-gray-400" />
              Harga pokok ditetapkan Supplier, tidak dapat diubah KMP.
            </p>

            {/* Fixed-height catalog list with custom slider. No horizontal
                scroll: rows stack responsively instead of a wide table. */}
            <ScrollArea maxHeight={340} className="border-t border-gray-55" viewportClassName="px-1 py-2">
              <ul className="divide-y divide-gray-50">
                {filteredCatalog.length === 0 ? (
                  <li className="py-6 text-center text-sm text-gray-500 font-medium">
                    Tidak ada barang yang cocok dengan pencarian.
                  </li>
                ) : (
                  filteredCatalog.map((cat) => {
                    const qty = cart[cat.id] ?? 0;
                    const checked = qty > 0;
                    const lineTotal = cat.basePriceSupplier * BigInt(qty);
                    return (
                      <li
                        key={cat.id}
                        className={cn(
                          "flex items-center gap-3.5 rounded-2xl px-3 py-4 transition-all",
                          checked && "bg-[#ebf5e9]/40 border border-soft-green/20",
                        )}
                      >
                        <input
                          type="checkbox"
                          id={`cat-${cat.id}`}
                          checked={checked}
                          onChange={(e) => toggleItem(cat.id, e.target.checked)}
                          className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-200 accent-primary"
                        />
                        <label htmlFor={`cat-${cat.id}`} className="min-w-0 flex-1 cursor-pointer">
                          <span className="block truncate font-bold text-gray-900 text-sm">
                            {cat.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {CATEGORY_LABEL[cat.category] ?? cat.category}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            <RupiahAmount smallest={cat.basePriceSupplier} className="text-xs" /> per
                            satuan
                          </span>
                        </label>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          {checked ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => adjustQty(cat.id, -1)}
                                aria-label="Kurangi jumlah"
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-soft-green/30 bg-[#ebf5e9] text-emerald-800 transition-colors hover:bg-emerald-100"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-6 text-center text-sm font-bold text-gray-900">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => adjustQty(cat.id, 1)}
                                aria-label="Tambah jumlah"
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-soft-green/30 bg-[#ebf5e9] text-emerald-800 transition-colors hover:bg-emerald-100"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleItem(cat.id, true)}
                              className="rounded-full border border-gray-150 px-4 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              Tambah
                            </button>
                          )}
                          {checked && qty > 0 ? (
                            <RupiahAmount smallest={lineTotal} className="text-xs font-bold text-gray-900 mt-0.5" />
                          ) : null}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </ScrollArea>

            {/* Running total */}
            <div className="flex items-center justify-between border-t border-gray-100 px-1 py-4.5 mt-2">
              <span className="text-sm font-bold text-gray-900">Total Pokok Supplier</span>
              <RupiahAmount smallest={basePrincipal} className="text-lg font-bold text-emerald-800" />
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Markup dan Biaya */}
        <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
          <CardHeader
            title="3. Markup dan Biaya"
            description="Tentukan markup saprotan KMP dan biaya penanganan panen."
            className="pb-4"
          />
          <CardContent>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {/* Markup saprotan */}
              <Input
                label="Markup Saprotan (%)"
                name="markup-pct"
                type="number"
                min="0"
                max="50"
                step="1"
                value={String(markupPct)}
                onChange={(e) =>
                  setMarkupPct(Math.max(0, Math.min(50, Number(e.target.value) || 0)))
                }
                className="rounded-2xl border-gray-150"
                hint={`${markupBps} bps`}
              />

              {/* Biaya penanganan (slider + numeric display) */}
              <div className="w-full">
                <label
                  htmlFor="handling-pct"
                  className="mb-2 block text-sm font-bold text-gray-900"
                >
                  Biaya Penanganan HPP (%)
                </label>
                <div className="flex h-12 items-center gap-3.5 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring transition-all">
                  <input
                    id="handling-pct"
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={handlingPct}
                    onChange={(e) => setHandlingPct(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer accent-primary"
                  />
                  <span className="w-8 shrink-0 text-right text-sm font-bold text-gray-900">
                    {handlingPct}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400 font-semibold">{handlingBps} bps</p>
              </div>

              {/* Toleransi volume */}
              <div className="w-full">
                <label
                  htmlFor="tolerance-pct"
                  className="mb-2 block text-sm font-bold text-gray-900"
                >
                  Toleransi Volume (%)
                </label>
                <div className="flex h-12 items-center gap-3.5 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring transition-all">
                  <input
                    id="tolerance-pct"
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={tolerancePct}
                    onChange={(e) => setTolerancePct(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer accent-primary"
                  />
                  <span className="w-8 shrink-0 text-right text-sm font-bold text-gray-900">
                    {tolerancePct}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400 font-semibold">{toleranceBps} bps</p>
              </div>
            </div>

            {/* Expected harvest window (off-chain estimate) */}
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Input
                label="Perkiraan Tanggal Panen"
                name="harvest-date"
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="rounded-2xl border-gray-150"
                hint="Estimasi jadwal panen, bisa disesuaikan"
              />
            </div>

            {/* Subsidy tier toggle */}
            <fieldset className="mt-5 space-y-2.5">
              <legend className="block text-sm font-bold text-gray-900">Jenis Subsidi</legend>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSubsidyTier("Subsidized")}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                    subsidyTier === "Subsidized"
                      ? "border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-200/50"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full border-2 ${
                    subsidyTier === "Subsidized"
                      ? "border-amber-500 bg-amber-400"
                      : "border-gray-300"
                  }`} />
                  Bersubsidi
                </button>
                <button
                  type="button"
                  onClick={() => setSubsidyTier("Commercial")}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                    subsidyTier === "Commercial"
                      ? "border-gray-400 bg-gray-100 text-gray-800 ring-2 ring-gray-200/50"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full border-2 ${
                    subsidyTier === "Commercial"
                      ? "border-gray-500 bg-gray-400"
                      : "border-gray-300"
                  }`} />
                  Komersial
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {subsidyTier === "Subsidized"
                  ? "HET pemerintah berlaku. Petani menerima bantuan pupuk bersubsidi."
                  : "Harga pasar komersial. Tidak ada HET."}
              </p>
              {subsidyTier === "Subsidized" &&
              selectedFarmer &&
              selectedFarmer.subsidyStatus !== "Terverifikasi" ? (
                <Alert tone="warning" className="mt-2 rounded-2xl text-xs">
                  Petani ini berstatus e-RDKK "
                  {selectedFarmer.subsidyStatus === "Belum" ? "Belum Terverifikasi" : "Non-Subsidi"}
                  ". Verifikasi e-RDKK dulu, atau pilih tier Komersial.
                </Alert>
              ) : null}
            </fieldset>
          </CardContent>
        </Card>
      </div>

      {/* ── Right: sticky summary ledger ── */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        {/* Cost structure ledger */}
        <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
          <CardHeader title="Struktur Biaya" className="pb-3" />
          <CardContent className="space-y-3 pt-3">
            <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
              <span className="text-gray-400 font-medium">Harga Pokok Supplier</span>
              <RupiahAmount smallest={basePrincipal} className="text-gray-900 font-bold" />
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
              <span className="text-gray-400 font-medium">Markup KMP ({markupPct}%)</span>
              <RupiahAmount smallest={markupAmount} className="text-gray-900 font-bold" />
            </div>
            <div className="rounded-2xl bg-[#ebf5e9] px-4 py-4 border border-[#d2f9de]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Utang Petani</span>
                {inputDebt > 0n ? (
                  <RupiahAmount smallest={inputDebt} className="text-lg font-bold text-emerald-800" />
                ) : (
                  <span className="text-lg font-bold text-gray-400">Rp0</span>
                )}
              </div>
            </div>
            <p className="text-[11px] text-gray-400 font-semibold leading-relaxed pt-1">
              Saat panen, utang ini dibagi menjadi residu pokok Supplier dan margin KMP secara
              otomatis oleh kontrak Soroban.
            </p>
          </CardContent>
        </Card>

        {/* Harvest estimate + HPP */}
        {selectedFarmer && yieldRow && priceRef ? (
          <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-6 sm:p-8">
            <CardHeader
              title="Estimasi Panen"
              action={<Wheat size={16} className="text-emerald-700" />}
              className="pb-3"
            />
            <CardContent className="space-y-4.5 pt-3">
              <div>
                <p className="text-xs font-bold text-gray-400">Formula (transparan)</p>
                <p className="mt-1.5 text-sm text-gray-800 font-semibold">
                  {selectedFarmer.plotAreaHa} ha &times; {yieldRow.avgYieldTPerHa} t/ha &times;
                  1.000 = <span className="font-semibold">{expectedVolKg.toLocaleString("id-ID")} kg</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Sumber: {yieldRow.source}, Kab. {yieldRow.kabupaten} {yieldRow.year}. Bukan
                  prediksi AI.
                </p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted-foreground">Harga HPP</p>
                <p className="mt-1 text-sm text-foreground">
                  <RupiahAmount smallest={priceRef.hpp} />
                  /kg
                </p>
                <p className="mt-1 text-[11px] text-gray-400 font-medium">{priceRef.hppSource}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-6 sm:p-8">
            <CardContent className="py-4">
              <p className="text-sm text-gray-400 font-semibold text-center leading-normal">
                Pilih petani untuk melihat estimasi panen dan harga HPP.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Plain-language preview */}
        {selectedFarmer && inputDebt > 0n && priceRef ? (
          <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-6 sm:p-8">
            <CardHeader
              title="Pratinjau Perjanjian"
              action={<Info size={14} className="text-gray-400" />}
              className="pb-3"
            />
            <CardContent className="pt-3">
              <p className="text-xs leading-relaxed font-semibold text-gray-700">
                Bapak/Ibu <span className="font-bold text-gray-900">{selectedFarmer.name}</span> menerima
                saprotan senilai <span className="font-bold text-gray-900">{formatRupiah(inputDebt)}</span>.
                Setelah panen, KMP membeli hasil dengan harga{" "}
                <span className="font-semibold">{formatRupiah(priceRef.hpp)}/kg</span>. Utang
                dipotong otomatis dari pembayaran panen.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Submit area */}
        <div className="space-y-2 pt-2">
          {isLoading ? (
            <div className="flex items-center gap-2.5 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-250 border-t-primary" />
              <span className="text-xs text-gray-500 font-semibold">
                {txState === "signing"
                  ? "Menunggu tanda tangan Freighter..."
                  : "Mengirim ke Stellar Testnet..."}
              </span>
            </div>
          ) : null}

          {txError ? (
            <Alert tone="warning" title="Transaksi gagal">
              {txError}
            </Alert>
          ) : null}

          <Button className="w-full" variant="primary" disabled={!canSubmit} onClick={handleCreate}>
            Buat Perjanjian
          </Button>

          {farmerId === null ? (
            <p className="text-center text-xs text-gray-400 font-semibold">
              Pilih petani terlebih dahulu.
            </p>
          ) : basePrincipal === 0n ? (
            <p className="text-center text-xs text-gray-400 font-semibold">
              Pilih minimal satu item saprotan.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
