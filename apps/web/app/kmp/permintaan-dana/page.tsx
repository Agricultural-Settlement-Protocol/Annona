"use client";

/**
 * Screen: Permintaan Dana Offtake (KMP side).
 * KMP uses this to request working-capital financing from a Pemodal (financier),
 * backed by the collective projected settlement value of selected offtake
 * agreements.
 *
 * LEFT/TOP: agreement multi-selector + running total + financier picker +
 * "Ajukan Dana" button (useTx demo-mode -> maps to request_funding fn, not yet
 * built on-chain; TODO: wire real Invocation when deployed).
 *
 * RIGHT/BOTTOM: "Riwayat Permintaan Dana" - searchable history from /financier
 * (all requests; in the single-coop demo these are this coop's requests).
 * Columns link to detail or perjanjian detail.
 */

import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { ScrollArea } from "@/components/scroll-area";
import { useTx } from "@/components/kmp/use-tx";
import { sha256Hex } from "@/lib/hash";
import { requestFunding } from "@/lib/invocations";
import type { Invocation } from "@/lib/tx";
import {
  annotateFunding,
  fetchAgreements,
  fetchFinancierAll,
  fetchFinancierOverview,
  type ApiAgreement,
  type ApiFundingRequestRow,
  type FundingStatus,
  type RiskBadge,
} from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { useApi } from "@/lib/use-api";
import {
  FUNDING_BACKABLE_STATUSES,
  FUNDING_OPEN_STATUSES,
  formatRupiah,
} from "@annona/core";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  RupiahAmount,
  TxHashLink,
} from "@annona/ui";
import {
  CheckCheck,
  CheckCircle2,
  Coins,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useEffect, useMemo, useRef, useState } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Statuses where an agreement has projected future value to back financing
 *  (SHARED core set). */
const BACKABLE_STATUSES = FUNDING_BACKABLE_STATUSES;

/** Estimated backing value (in smallest units) for the *remaining* harvest of one
 *  agreement = remaining_kg * hppPerKg.
 *  hppPerKg is already per-kg in smallest units, so kg * hppPerKg = smallest total.
 *  remaining_kg = (expectedVolG - deliveredVolG) / 1000 (volume stored in grams). */
function estimateBacking(a: ApiAgreement): bigint {
  const grams = a.expectedVolG > a.deliveredVolG ? a.expectedVolG - a.deliveredVolG : 0n;
  if (grams === 0n || a.hppPerKg === 0n) return 0n;
  // (grams / 1000) kg * hppPerKg (smallest/kg) = grams * hppPerKg / 1000
  return (grams * a.hppPerKg) / 1000n;
}

