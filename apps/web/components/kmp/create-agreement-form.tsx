"use client";

// Screen C helper — Create Offtake Agreement form (PRD §8.1).
// Two-column layout: form steps left, sticky summary ledger right.
// All money via RupiahAmount/formatRupiah. No em dashes. No hardcoded hex.

import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { useMockTx } from "@/components/kmp/use-mock-tx";
import {
  MOCK_CATALOG,
  MOCK_FARMERS,
  MOCK_PRICE_REFS,
  MOCK_YIELD_TABLE,
  formatKg,
} from "@/lib/mock-data";
import { deriveInputDebt, formatRupiah } from "@annona/core";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  ReputationBadge,
  RupiahAmount,
  TxHashLink,
} from "@annona/ui";
import { Info, Lock, Minus, Plus, RotateCcw, Wheat } from "lucide-react";
import { useMemo, useState } from "react";

// Catalog item category labels in Bahasa
const CATEGORY_LABEL: Record<string, string> = {
  pupuk: "Pupuk",
  benih: "Benih",
  pestisida: "Pestisida",
  alsintan: "Alsintan",
};

export function CreateAgreementForm() {
  // Step 1: Farmer
  const [farmerId, setFarmerId] = useState("");

  // Step 2: Catalog cart (catalogId -> qty; qty 0 means not selected)
  const [cart, setCart] = useState<Record<string, number>>({});

  // Step 3: Markup and fees
  const [markupPct, setMarkupPct] = useState(10);
  const [handlingPct, setHandlingPct] = useState(5);
  const [tolerancePct, setTolerancePct] = useState(20);

  // TX simulation
  const { state: txState, txHash, run: runTx, reset: resetTx } = useMockTx();

  // ─── Derived values ────────────────────────────────────────────────────────

  const selectedFarmer = useMemo(
    () => MOCK_FARMERS.find((f) => f.id === farmerId) ?? null,
    [farmerId],
  );

  // When the farmer changes, use their default commodity
  const commodityCode = selectedFarmer?.defaultCommodityCode ?? "GABAH";

  const priceRef = useMemo(
    () => MOCK_PRICE_REFS.find((p) => p.commodityCode === commodityCode) ?? null,
    [commodityCode],
  );

  const yieldRow = useMemo(
    () => MOCK_YIELD_TABLE.find((y) => y.commodityCode === commodityCode) ?? null,
    [commodityCode],
  );

  // Sum of (qty * basePriceAgrinas) for all selected items
  const basePrincipal = useMemo(
    () =>
      MOCK_CATALOG.reduce((sum, cat) => {
        const qty = cart[cat.id] ?? 0;
        return qty > 0 ? sum + cat.basePriceAgrinas * BigInt(qty) : sum;
      }, 0n),
    [cart],
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
  const expectedVolKg = useMemo(
    () =>
      selectedFarmer && yieldRow
        ? Math.round(selectedFarmer.plotAreaHa * yieldRow.avgYieldTPerHa * 1000)
        : 0,
    [selectedFarmer, yieldRow],
  );

  const canSubmit = !!farmerId && basePrincipal > 0n && txState === "idle";
  const isLoading = txState === "signing" || txState === "submitting";

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
    setFarmerId("");
    setCart({});
    setMarkupPct(10);
    setHandlingPct(5);
    setTolerancePct(20);
    resetTx();
  }

  // ─── Success view ──────────────────────────────────────────────────────────

  if (txState === "success" && txHash) {
    return (
      <div className="max-w-xl space-y-4">
        <Alert tone="success" title="Perjanjian berhasil dibuat">
          <p>
            Perjanjian untuk{" "}
            <span className="font-semibold">{selectedFarmer?.name ?? "petani"}</span> telah dicatat
            ke Stellar Testnet. Status saat ini: Dibuat. Menunggu pengiriman saprotan dari Agrinas
            sebelum utang menjadi aktif.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Transaksi:</span>
            <TxHashLink hash={txHash} />
          </div>
        </Alert>
        <Button variant="outline" leftIcon={<RotateCcw size={16} />} onClick={handleReset}>
          Buat Perjanjian Lagi
        </Button>
      </div>
    );
  }

  // ─── Main form view ────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ── Left: form steps (2/3 width on desktop) ── */}
      <div className="space-y-6 lg:col-span-2">
        {/* Step 1: Pilih Petani */}
        <Card>
          <CardHeader
            title="1. Pilih Petani"
            description="Pilih petani yang akan menerima saprotan. Lahan dan komoditas terisi otomatis."
          />
          <CardContent className="space-y-3">
            <div>
              <label
                htmlFor="farmer-select"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Petani
              </label>
              <select
                id="farmer-select"
                value={farmerId}
                onChange={(e) => {
                  setFarmerId(e.target.value);
                  setCart({}); // reset catalog when farmer changes
                }}
                className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Pilih petani...</option>
                {MOCK_FARMERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.kecamatan})
                  </option>
                ))}
              </select>
            </div>

            {selectedFarmer ? (
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface-muted/60 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{selectedFarmer.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedFarmer.kecamatan}, lahan {selectedFarmer.plotAreaHa} ha,{" "}
                    {commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan Kering"}
                  </p>
                </div>
                <ReputationBadge tier={selectedFarmer.repTier} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Step 2: Katalog Saprotan */}
        <Card>
          <CardHeader
            title="2. Katalog Saprotan"
            description="Centang barang yang akan diberikan, lalu atur jumlahnya."
          />
          <CardContent className="p-0 pt-0">
            <TableFrame className="rounded-none border-0 shadow-none">
              <Table>
                <THead>
                  <Th className="w-10" />
                  <Th>Nama Barang</Th>
                  <Th>Kategori</Th>
                  <Th>
                    <span className="flex items-center gap-1">
                      <Lock size={11} className="shrink-0 text-muted-foreground" />
                      Harga Pokok Agrinas
                    </span>
                  </Th>
                  <Th className="w-28">Jumlah</Th>
                  <Th className="text-right">Total Baris</Th>
                </THead>
                <TBody>
                  {MOCK_CATALOG.map((cat) => {
                    const qty = cart[cat.id] ?? 0;
                    const checked = qty > 0;
                    const lineTotal = cat.basePriceAgrinas * BigInt(qty);
                    return (
                      <Tr key={cat.id} className={checked ? "bg-verdant-50/40" : ""}>
                        <Td>
                          <input
                            type="checkbox"
                            id={`cat-${cat.id}`}
                            checked={checked}
                            onChange={(e) => toggleItem(cat.id, e.target.checked)}
                            className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                          />
                        </Td>
                        <Td>
                          <label
                            htmlFor={`cat-${cat.id}`}
                            className="cursor-pointer font-medium text-foreground"
                          >
                            {cat.name}
                          </label>
                          <p className="text-xs text-muted-foreground">{cat.unitLabel}</p>
                        </Td>
                        <Td className="text-muted-foreground">
                          {CATEGORY_LABEL[cat.category] ?? cat.category}
                        </Td>
                        <Td>
                          <RupiahAmount smallest={cat.basePriceAgrinas} />
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            per {cat.unitLabel}
                          </p>
                        </Td>
                        <Td>
                          {checked ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => adjustQty(cat.id, -1)}
                                aria-label="Kurangi jumlah"
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold text-foreground">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => adjustQty(cat.id, 1)}
                                aria-label="Tambah jumlah"
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">0</span>
                          )}
                        </Td>
                        <Td className="text-right">
                          {checked && qty > 0 ? (
                            <RupiahAmount smallest={lineTotal} />
                          ) : (
                            <span className="text-muted-foreground">Rp0</span>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            </TableFrame>

            {/* Running total */}
            <div className="flex items-center justify-between border-t border-border bg-surface-muted/30 px-5 py-3">
              <span className="text-sm font-medium text-muted-foreground">Total Pokok Agrinas</span>
              <RupiahAmount smallest={basePrincipal} className="text-base" />
            </div>
            <p className="border-t border-border px-5 py-2 text-xs text-muted-foreground">
              Harga pokok ditetapkan oleh Agrinas dan tidak dapat diubah oleh KMP.
            </p>
          </CardContent>
        </Card>

        {/* Step 3: Markup dan Biaya */}
        <Card>
          <CardHeader
            title="3. Markup dan Biaya"
            description="Tentukan markup saprotan KMP dan biaya penanganan panen."
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
                hint={`${markupBps} bps`}
              />

              {/* Biaya penanganan (slider + numeric display) */}
              <div className="w-full">
                <label
                  htmlFor="handling-pct"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Biaya Penanganan HPP (%)
                </label>
                <div className="flex h-11 items-center gap-3 rounded-md border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-ring">
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
                  <span className="w-8 shrink-0 text-right text-sm font-semibold text-foreground">
                    {handlingPct}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{handlingBps} bps</p>
              </div>

              {/* Toleransi volume */}
              <div className="w-full">
                <label
                  htmlFor="tolerance-pct"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Toleransi Volume (%)
                </label>
                <div className="flex h-11 items-center gap-3 rounded-md border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-ring">
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
                  <span className="w-8 shrink-0 text-right text-sm font-semibold text-foreground">
                    {tolerancePct}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{toleranceBps} bps</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Right: sticky summary ledger ── */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        {/* Cost structure ledger */}
        <Card>
          <CardHeader title="Struktur Biaya" />
          <CardContent className="space-y-3 pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Harga Pokok Agrinas</span>
              <RupiahAmount smallest={basePrincipal} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Markup KMP ({markupPct}%)</span>
              <RupiahAmount smallest={markupAmount} />
            </div>
            <div className="rounded-lg bg-verdant-50 px-3 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Utang Petani</span>
                {inputDebt > 0n ? (
                  <RupiahAmount smallest={inputDebt} className="text-lg" />
                ) : (
                  <span className="text-lg font-semibold text-muted-foreground">Rp0</span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Saat panen, utang ini dibagi menjadi residu pokok Agrinas dan margin KMP secara
              otomatis oleh kontrak Soroban.
            </p>
          </CardContent>
        </Card>

        {/* Harvest estimate + HPP */}
        {selectedFarmer && yieldRow && priceRef ? (
          <Card>
            <CardHeader
              title="Estimasi Panen"
              action={<Wheat size={16} className="text-verdant-500" />}
            />
            <CardContent className="space-y-3 pt-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Formula (transparan)</p>
                <p className="mt-1 text-sm text-foreground">
                  {selectedFarmer.plotAreaHa} ha &times; {yieldRow.avgYieldTPerHa} t/ha &times;
                  1.000 = <span className="font-semibold">{formatKg(expectedVolKg)}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Sumber: {yieldRow.source}, Kab. Cianjur {yieldRow.year}. Bukan prediksi AI.
                </p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted-foreground">Harga HPP</p>
                <p className="mt-1 text-sm text-foreground">
                  <RupiahAmount smallest={priceRef.hppPerKg} />
                  /kg
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{priceRef.hppSource}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                Pilih petani untuk melihat estimasi panen dan harga HPP.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Plain-language preview */}
        {selectedFarmer && inputDebt > 0n && priceRef ? (
          <Card>
            <CardHeader
              title="Pratinjau Perjanjian"
              action={<Info size={14} className="text-muted-foreground" />}
            />
            <CardContent className="pt-3">
              <p className="text-sm leading-relaxed text-foreground">
                Bapak/Ibu <span className="font-semibold">{selectedFarmer.name}</span> menerima
                saprotan senilai <span className="font-semibold">{formatRupiah(inputDebt)}</span>.
                Setelah panen, KMP membeli hasil dengan harga{" "}
                <span className="font-semibold">{formatRupiah(priceRef.hppPerKg)}/kg</span>. Utang
                dipotong otomatis dari pembayaran panen.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Submit area */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
              <span className="text-sm text-muted-foreground">
                {txState === "signing"
                  ? "Menunggu tanda tangan Freighter..."
                  : "Mengirim ke Stellar Testnet..."}
              </span>
            </div>
          ) : null}

          <Button className="w-full" variant="primary" disabled={!canSubmit} onClick={runTx}>
            Buat Perjanjian
          </Button>

          {!farmerId ? (
            <p className="text-center text-xs text-muted-foreground">
              Pilih petani terlebih dahulu.
            </p>
          ) : basePrincipal === 0n ? (
            <p className="text-center text-xs text-muted-foreground">
              Pilih minimal satu item saprotan.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
