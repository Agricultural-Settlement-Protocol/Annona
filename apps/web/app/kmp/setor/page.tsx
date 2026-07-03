"use client";

/** Screen D — Setor dan Bayar (PRD §8.1). The flagship action screen.
 *  Flow: pilih perjanjian → catat setoran (tx1) → selesaikan pembayaran (tx2)
 *  → tandai residu disetor (tx3). Force majeure as an alternative path.
 *  Gradient button variant is used EXACTLY ONCE: the final settle action. */

import { PageHeader } from "@/components/kmp/page-header";
import { useMockTx } from "@/components/kmp/use-mock-tx";
import { MOCK_AGREEMENTS, getFarmer } from "@/lib/mock-data";
import { classifyFlag, computeSplitSettlement, formatRupiah, kgToGrams } from "@annona/core";
import type { Status } from "@annona/core";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  ProgressBar,
  RupiahAmount,
  SplitSettlementCard,
  StatusBadge,
  TxHashLink,
} from "@annona/ui";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  CloudRain,
  Scale,
  ShieldCheck,
  Wheat,
  X,
} from "lucide-react";
import { useState } from "react";

/** Agreements that can receive a new delivery or settlement. */
const DELIVERABLE: Status[] = ["Active", "PartiallyDelivered", "Delivered"];

/** Flag banner text and tone for a given ratio. */
function flagMeta(flag: ReturnType<typeof classifyFlag> | null): {
  tone: "success" | "warning" | "danger";
  label: string;
  detail: string;
} {
  if (!flag || flag === "None")
    return {
      tone: "success",
      label: "Sesuai perkiraan",
      detail: "Jumlah setoran berada di atas ambang batas 98% perkiraan.",
    };
  if (flag === "Warning")
    return {
      tone: "warning",
      label: "Di bawah perkiraan, akan ditinjau",
      detail: "Setoran antara 80% dan 98% dari perkiraan. Catatan tinjauan dibuat otomatis.",
    };
  if (flag === "PartialDelivery")
    return {
      tone: "warning",
      label: "Jauh di bawah perkiraan, perlu peninjauan petugas",
      detail: "Setoran antara 40% dan 80% dari perkiraan. Petugas lapangan perlu mengkonfirmasi.",
    };
  // "Suspected"
  return {
    tone: "danger",
    label: "Sangat di bawah perkiraan, perlu peninjauan segera",
    detail:
      "Setoran di bawah 40% perkiraan. Flag ditetapkan, petugas harus meninjau sebelum proses lanjut.",
  };
}

