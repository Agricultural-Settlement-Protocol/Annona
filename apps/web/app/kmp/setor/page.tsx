"use client";

/**
 * Screen: Setor Panen — record harvest deposits (deliveries) only.
 * Payment has moved to /kmp/pembayaran.
 *
 * Flow: pilih perjanjian → catat setoran (tx1) →
 *   (a) setor lagi: reset form, repeat, or
 *   (b) tandai setoran selesai (tx2) → finalize + link to pembayaran.
 * Force majeure: quiet alternative path from idle state.
 * No gradient button here — that lives solely on /kmp/pembayaran.
 */

import { fetchAgreements, fetchDeliveries, fetchFarmers, farmerMap } from "@/lib/api";
import { DepositHistoryTable } from "@/components/kmp/deposit-history-table";
import { PageHeader } from "@/components/kmp/page-header";
import { SearchSelect } from "@/components/kmp/search-select";
import type { SearchSelectItem } from "@/components/kmp/search-select";
import { useMockTx } from "@/components/kmp/use-mock-tx";
import { useTx } from "@/components/kmp/use-tx";
import { markForceMajeure, recordDelivery, toReasonSymbol } from "@/lib/invocations";
import { useApi } from "@/lib/use-api";
import { classifyFlag } from "@annona/core";
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
  StatusBadge,
  TxHashLink,
} from "@annona/ui";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CloudRain,
  History,
  Scale,
  Wheat,
  X,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useRef, useState } from "react";

/** Agreements that can receive a new deposit. */
const DEPOSIT_ELIGIBLE: Status[] = ["Active", "PartiallyDelivered"];

/** Flag banner metadata for a given classification. No em dashes. */
function flagMeta(flag: ReturnType<typeof classifyFlag> | null): {
  tone: "success" | "warning" | "danger";
  label: string;
  detail: string;
} {
  if (!flag || flag === "None")
    return {
      tone: "success",
      label: "Sesuai perkiraan",
      detail: "Jumlah setoran berada di atas ambang batas 98% perkiraan. Tidak ada flag.",
    };
  if (flag === "Warning")
    return {
      tone: "warning",
      label: "Di bawah perkiraan, akan ditinjau saat selesai",
      detail:
        "Setoran antara 80% dan 98% dari perkiraan. Catatan tinjauan dibuat saat setoran diselesaikan.",
    };
  if (flag === "PartialDelivery")
    return {
      tone: "warning",
      label: "Jauh di bawah perkiraan, perlu peninjauan petugas",
      detail:
        "Setoran antara 40% dan 80% dari perkiraan. Petugas lapangan perlu mengkonfirmasi sebelum proses lanjut.",
    };
  return {
    tone: "danger",
    label: "Sangat di bawah perkiraan, perlu peninjauan segera",
    detail:
      "Setoran di bawah 40% perkiraan. Flag Perlu Ditinjau ditetapkan. Petugas harus meninjau sebelum dapat diselesaikan.",
  };
}

/** Label for the finalized agreement status, derived from delivery ratio. */
function finalStatusLabel(flag: ReturnType<typeof classifyFlag>): string {
  if (flag === "None") return "Disetor penuh. Siap untuk pembayaran.";
  if (flag === "Warning")
    return "Setoran di bawah perkiraan. Perjanjian ditandai Perlu Ditinjau (Warning). Pembayaran tetap dapat diproses.";
  if (flag === "PartialDelivery")
    return "Setoran jauh di bawah perkiraan. Perjanjian ditandai Perlu Ditinjau. Petugas harus meninjau sebelum pembayaran.";
  return "Setoran sangat di bawah perkiraan. Perjanjian ditandai Perlu Ditinjau. Tinjauan segera diperlukan sebelum pembayaran.";
}