function riskBadgeClass(badge: RiskBadge): string {
  if (badge === "Rendah") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (badge === "Sedang") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function FundingStatusBadge({ status }: { status: FundingStatus }) {
  const { t } = useI18n();
  const map: Record<FundingStatus, { cls: string; label: string }> = {
    Requested: { cls: "bg-gray-100 text-gray-600 border-gray-200", label: t("badge.funding.Requested") },
    Approved: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: t("badge.funding.Approved") },
    Rejected: { cls: "bg-red-50 text-red-700 border-red-200", label: t("badge.funding.Rejected") },
    Disbursed: { cls: "bg-blue-50 text-blue-700 border-blue-200", label: t("badge.funding.Disbursed") },
    Reconciled: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: t("badge.funding.Reconciled") },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function AgreementRow({
  agreement,
  selected,
  onToggle,
}: {
  agreement: ApiAgreement;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const backing = estimateBacking(agreement);
  const volKg = Number(agreement.expectedVolG / 1000n); // g -> kg

  return (
    <button
      type="button"
      onClick={() => onToggle(agreement.id)}
      className={[
        "w-full text-left flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
        selected
          ? "border-emerald-300 bg-emerald-50/60"
          : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/40",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors",
          selected ? "border-emerald-600 bg-emerald-600" : "border-gray-300",
        ].join(" ")}
      >
        {selected ? <CheckCircle2 size={14} className="text-white" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{agreement.farmerName}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          #{String(agreement.onchainId)}, {agreement.commodityCode},
          perkiraan {volKg.toLocaleString("id-ID")} kg
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-gray-400 font-medium">Est. nilai jaminan</p>
        <RupiahAmount smallest={backing} className="text-sm font-semibold" />
      </div>
    </button>
  );
}

function FundingHistoryTable({
  data,
  loading,
  error,
}: {
  data: ApiFundingRequestRow[] | undefined;
  loading: boolean;
  error: string | undefined;
}) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const all: ApiFundingRequestRow[] = data ?? [];
    const sorted = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (r) =>
        r.coopName.toLowerCase().includes(q) ||
        r.financierName.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <div className="space-y-4">
      <div className="flex h-12 items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Search size={14} className="shrink-0 text-gray-400" />
        <input
          type="search"
          placeholder="Cari koperasi, pemodal, atau status..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-full w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
      </div>

      {loading && (
        <p className="py-4 text-sm text-gray-400">Memuat riwayat...</p>
      )}
      {error && (
        <Alert tone="warning" title="Gagal memuat riwayat">
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <ScrollArea maxHeight={420} fade>
          <TableFrame>
            <Table>
              <THead>
                <Th>Perjanjian</Th>
                <Th>Pemodal</Th>
                <Th>Status</Th>
                <Th>Risiko</Th>
                <Th className="text-right">Diajukan</Th>
                <Th className="text-right">Disetujui</Th>
                <Th className="text-right">Dicairkan</Th>
                <Th className="text-right">Direkonsiliasi</Th>
                <Th>Coverage</Th>
                <Th>Tanggal</Th>
              </THead>
              <TBody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      Tidak ada riwayat permintaan dana.
                    </td>
                  </tr>
                ) : (
                  rows.map((req) => (
                    <Tr key={req.id}>
                      {/* Perjanjian column: direct deep-links to each backing
                          agreement's detail page (KMP context). */}
                      <Td>
                        {req.lines.length === 0 ? (
                          <span className="text-xs text-gray-400">Tanpa rincian</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {req.lines.map((line) => (
                              <Link
                                key={line.id}
                                href={`/kmp/perjanjian/${line.agreementId}`}
                                className="font-mono text-xs text-emerald-700 hover:underline"
                              >
                                #{String(line.agreementOnchainId)} {line.farmerName}
                              </Link>
                            ))}
                          </div>
                        )}
                      </Td>
                      <Td className="text-gray-700">{req.financierName}</Td>
                      <Td>
                        <FundingStatusBadge status={req.status} />
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskBadgeClass(req.riskBadge)}`}
                        >
                          {req.riskBadge}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <RupiahAmount smallest={req.amountRequested} className="text-sm" />
                      </Td>
                      <Td className="text-right">
                        <RupiahAmount smallest={req.amountApproved} className="text-sm" />
                      </Td>
                      <Td className="text-right">
                        <RupiahAmount smallest={req.amountDisbursed} className="text-sm" />
                      </Td>
                      <Td className="text-right">
                        <RupiahAmount smallest={req.amountReconciled} className="text-sm" />
                      </Td>
                      <Td className="tabular-nums text-gray-600 text-xs">
                        {(req.coverageRatioBps / 100).toFixed(1)}%
                      </Td>
                      <Td className="tabular-nums text-gray-500 text-xs">
                        {req.createdAt.slice(0, 10)}
                      </Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </TableFrame>
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PermintaanDanaPage() {
  /* ── I18n ──────────────────────────────────────────────────────────────── */
  const { t } = useI18n();

  /* ── Live data ─────────────────────────────────────────────────────────── */
  const { data: agreements, loading: agrLoading } = useApi(fetchAgreements);
  const { data: ovData, loading: ovLoading } = useApi(fetchFinancierOverview);
  const {
    data: fundingRows,
    loading: fundingLoading,
    error: fundingError,
    refetch: refetchFunding,
  } = useApi(fetchFinancierAll);

  /* ── Selection state ───────────────────────────────────────────────────── */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  /* ── TX hook for request_funding ──────────────────────────────────────── */
  const tx = useTx();
  const [submitted, setSubmitted] = useState(false);

  /* ── Derived ────────────────────────────────────────────────────────────── */
  // Agreements already backing an OPEN advance (Requested/Approved/Disbursed)
  // are consumed and leave the picker; they come back once the request is
  // Rejected or fully Reconciled.
  const consumedAgreementIds = useMemo(() => {
    const set = new Set<string>();
    for (const req of fundingRows ?? []) {
      if (!FUNDING_OPEN_STATUSES.includes(req.status)) continue;
      for (const line of req.lines) set.add(line.agreementId);
    }
    return set;
  }, [fundingRows]);

  const backableAgreements = useMemo(() => {
    const all = agreements ?? [];
    return all.filter(
      (a) => BACKABLE_STATUSES.includes(a.status) && !consumedAgreementIds.has(a.id),
    );
  }, [agreements, consumedAgreementIds]);

  const filteredAgreements = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return backableAgreements;
    return backableAgreements.filter(
      (a) =>
        a.farmerName.toLowerCase().includes(q) ||
        a.commodityCode.toLowerCase().includes(q) ||
        String(a.onchainId).includes(q),
    );
  }, [backableAgreements, search]);

  const selectedAgreements = useMemo(
    () => backableAgreements.filter((a) => selectedIds.has(a.id)),
    [backableAgreements, selectedIds],
  );

  const totalBacking = useMemo(
    () => selectedAgreements.reduce((acc, a) => acc + estimateBacking(a), 0n),
    [selectedAgreements],
  );

  const financierName = ovData?.financier.name ?? "LPDB Koperasi";

  function toggleAgreement(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (submitted) setSubmitted(false);
    tx.reset();
  }

  /** Ids captured at submit time, persisted as funding_request_line after the
   *  tx confirms (the chain only anchors backing_hash). */
  const pendingBackingIds = useRef<string[]>([]);
  const annotatedTx = useRef<string | null>(null);

  async function handleAjukan() {
    if (selectedIds.size === 0 || tx.state !== "idle") return;
    if (!ovData) return;
    const ids = [...selectedIds].sort();
    pendingBackingIds.current = ids;
    const backingHash = await sha256Hex(ids.join(":"));
    const projectedSettlement = totalBacking;
    const amountRequested = totalBacking; // full backing value as amount (simplified)
    tx.run((coop) =>
      requestFunding({
        coop,
        financier: ovData.financier.walletAddress,
        backingHash,
        projectedSettlement,
        amountRequested,
      }),
    );
  }

  // After the tx confirms: persist the backing lines, then refresh the history
  // (the picker exclusion + riwayat links depend on them).
  useEffect(() => {
    if (tx.state !== "success" || !tx.txHash) return;
    setSubmitted(true);
    if (annotatedTx.current === tx.txHash || pendingBackingIds.current.length === 0) return;
    annotatedTx.current = tx.txHash;
    const txHash = tx.txHash;
    const agreementIds = pendingBackingIds.current;
    (async () => {
      try {
        const {
          data: { session },
        } = await getSupabase().auth.getSession();
        if (!session) return;
        await annotateFunding({ txHash, agreementIds }, session.access_token);
      } catch {
        // Non-fatal: the request itself is on-chain; lines can be re-annotated.
      } finally {
        setSelectedIds(new Set());
        refetchFunding();
      }
    })();
  }, [tx.state, tx.txHash, refetchFunding]);

  const canSubmit = selectedIds.size > 0 && tx.state === "idle" && !submitted;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.kmp.permintaanDana.title")}
        description={t("page.kmp.permintaanDana.desc")}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── LEFT: Agreement selector ───────────────────────────────────── */}
        <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
            <CardHeader
              title={t("page.kmp.permintaanDana.selectTitle")}
              description={t("page.kmp.permintaanDana.selectDesc")}
              action={<Coins size={18} className="text-emerald-600" />}
            />
            <CardContent className="space-y-3">
              {/* Search within agreements */}
              <div className="flex h-11 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 focus-within:ring-2 focus-within:ring-ring">
                <Search size={13} className="shrink-0 text-gray-400" />
                <input
                  type="search"
                  placeholder={t("page.kmp.permintaanDana.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-full w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                />
              </div>

              {agrLoading && (
                <p className="py-4 text-center text-sm text-gray-400">
                  {t("common.loading")}
                </p>
              )}

              {!agrLoading && filteredAgreements.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">
                  {t("page.kmp.permintaanDana.empty")}
                </p>
              )}

              <ScrollArea maxHeight={320} fade>
                <div className="space-y-2 pr-1">
                  {filteredAgreements.map((a) => (
                    <AgreementRow
                      key={a.id}
                      agreement={a}
                      selected={selectedIds.has(a.id)}
                      onToggle={toggleAgreement}
                    />
                  ))}
                </div>
              </ScrollArea>

              {/* Quick select/deselect all */}
              {filteredAgreements.length > 0 && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds(new Set(filteredAgreements.map((a) => a.id)))
                    }
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <CheckCheck size={14} />
                    {t("common.all")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                    {t("common.delete")}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary + submit */}
          <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
            <CardHeader
              title={t("page.kmp.permintaanDana.summary")}
              description={`Pemodal: ${ovLoading ? "..." : financierName}`}
            />
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t("page.kmp.permintaanDana.selected")}</span>
                  <span className="font-semibold text-gray-900">{selectedIds.size}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t("page.kmp.permintaanDana.totalBacking")}</span>
                  <RupiahAmount smallest={totalBacking} className="text-sm font-bold text-emerald-700" />
                </div>
              </div>

              {selectedIds.size === 0 && (
                <p className="text-xs text-gray-400">
                  {t("page.kmp.permintaanDana.empty")}
                </p>
              )}

              {/* Success state */}
              {submitted && tx.txHash && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {t("page.kmp.permintaanDana.success")}
                    </p>
                  </div>
                  <TxHashLink hash={tx.txHash} />
                </div>
              )}

              <Button
                variant="primary"
                size="md"
                leftIcon={<Coins size={16} />}
                disabled={!canSubmit}
                onClick={handleAjukan}
                className="w-full rounded-xl bg-primary-dark hover:bg-opacity-95 text-white disabled:opacity-50"
              >
                {tx.state === "signing"
                  ? t("page.kmp.permintaanDana.signing")
                  : tx.state === "submitting"
                    ? t("page.kmp.permintaanDana.submitting")
                    : submitted
                      ? t("page.kmp.permintaanDana.submitted")
                      : t("page.kmp.permintaanDana.submit")}
              </Button>

              {tx.state === "signing" && (
                <p className="text-xs text-gray-400 text-center">
                  {t("page.kmp.permintaanDana.signHint")}
                </p>
              )}

              {tx.error && (
                <Alert tone="warning" title={t("common.error")}>
                  {tx.error}
                </Alert>
              )}

              <p className="text-[11px] text-gray-400 leading-relaxed">
                {t("page.kmp.permintaanDana.disclaimer")}
              </p>
            </CardContent>
          </Card>
      </div>

      {/* ── History table (full width, long table needs the room) ───────── */}
      <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
        <CardHeader
          title={t("page.kmp.permintaanDana.history")}
          description={t("page.kmp.permintaanDana.history.desc")}
        />
        <CardContent>
          <FundingHistoryTable data={fundingRows} loading={fundingLoading} error={fundingError} />
        </CardContent>
      </Card>
    </div>
  );
}