export default function SetorPage() {
  /* ── Form state ─────────────────────────────────────────────────────── */
  const [selectedId, setSelectedId] = useState("");
  const [volumeKg, setVolumeKg] = useState("");
  const [grade, setGrade] = useState<"A" | "B" | "C">("B");
  const [moisturePct, setMoisturePct] = useState("22");

  /* ── Force majeure state ─────────────────────────────────────────────── */
  const [showFmConfirm, setShowFmConfirm] = useState(false);
  const [fmReason, setFmReason] = useState("");

  /* ── TX hooks (one per on-chain action) ─────────────────────────────── */
  const txDeliver = useMockTx(); // step 1: catat setoran
  const txSettle = useMockTx(); // step 2: selesaikan pembayaran
  const txResidu = useMockTx(); // step 3: tandai residu disetor
  const txFm = useMockTx(); // alternative: tandai gagal panen

  /* ── Derived state ───────────────────────────────────────────────────── */
  const deliverableAgreements = MOCK_AGREEMENTS.filter((a) => DELIVERABLE.includes(a.status));

  const agreement = MOCK_AGREEMENTS.find((a) => a.id === selectedId) ?? null;
  const farmer = agreement ? getFarmer(agreement.farmerId) : null;

  const inputKgNum = Number.parseFloat(volumeKg) || 0;
  const deliveredSoFarKg = agreement ? Number(agreement.deliveredVolG / 1000n) : 0;
  const totalDeliveredKg = deliveredSoFarKg + inputKgNum;
  const ratio = agreement && inputKgNum > 0 ? totalDeliveredKg / agreement.expectedVolKg : -1;
  const flagResult = agreement && inputKgNum > 0 ? classifyFlag(ratio) : null;
  const { tone: flagTone, label: flagLabel, detail: flagDetail } = flagMeta(flagResult);

  /** Live split preview — recomputed on every keystroke. */
  const split =
    agreement && inputKgNum > 0
      ? computeSplitSettlement({
          deliveredVolG: kgToGrams(inputKgNum),
          settledVolG: 0n,
          hppPerKg: agreement.hppPerKg,
          remainingDebt: agreement.remainingDebt,
          hppHandlingFeeBps: agreement.hppHandlingFeeBps,
          basePriceAgrinas: agreement.basePriceAgrinas,
          inputDebt: agreement.inputDebt,
        })
      : null;

  /* ── UI state helpers ────────────────────────────────────────────────── */
  const formLocked = txDeliver.state === "success" || txFm.state === "success";
  const showStep2 = txDeliver.state === "success" && txFm.state !== "success";
  const showLunas = txSettle.state === "success";
  const showFmSuccess = txFm.state === "success";

  const canDeliver = !!agreement && inputKgNum > 0 && txDeliver.state === "idle" && !showFmSuccess;
  const canSettle = txDeliver.state === "success" && txSettle.state === "idle";
  const canRemit = txResidu.state === "idle";

  /* ── JSX ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <PageHeader
        title="Setor dan Bayar"
        description="Catat setoran panen petani, hitung split tiga arah, dan selesaikan pembayaran."
      />

      {/* Step 1A: Pilih perjanjian */}
      <Card>
        <CardHeader
          title="Pilih Perjanjian"
          description="Hanya perjanjian Berjalan, Sebagian Disetor, atau Disetor yang dapat menerima setoran."
          action={<Wheat size={18} className="text-verdant-400" />}
        />
        <CardContent>
          <div className="relative">
            <label
              htmlFor="select-agm"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Perjanjian aktif
            </label>
            <div className="relative">
              <select
                id="select-agm"
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setVolumeKg("");
                  setGrade("B");
                  setMoisturePct("22");
                  setShowFmConfirm(false);
                  setFmReason("");
                  // Reset TX states so officer can start fresh after picking a new agreement
                  txDeliver.reset();
                  txSettle.reset();
                  txResidu.reset();
                  txFm.reset();
                }}
                disabled={formLocked}
                className="h-11 w-full appearance-none rounded-md border border-border bg-surface px-3 pr-8 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">-- pilih perjanjian --</option>
                {deliverableAgreements.map((a) => {
                  const f = getFarmer(a.farmerId);
                  const remainKg = a.expectedVolKg - Number(a.deliveredVolG / 1000n);
                  return (
                    <option key={a.id} value={a.id}>
                      #{String(a.onchainId)}: {f?.name ?? "(petani)"},{" "}
                      {a.commodityCode === "GABAH" ? "Gabah" : "Jagung"}, sisa{" "}
                      {remainKg.toLocaleString("id-ID")} kg
                    </option>
                  );
                })}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>

          {/* Selected agreement quick info */}
          {agreement && (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface-muted/60 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{farmer?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {agreement.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan"},{" "}
                  perkiraan {agreement.expectedVolKg.toLocaleString("id-ID")} kg
                </p>
              </div>
              <StatusBadge status={agreement.status} />
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Utang tersisa</p>
                <RupiahAmount smallest={agreement.remainingDebt} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 1B: Matriks Pengukuran */}
      {agreement && (
        <Card>
          <CardHeader
            title="Matriks Pengukuran"
            description="Data fisik hasil timbang dari gudang. Kadar air mempengaruhi kualitas, bukan harga HPP."
            action={<Scale size={18} className="text-verdant-400" />}
          />
          <CardContent>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Input
                label="Volume Bersih (kg)"
                type="number"
                name="volume"
                min="0"
                step="1"
                placeholder="0"
                value={volumeKg}
                onChange={(e) => setVolumeKg(e.target.value)}
                disabled={formLocked}
                hint={`Sisa perkiraan: ${(agreement.expectedVolKg - deliveredSoFarKg).toLocaleString("id-ID")} kg`}
              />

              <div className="w-full">
                <label
                  htmlFor="select-grade"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Grade
                </label>
                <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-ring">
                  <select
                    id="select-grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as "A" | "B" | "C")}
                    disabled={formLocked}
                    className="h-full w-full bg-transparent text-sm text-foreground outline-none disabled:opacity-50"
                  >
                    <option value="A">Grade A (terbaik)</option>
                    <option value="B">Grade B (standar)</option>
                    <option value="C">Grade C (di bawah standar)</option>
                  </select>
                </div>
              </div>

              <Input
                label="Kadar Air (%)"
                type="number"
                name="moisture"
                min="0"
                max="100"
                step="0.1"
                value={moisturePct}
                onChange={(e) => setMoisturePct(e.target.value)}
                disabled={formLocked}
                hint="Gabah kering panen SOP maks 25%"
              />
            </div>

            {Number.parseFloat(moisturePct) > 25 && (
              <Alert tone="warning" className="mt-4">
                Kadar air {moisturePct}% melebihi batas SOP gabah kering panen (maks 25%). Pastikan
                pengukuran benar sebelum mencatat setoran.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live preview: flag status + split card */}
      {split && inputKgNum > 0 && agreement && (
        <>
          {/* Flag preview */}
          <Card>
            <CardHeader
              title="Prakiraan Flag Setoran"
              description="Berdasarkan rasio setoran terhadap perkiraan. Flag hanya indikator, bukan keputusan final."
              action={<AlertTriangle size={18} className="text-amber-400" />}
            />
            <CardContent className="space-y-4">
              <Alert tone={flagTone} title={flagLabel}>
                {flagDetail}
                {inputKgNum > 0 && (
                  <span className="mt-1 block tabular-nums text-xs">
                    Total disetor: {totalDeliveredKg.toLocaleString("id-ID")} kg dari{" "}
                    {agreement.expectedVolKg.toLocaleString("id-ID")} kg perkiraan (
                    {Math.round(ratio * 100)}%)
                  </span>
                )}
              </Alert>

              {/* Threshold visual */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Ambang batas flag:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-verdant-100 px-2.5 py-1 text-xs font-medium text-verdant-700">
                    98% ke atas: Sesuai
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    80 hingga 98%: Di bawah perkiraan
                  </span>
                  <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-medium text-amber-800">
                    40 hingga 80%: Jauh di bawah
                  </span>
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                    Di bawah 40%: Perlu peninjauan segera
                  </span>
                </div>
              </div>

              <ProgressBar
                value={Math.min(totalDeliveredKg, agreement.expectedVolKg)}
                max={agreement.expectedVolKg}
                label={`${Math.round(ratio * 100)}% dari perkiraan`}
                tone={ratio >= 0.98 ? "verdant" : ratio >= 0.8 ? "verdant" : "aqua"}
              />
            </CardContent>
          </Card>

          {/* Split preview */}
          <Card>
            <CardHeader
              title="Prakiraan Pembagian Kas"
              description={`Berdasarkan HPP ${formatRupiah(agreement.hppPerKg)}/kg, ${inputKgNum.toLocaleString("id-ID")} kg volume bersih. Formula transparan, sumber Inpres HPP.`}
              action={<Banknote size={18} className="text-aqua-400" />}
            />
            <CardContent>
              <SplitSettlementCard
                gross={split.grossSmallest}
                handlingCut={split.handlingCut}
                netToFarmer={split.netToFarmer}
                residuPrincipal={split.principalToAgrinas}
                coopMargin={split.coopMargin}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Ini adalah prakiraan. Jumlah final dikunci saat transaksi on-chain selesai.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 1 actions */}
      {!showLunas && !showFmSuccess && agreement && (
        <Card>
          <CardHeader
            title="Tindakan Setoran"
            description="Catat setoran ke blockchain Stellar. Setiap tindakan memerlukan tanda tangan dompet."
          />
          <CardContent className="space-y-4">
            {/* Step 1: Catat setoran */}
            {txDeliver.state !== "success" && (
              <div className="space-y-3">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Wheat size={16} />}
                  disabled={!canDeliver || txDeliver.state !== "idle"}
                  onClick={txDeliver.run}
                  className="w-full sm:w-auto"
                >
                  {txDeliver.state === "signing"
                    ? "Menandatangani..."
                    : txDeliver.state === "submitting"
                      ? "Mengirim ke Stellar..."
                      : "Catat Setoran"}
                </Button>
                {txDeliver.state === "signing" && (
                  <p className="text-xs text-muted-foreground">
                    Konfirmasi tanda tangan di Freighter. Jangan tutup jendela.
                  </p>
                )}
                {txDeliver.state === "submitting" && (
                  <p className="text-xs text-muted-foreground">
                    Menunggu konfirmasi Stellar. Proses 5 hingga 10 detik.
                  </p>
                )}
                {!canDeliver && txDeliver.state === "idle" && (
                  <p className="text-xs text-muted-foreground">
                    Pilih perjanjian dan masukkan volume setoran untuk melanjutkan.
                  </p>
                )}
              </div>
            )}

            {/* Step 1 success */}
            {txDeliver.state === "success" && txDeliver.txHash && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-verdant-200 bg-verdant-50 px-4 py-3">
                <CheckCircle2 size={18} className="text-verdant-700" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-verdant-700">
                    Resi panen tercatat di chain
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bukti setoran tersimpan permanen di Stellar testnet.
                  </p>
                </div>
                <TxHashLink hash={txDeliver.txHash} />
              </div>
            )}

            {/* Step 2: Selesaikan pembayaran
                ONLY place where variant="gradient" is used — the Lunas moment. */}
            {showStep2 && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">
                  Setoran tercatat. Selesaikan pembayaran untuk mencairkan dana ke petani.
                </p>
                <Button
                  variant="gradient"
                  size="md"
                  leftIcon={<Banknote size={16} />}
                  disabled={!canSettle}
                  onClick={txSettle.run}
                  className="w-full sm:w-auto"
                >
                  {txSettle.state === "signing"
                    ? "Menandatangani..."
                    : txSettle.state === "submitting"
                      ? "Mencatat di Stellar..."
                      : "Selesaikan Pembayaran"}
                </Button>
                {txSettle.state !== "idle" && txSettle.state !== "success" && (
                  <p className="text-xs text-muted-foreground">
                    Mencatat split tiga arah di blockchain. Tunggu konfirmasi.
                  </p>
                )}
              </div>
            )}

            {/* Force Majeure — quiet alternative path */}
            {txDeliver.state === "idle" && (
              <div className="border-t border-border pt-4">
                {!showFmConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowFmConfirm(true)}
                    className="flex items-center gap-1.5 text-sm text-red-600 hover:underline focus:outline-none"
                  >
                    <CloudRain size={14} />
                    Tandai Gagal Panen
                  </button>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-red-700">Konfirmasi Gagal Panen</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowFmConfirm(false);
                          setFmReason("");
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <Alert tone="info">
                      Gagal panen dikonfirmasi tanpa penalti reputasi. Utang direstrukturisasi di
                      luar sistem sesuai prosedur koperasi.
                    </Alert>
                    <div>
                      <label
                        htmlFor="fm-reason"
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        Alasan gagal panen
                      </label>
                      <textarea
                        id="fm-reason"
                        value={fmReason}
                        onChange={(e) => setFmReason(e.target.value)}
                        placeholder="Contoh: Banjir, hama, kekeringan..."
                        rows={3}
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<CloudRain size={14} />}
                        disabled={!fmReason.trim() || txFm.state !== "idle"}
                        onClick={txFm.run}
                      >
                        {txFm.state === "signing"
                          ? "Menandatangani..."
                          : txFm.state === "submitting"
                            ? "Mengirim..."
                            : "Konfirmasi Gagal Panen"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowFmConfirm(false);
                          setFmReason("");
                        }}
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lunas panel — shown after txSettle success */}
      {showLunas && split && txSettle.txHash && txDeliver.txHash && (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/80 p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground">Catatan penyelesaian tercatat</h3>
                <p className="text-sm text-muted-foreground">
                  Catatan anti-manipulasi di Stellar. Kas keluar dari BRILink atau BRI, split tiga
                  arah dikunci on-chain.
                </p>
              </div>
            </div>
            <TxHashLink hash={txSettle.txHash} />
          </div>

          {/* Final split card */}
          <SplitSettlementCard
            gross={split.grossSmallest}
            handlingCut={split.handlingCut}
            netToFarmer={split.netToFarmer}
            residuPrincipal={split.principalToAgrinas}
            coopMargin={split.coopMargin}
          />

          {/* Residu reminder */}
          <Alert tone="warning" title="Residu pokok Agrinas terkunci di kas">
            Sebesar <RupiahAmount smallest={split.principalToAgrinas} className="text-sm" /> adalah
            uang Agrinas yang tersimpan sementara di kas koperasi. Segera remitkan ke rekening
            Agrinas untuk menyelesaikan kewajiban.
          </Alert>

          {/* Tandai Residu Disetor — tx3 (accent variant, on-chain) */}
          {txResidu.state !== "success" ? (
            <div className="space-y-2">
              <Button
                variant="accent"
                size="md"
                leftIcon={<ShieldCheck size={16} />}
                disabled={!canRemit}
                onClick={txResidu.run}
              >
                {txResidu.state === "signing"
                  ? "Menandatangani..."
                  : txResidu.state === "submitting"
                    ? "Mencatat di Stellar..."
                    : "Tandai Residu Disetor"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Tindakan ini mencatat bukti remitansi ke Agrinas di blockchain.
              </p>
            </div>
          ) : (
            txResidu.txHash && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-aqua-200 bg-aqua-50 px-4 py-3">
                <CheckCircle2 size={16} className="text-aqua-700" />
                <p className="flex-1 text-sm font-medium text-aqua-700">
                  Remitansi residu tercatat di chain
                </p>
                <TxHashLink hash={txResidu.txHash} />
              </div>
            )
          )}
        </div>
      )}

      {/* Force Majeure success panel */}
      {showFmSuccess && txFm.txHash && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50/80 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <CloudRain size={22} className="text-red-600" />
            </span>
            <div>
              <h3 className="font-bold text-foreground">Gagal panen dikonfirmasi</h3>
              <p className="text-sm text-muted-foreground">
                Tanpa penalti reputasi. Utang akan direstrukturisasi di luar sistem.
              </p>
            </div>
            <TxHashLink hash={txFm.txHash} />
          </div>
          <Alert tone="info">
            Catatan force majeure tercatat di Stellar. Petugas lapangan dapat melanjutkan proses
            restrukturisasi utang sesuai prosedur koperasi.
          </Alert>
        </div>
      )}
    </div>
  );
}