export default function SetorPage() {
  /* ── I18n ──────────────────────────────────────────────────────────────── */
  const { t } = useI18n();

  /* ── Live data ───────────────────────────────────────────────────────── */
  const { data, loading, error } = useApi(
    () => Promise.all([fetchAgreements(), fetchFarmers(), fetchDeliveries()]),
    [],
  );
  const agreements = data?.[0] ?? [];
  const fmap = farmerMap(data?.[1] ?? []);
  const allDeliveries = data?.[2] ?? [];

  /* ── Agreement selection ─────────────────────────────────────────────── */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* ── Form fields ─────────────────────────────────────────────────────── */
  const [volumeKg, setVolumeKg] = useState("");
  const [grade, setGrade] = useState<"A" | "B" | "C">("B");
  const [moisturePct, setMoisturePct] = useState("22");

  /* ── Finalize gate ───────────────────────────────────────────────────── */
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  /* ── Force majeure ───────────────────────────────────────────────────── */
  const [showFmConfirm, setShowFmConfirm] = useState(false);
  const [fmReason, setFmReason] = useState("");

  /* ── History panel ───────────────────────────────────────────────────── */
  const historyRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  /* ── TX hooks ────────────────────────────────────────────────────────── */
  const txDeliver = useTx(); // catat setoran -> record_delivery (coop-signed)
  // "Tandai Setoran Selesai" closes the harvest window. It has NO contract fn:
  // status/flag are auto-computed inside record_delivery via classify() on every
  // delivery, so finalize is a LOCAL coop-bookkeeping action, not a signed tx.
  const txFinalize = useMockTx();
  const txFm = useTx(); // force majeure -> mark_force_majeure (coop-signed)

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const eligibleAgreements = agreements.filter((a) => DEPOSIT_ELIGIBLE.includes(a.status));

  const selectItems: SearchSelectItem[] = eligibleAgreements.map((a) => {
    const farmer = fmap.get(a.farmerId);
    const deliveredKg = Number(a.deliveredVolG / 1000n);
    const remainKg = a.expectedVolKg - deliveredKg;
    return {
      id: a.id,
      label: a.farmerName,
      sublabel: `Perjanjian #${a.onchainId}, sisa perkiraan ${remainKg.toLocaleString("id-ID")} kg`,
      keywords: `${a.commodityCode} ${farmer?.kecamatan ?? ""}`,
    };
  });

  const agreement = agreements.find((a) => a.id === selectedId) ?? null;
  const farmer = agreement ? (fmap.get(agreement.farmerId) ?? null) : null;

  const existingDeliveries = agreement
    ? allDeliveries.filter((d) => d.agreementId === agreement.id)
    : [];
  const deliveredSoFarKg = agreement ? Number(agreement.deliveredVolG / 1000n) : 0;
  const inputKgNum = Number.parseFloat(volumeKg) || 0;
  const totalDeliveredKg = deliveredSoFarKg + inputKgNum;
  const ratio = agreement && inputKgNum > 0 ? totalDeliveredKg / agreement.expectedVolKg : -1;
  const flagResult = agreement && inputKgNum > 0 ? classifyFlag(ratio) : null;
  const { tone: flagTone, label: flagLabel, detail: flagDetail } = flagMeta(flagResult);

  const seqNum = existingDeliveries.length + 1;

  /* ── UI control helpers ──────────────────────────────────────────────── */
  const formLocked = txDeliver.state === "success" || txFm.state === "success";
  const canDeliver =
    !!agreement && inputKgNum > 0 && txDeliver.state === "idle" && txFm.state !== "success";
  const canFinalize = txDeliver.state === "success" && txFinalize.state === "idle";
  const showPostDeliverOptions = txDeliver.state === "success" && txFm.state !== "success";
  const showFinalizeSuccess = txFinalize.state === "success";

  /* Finalized ratio for the result banner. Uses the inputKgNum from the last
     delivery the officer recorded (it freezes at the finalize moment). */
  const finalizedRatio =
    agreement && inputKgNum > 0
      ? (deliveredSoFarKg + inputKgNum) / agreement.expectedVolKg
      : deliveredSoFarKg > 0 && agreement
        ? deliveredSoFarKg / agreement.expectedVolKg
        : 0;
  const finalFlag = classifyFlag(finalizedRatio);

  function handleSelectAgreement(id: string) {
    setSelectedId(id);
    setVolumeKg("");
    setGrade("B");
    setMoisturePct("22");
    setShowFmConfirm(false);
    setFmReason("");
    setShowFinalizeConfirm(false);
    txDeliver.reset();
    txFinalize.reset();
    txFm.reset();
  }

  function handleSetorLagi() {
    setVolumeKg("");
    setGrade("B");
    setMoisturePct("22");
    setShowFinalizeConfirm(false);
    txDeliver.reset();
  }

  function handleToggleHistory() {
    setShowHistory((v) => !v);
    if (!showHistory) {
      setTimeout(
        () =>
          historyRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        50,
      );
    }
  }

  /* ── JSX ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.kmp.setor.title")}
        description={t("page.kmp.setor.desc")}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<History size={15} />}
            onClick={handleToggleHistory}
          >
            {t("page.kmp.setor.history")}
          </Button>
        }
      />

      {loading && (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      )}
      {error && (
        <Alert tone="warning" title={t("common.error")}>
          {error}
        </Alert>
      )}

      {/* Step 1: Pilih perjanjian */}
      <Card>
        <CardHeader
          title={t("page.kmp.setor.form.title")}
          description={t("page.kmp.setor.form.title")}
          action={<Wheat size={18} className="text-verdant-400" />}
        />
        <CardContent>
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            htmlFor="setor-agreement-select"
          >
            {t("page.kmp.setor.form.agreement")}
          </label>
          <SearchSelect
            items={selectItems}
            value={selectedId}
            onChange={handleSelectAgreement}
            placeholder={t("page.kmp.setor.form.title")}
            searchPlaceholder="Cari nama petani, komoditas, atau kecamatan..."
          />

          {/* Selected agreement strip */}
          {agreement && farmer && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface-muted/60 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{farmer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {agreement.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan"},{" "}
                    Perjanjian #{String(agreement.onchainId)}, perkiraan{" "}
                    {agreement.expectedVolKg.toLocaleString("id-ID")} kg
                  </p>
                </div>
                <StatusBadge status={agreement.status} />
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">Setoran ke</p>
                  <p className="text-lg font-bold tabular-nums text-foreground">{seqNum}</p>
                </div>
              </div>
              <ProgressBar
                value={deliveredSoFarKg}
                max={agreement.expectedVolKg}
                label={`Sudah disetor ${deliveredSoFarKg.toLocaleString("id-ID")} kg dari ${agreement.expectedVolKg.toLocaleString("id-ID")} kg perkiraan`}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Pengukuran Aktual */}
      {agreement && !showFinalizeSuccess && (
        <Card>
          <CardHeader
            title={t("page.kmp.setor.form.grade")}
            description={t("page.kmp.setor.desc")}
            action={<Scale size={18} className="text-verdant-400" />}
          />
          <CardContent>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Input
                label={t("page.kmp.setor.form.volume")}
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
                  {t("page.kmp.setor.form.grade")}
                </label>
                <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-ring">
                  <select
                    id="select-grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as "A" | "B" | "C")}
                    disabled={formLocked}
                    className="h-full w-full bg-transparent text-sm text-foreground outline-none disabled:opacity-50"
                  >
                    <option value="A">{t("page.kmp.setor.form.grade.A")}</option>
                    <option value="B">{t("page.kmp.setor.form.grade.B")}</option>
                    <option value="C">{t("page.kmp.setor.form.grade.C")}</option>
                  </select>
                </div>
              </div>

              <Input
                label={t("page.kmp.setor.form.moisture")}
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

      {/* Live flag preview */}
      {flagResult !== null && inputKgNum > 0 && agreement && !showFinalizeSuccess && (
        <Card>
          <CardHeader
            title={t("page.kmp.setor.forceMajeure")}
            description="Berdasarkan rasio total setoran terhadap perkiraan. Flag hanya indikator, bukan keputusan final."
            action={<AlertTriangle size={18} className="text-amber-400" />}
          />
          <CardContent className="space-y-4">
            <Alert tone={flagTone} title={flagLabel}>
              {flagDetail}
              <span className="mt-1 block tabular-nums text-xs">
                Total disetor: {totalDeliveredKg.toLocaleString("id-ID")} kg dari{" "}
                {agreement.expectedVolKg.toLocaleString("id-ID")} kg perkiraan (
                {Math.round(ratio * 100)}%)
              </span>
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
              tone={ratio >= 0.98 ? "verdant" : "aqua"}
            />
          </CardContent>
        </Card>
      )}

      {/* Actions: Catat Setoran + post-deliver options + Force Majeure */}
      {agreement && !showFinalizeSuccess && (
        <Card>
          <CardHeader
            title={t("page.kmp.setor.form.title")}
            description="Setiap tindakan memerlukan tanda tangan dompet Freighter dan tercatat di Stellar."
          />
          <CardContent className="space-y-4">
            {/* Catat Setoran — only shown when not yet submitted */}
            {txDeliver.state !== "success" && (
              <div className="space-y-3">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Wheat size={16} />}
                  disabled={!canDeliver || txDeliver.state !== "idle"}
                  onClick={() => {
                    if (!agreement) return;
                    const volG = BigInt(Math.round(inputKgNum * 1000));
                    txDeliver.run((coop) =>
                      recordDelivery(coop, agreement.onchainId, volG, grade),
                    );
                  }}
                  className="w-full sm:w-auto"
                >
                  {txDeliver.state === "signing"
                    ? "Menandatangani..."
                    : txDeliver.state === "submitting"
                      ? "Mengirim ke Stellar..."
                      : t("page.kmp.setor.form.submit")}
                </Button>
                {txDeliver.state === "signing" && (
                  <p className="text-xs text-muted-foreground">
                    {t("page.kmp.permintaanDana.signHint")}
                  </p>
                )}
                {txDeliver.state === "submitting" && (
                  <p className="text-xs text-muted-foreground">
                    Menunggu konfirmasi Stellar. Proses 5 hingga 10 detik.
                  </p>
                )}
                {txDeliver.error && (
                  <Alert tone="warning" title={t("common.error")}>
                    {txDeliver.error}
                  </Alert>
                )}
                {!canDeliver && txDeliver.state === "idle" && (
                  <p className="text-xs text-muted-foreground">
                    Pilih perjanjian dan masukkan volume setoran untuk melanjutkan.
                  </p>
                )}
              </div>
            )}

            {/* Deliver success banner */}
            {txDeliver.state === "success" && txDeliver.txHash && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-verdant-200 bg-verdant-50 px-4 py-3">
                <CheckCircle2 size={18} className="text-verdant-700" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-verdant-700">
                    {t("page.kmp.setor.form.success")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bukti setoran tersimpan permanen di Stellar testnet.
                  </p>
                </div>
                <TxHashLink hash={txDeliver.txHash} />
              </div>
            )}

            {/* Two next-step paths after deliver success */}
            {showPostDeliverOptions && (
              <div className="space-y-4 border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">
                  Setoran tercatat. Pilih langkah berikutnya:
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Path A: Setor Lagi */}
                  <div className="rounded-lg border border-border p-4">
                    <p className="mb-1 text-sm font-semibold text-foreground">Setor Lagi</p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Petani masih akan menyetor lagi. Reset form untuk setoran berikutnya.
                    </p>
                    <Button variant="outline" size="sm" onClick={handleSetorLagi}>
                      Setor Lagi
                    </Button>
                  </div>

                  {/* Path B: Tandai Setoran Selesai */}
                  <div className="rounded-lg border border-border p-4">
                    <p className="mb-1 text-sm font-semibold text-foreground">
                      Tandai Setoran Selesai
                    </p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Tutup jendela panen. Total aktual dikunci, flag final dihitung, perjanjian
                      siap pembayaran.
                    </p>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => setShowFinalizeConfirm(true)}
                      disabled={showFinalizeConfirm}
                    >
                      Tandai Selesai
                    </Button>
                  </div>
                </div>

                {/* Finalize confirm panel */}
                {showFinalizeConfirm && txFinalize.state !== "success" && (
                  <div className="rounded-lg border border-aqua-200 bg-aqua-50/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-aqua-800">Konfirmasi Akhiri Jendela Panen</p>
                      <button
                        type="button"
                        onClick={() => setShowFinalizeConfirm(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <Alert tone="info">
                      Tindakan ini menutup jendela panen. Total setoran aktual dikunci di
                      blockchain. Jika setoran di bawah 98% perkiraan, perjanjian otomatis ditandai
                      Perlu Ditinjau. Ini hanya indikator, bukan keputusan final. Petugas yang
                      memutuskan.
                    </Alert>
                    <div className="flex gap-2">
                      <Button
                        variant="accent"
                        size="sm"
                        disabled={!canFinalize}
                        onClick={txFinalize.run}
                      >
                        {txFinalize.state === "signing"
                          ? "Menandatangani..."
                          : txFinalize.state === "submitting"
                            ? "Mengunci di Stellar..."
                            : "Konfirmasi Selesai"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFinalizeConfirm(false)}
                      >
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Force Majeure — quiet alternative path, only when form is idle */}
            {txDeliver.state === "idle" && txFm.state !== "success" && (
              <div className="border-t border-border pt-4">
                {!showFmConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowFmConfirm(true)}
                    className="flex items-center gap-1.5 text-sm text-red-600 hover:underline focus:outline-none"
                  >
                    <CloudRain size={14} />
                    {t("page.kmp.setor.forceMajeure")}
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
                        {t("page.kmp.setor.forceMajeure.reason")}
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
                        onClick={() => {
                          if (!agreement) return;
                          txFm.run((coop) =>
                            markForceMajeure(coop, agreement.onchainId, toReasonSymbol(fmReason)),
                          );
                        }}
                      >
                        {txFm.state === "signing"
                          ? "Menandatangani..."
                          : txFm.state === "submitting"
                            ? "Mengirim..."
                            : t("page.kmp.setor.forceMajeure.submit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowFmConfirm(false);
                          setFmReason("");
                        }}
                      >
                        {t("common.cancel")}
                      </Button>
                    </div>
                    {txFm.error && (
                      <Alert tone="warning" title={t("common.error")}>
                        {txFm.error}
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Finalize success panel */}
      {showFinalizeSuccess && txFinalize.txHash && txDeliver.txHash && agreement && (
        <div className="rounded-xl border-2 border-aqua-200 bg-aqua-50/70 p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-aqua-100">
                <CheckCircle2 size={28} className="text-aqua-700" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground">{t("page.kmp.setor.alert.finalized")}</h3>
                <p className="text-sm text-muted-foreground">
                  Total setoran aktual dikunci di Stellar. Status perjanjian diperbarui.
                </p>
              </div>
            </div>
            <TxHashLink hash={txFinalize.txHash} />
          </div>

          <Alert
            tone={finalFlag === "None" ? "success" : "warning"}
            title={finalFlag === "None" ? "Perjanjian Disetor Penuh" : "Perjanjian Perlu Ditinjau"}
          >
            {finalStatusLabel(finalFlag)}
            <span className="mt-1 block tabular-nums text-xs">
              Total aktual: {(deliveredSoFarKg + inputKgNum).toLocaleString("id-ID")} kg dari{" "}
              {agreement.expectedVolKg.toLocaleString("id-ID")} kg perkiraan (
              {Math.round(finalizedRatio * 100)}%)
            </span>
          </Alert>

          <div className="flex flex-wrap gap-3">
            <Link href="/kmp/pembayaran">
              <Button variant="accent" size="md" rightIcon={<ArrowRight size={16} />}>
                {t("page.kmp.pembayaran.settle")}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setSelectedId(null);
                setVolumeKg("");
                setGrade("B");
                setMoisturePct("22");
                setShowFinalizeConfirm(false);
                setShowFmConfirm(false);
                setFmReason("");
                txDeliver.reset();
                txFinalize.reset();
                txFm.reset();
              }}
            >
              Setoran Petani Lain
            </Button>
          </div>
        </div>
      )}

      {/* Force majeure success panel */}
      {txFm.state === "success" && txFm.txHash && (
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

      {/* Riwayat Setoran panel */}
      {showHistory && (
        <div ref={historyRef}>
          <Card>
            <CardHeader
              title={t("page.kmp.setor.history")}
              description="Semua setoran panen yang telah dicatat. Cari berdasarkan nama petani atau nomor perjanjian."
              action={<History size={18} className="text-verdant-400" />}
            />
            <CardContent>
              <DepositHistoryTable />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Always-visible riwayat shortcut if collapsed */}
      {!showHistory && (
        <div ref={historyRef} className="text-center">
          <button
            type="button"
            onClick={handleToggleHistory}
            className="text-sm text-accent hover:underline"
          >
            {t("page.kmp.setor.history")}
          </button>
        </div>
      )}
    </div>
  );
}
