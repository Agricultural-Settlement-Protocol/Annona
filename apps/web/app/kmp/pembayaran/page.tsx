"use client";

/**
 * Screen: Pembayaran — settle harvest payments (three-way split).
 *
 * Flow: pilih perjanjian (dengan volume belum dibayar) -> preview split ->
 * selesaikan pembayaran (gradient, THE ONE use across all three settlement
 * pages) -> lunas panel -> link to /kmp/residu.
 *
 * Staged settlement: deliveredVolG - settledVolG may be a partial batch.
 * Debt nets first. No autonomous payment claim: chain records the split;
 * cash moves via kas koperasi / BRILink.
 */

import { fetchAgreements, fetchFarmers, farmerMap } from "@/lib/api";
import { PageHeader } from "@/components/kmp/page-header";
import { PaymentHistoryTable } from "@/components/kmp/payment-history-table";
import { SearchSelect } from "@/components/kmp/search-select";
import type { SearchSelectItem } from "@/components/kmp/search-select";
import { useTx } from "@/components/kmp/use-tx";
import { settle } from "@/lib/invocations";
import { useApi } from "@/lib/use-api";
import { formatKg } from "@/lib/mock-data";
import { computeSplitSettlement, formatRupiah, gramsToKg } from "@annona/core";
import type { Status } from "@annona/core";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  RupiahAmount,
  SplitSettlementCard,
  StatusBadge,
  TxHashLink,
} from "@annona/ui";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  History,
  Landmark,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useRef, useState } from "react";

/** Statuses that can appear in the payment picker. Flagged included but
 *  disabled (needs review before settlement). */
const PAYABLE_STATUSES: Status[] = [
  "Delivered",
  "PartiallyDelivered",
  "Flagged",
];

export default function PembayaranPage() {
  /* ── I18n ──────────────────────────────────────────────────────────────── */
  const { t } = useI18n();

  /* ── Live data ───────────────────────────────────────────────────────── */
  const { data, loading, error } = useApi(
    () => Promise.all([fetchAgreements(), fetchFarmers()]),
    [],
  );
  const agreements = data?.[0] ?? [];
  const fmap = farmerMap(data?.[1] ?? []);

  /* ── Agreement selection ─────────────────────────────────────────────── */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* ── History panel ───────────────────────────────────────────────────── */
  const historyRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  /* ── TX hook — gradient button: the ONE allowed use across setor trio ── */
  const txSettle = useTx();

  // settle(caller, id): the coop signs; the contract applies the §5 three-way
  // split, nets debt, and pays only net_to_farmer.
  function handleSettle() {
    if (!agreement) return;
    txSettle.run((coop) => settle(coop, agreement.onchainId));
  }

  /* ── Derived ─────────────────────────────────────────────────────────── */

  // Agreements that have unsettled delivered volume.
  const payableAgreements = agreements.filter((a) => {
    const hasUnsettled = a.deliveredVolG > a.settledVolG;
    return hasUnsettled && PAYABLE_STATUSES.includes(a.status);
  });

  const selectItems: SearchSelectItem[] = payableAgreements.map((a) => {
    const farmer = fmap.get(a.farmerId);
    const unsettledKg = gramsToKg(a.deliveredVolG - a.settledVolG);
    const isDisabled = a.status === "Flagged";
    return {
      id: a.id,
      label: a.farmerName,
      sublabel: `Perjanjian #${a.onchainId}, ${formatKg(unsettledKg)} belum dibayar`,
      keywords: `${a.commodityCode} ${farmer?.kecamatan ?? ""}`,
      disabled: isDisabled,
      disabledReason: isDisabled ? "Perlu peninjauan" : undefined,
    };
  });

  const agreement = agreements.find((a) => a.id === selectedId) ?? null;
  const farmer = agreement ? (fmap.get(agreement.farmerId) ?? null) : null;

  // Staged: pay for exactly the volume that has been delivered but not yet settled.
  const split = agreement
    ? computeSplitSettlement({
        deliveredVolG: agreement.deliveredVolG,
        settledVolG: agreement.settledVolG,
        hppPerKg: agreement.hppPerKg,
        remainingDebt: agreement.remainingDebt,
        hppHandlingFeeBps: agreement.hppHandlingFeeBps,
        basePriceSupplier: agreement.basePriceSupplier,
        inputDebt: agreement.inputDebt,
      })
    : null;

  const unsettledKg = agreement
    ? gramsToKg(agreement.deliveredVolG - agreement.settledVolG)
    : 0;

  const isStaged = agreement?.status === "PartiallyDelivered";

  function handleSelectAgreement(id: string) {
    setSelectedId(id);
    txSettle.reset();
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

  const canSettle = !!agreement && txSettle.state === "idle" && split !== null;
  const showLunas = txSettle.state === "success" && txSettle.txHash;

  /* ── JSX ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.kmp.pembayaran.title")}
        description={t("page.kmp.pembayaran.desc")}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<History size={15} />}
            onClick={handleToggleHistory}
          >
            {t("page.kmp.pembayaran.history")}
          </Button>
        }
      />

      {loading && (
        <p className="text-sm text-muted-foreground">
          {t("common.loading")}
        </p>
      )}
      {error && (
        <Alert tone="warning" title={t("common.error")}>
          {error}
        </Alert>
      )}

      {/* Step 1: Pilih perjanjian */}
      <Card>
        <CardHeader
          title={t("page.kmp.pembayaran.selectAgreement")}
          description={t("page.kmp.pembayaran.desc")}
          action={<Banknote size={18} className="text-aqua-400" />}
        />
        <CardContent>
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            htmlFor="payment-agreement-select"
          >
            {t("page.kmp.pembayaran.payable")}
          </label>
          <SearchSelect
            items={selectItems}
            value={selectedId}
            onChange={handleSelectAgreement}
            placeholder={t("page.kmp.pembayaran.selectAgreement")}
            searchPlaceholder="Cari nama petani, komoditas, atau kecamatan..."
            emptyText={t("page.kmp.pembayaran.payable")}
          />

          {/* Selected agreement quick info */}
          {agreement && farmer && (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface-muted/60 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {farmer.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {agreement.commodityCode === "GABAH"
                    ? "Gabah Kering Panen"
                    : "Jagung Pipilan"}
                  , Perjanjian #{String(agreement.onchainId)}
                </p>
              </div>
              <StatusBadge status={agreement.status} />
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Volume dibayar</p>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {formatKg(unsettledKg)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Split preview */}
      {split && agreement && !showLunas && (
        <Card>
          <CardHeader
            title={t("page.kmp.pembayaran.splitTitle")}
            description={`HPP ${formatRupiah(agreement.hppPerKg)}/kg, ${formatKg(unsettledKg)} volume. Formula transparan, sumber Inpres HPP.`}
            action={<Banknote size={18} className="text-aqua-400" />}
          />
          <CardContent className="space-y-4">
            {isStaged && (
              <Alert tone="info">
                Ini adalah pembayaran bertahap. Petani telah menyetor{" "}
                {formatKg(unsettledKg)} sejauh ini. Pembayaran dapat dilakukan
                sebelum seluruh volume disetor. Utang dicicil terlebih dulu dari
                setiap tahap.
              </Alert>
            )}

            <SplitSettlementCard
              gross={split.grossSmallest}
              handlingCut={split.handlingCut}
              netToFarmer={split.netToFarmer}
              residuPrincipal={split.principalToSupplier}
              coopMargin={split.coopMargin}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Utang tersisa sebelum bayar
                </span>
                <RupiahAmount
                  smallest={agreement.remainingDebt}
                  className="text-sm"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Utang dicicil kali ini
                </span>
                <RupiahAmount smallest={split.debtPaid} className="text-sm" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Ini adalah prakiraan. Jumlah final dikunci saat transaksi on-chain
              selesai. Kas keluar via BRILink atau BRI, bukan langsung dari
              kontrak.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm action — gradient button, the ONE allowed use */}
      {agreement && split && !showLunas && (
        <Card>
          <CardHeader
            title={t("page.kmp.pembayaran.settle")}
            description={t("page.kmp.pembayaran.confirm.desc")}
          />
          <CardContent className="space-y-3">
            <Button
              variant="gradient"
              size="md"
              leftIcon={<Banknote size={16} />}
              disabled={!canSettle}
              onClick={handleSettle}
              className="w-full sm:w-auto"
            >
              {txSettle.state === "signing"
                ? "Menandatangani..."
                : txSettle.state === "submitting"
                  ? "Mencatat di Stellar..."
                  : t("page.kmp.pembayaran.settle")}
            </Button>
            {txSettle.state === "signing" && (
              <p className="text-xs text-muted-foreground">
                {t("page.kmp.permintaanDana.signHint")}
              </p>
            )}
            {txSettle.state === "submitting" && (
              <p className="text-xs text-muted-foreground">
                Mencatat split tiga arah di blockchain. Proses 5 hingga 10
                detik.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lunas panel */}
      {showLunas && txSettle.txHash && split && agreement && farmer && (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/80 p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {t("page.kmp.pembayaran.success")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("page.kmp.pembayaran.splitTitle")}
                </p>
              </div>
            </div>
            <TxHashLink hash={txSettle.txHash} />
          </div>

          {/* Final split */}
          <SplitSettlementCard
            gross={split.grossSmallest}
            handlingCut={split.handlingCut}
            netToFarmer={split.netToFarmer}
            residuPrincipal={split.principalToSupplier}
            coopMargin={split.coopMargin}
          />

          {/* Bank ref note */}
          <div className="rounded-lg border border-border bg-surface px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              Referensi kas / BRILink
            </p>
            <p className="mt-0.5 font-mono text-sm text-foreground">
              BRILink-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}-
              {String(agreement.onchainId).padStart(4, "0")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Catat referensi ini di buku kas koperasi untuk rekonsiliasi.
            </p>
          </div>

          {/* Residu reminder */}
          <Alert tone="warning" title="Residu pokok Supplier terkunci di kas">
            Sebesar{" "}
            <RupiahAmount
              smallest={split.principalToSupplier}
              className="text-sm"
            />{" "}
            adalah uang Supplier yang tersimpan sementara di kas koperasi. Segera
            remitkan ke rekening Supplier.
          </Alert>

          <div className="flex flex-wrap gap-3">
            <Link href="/kmp/residu">
              <Button
                variant="accent"
                size="md"
                leftIcon={<Landmark size={16} />}
                rightIcon={<ArrowRight size={16} />}
              >
                {t("page.kmp.residu.reconcile.submit")}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setSelectedId(null);
                txSettle.reset();
              }}
            >
              Bayar Perjanjian Lain
            </Button>
          </div>
        </div>
      )}

      {/* Riwayat Pembayaran panel */}
      {showHistory && (
        <div ref={historyRef}>
          <Card>
            <CardHeader
              title={t("page.kmp.pembayaran.history")}
              description="Semua pembayaran panen yang telah diselesaikan. Cari berdasarkan nama petani atau nomor perjanjian."
              action={<History size={18} className="text-aqua-400" />}
            />
            <CardContent>
              <PaymentHistoryTable />
            </CardContent>
          </Card>
        </div>
      )}

      {!showHistory && (
        <div ref={historyRef} className="text-center">
          <button
            type="button"
            onClick={handleToggleHistory}
            className="text-sm text-accent hover:underline"
          >
            {t("page.kmp.pembayaran.history")}
          </button>
        </div>
      )}
    </div>
  );
}
