"use client";

/**
 * Screen: Funding Request Detail.
 * Shows full header (all amounts, coverage, risk, status timeline) + backing
 * agreements table (lines): perjanjian #onchainId, farmerName, commodityCode,
 * agreement status, backingValue.
 */

import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { fetchFinancierDetail, type FundingStatus, type RiskBadge as RiskBadgeType } from "@/lib/api";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useApi } from "@/lib/use-api";
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  RupiahAmount,
  StatusBadge,
} from "@annona/ui";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_ORDER: FundingStatus[] = [
  "Requested",
  "Approved",
  "Disbursed",
  "Reconciled",
];

const STATUS_LABEL_KEYS: Record<FundingStatus, string> = {
  Requested: "page.financier.detail.header.requested",
  Approved: "page.financier.detail.header.approved",
  Rejected: "badge.funding.Rejected",
  Disbursed: "page.financier.detail.header.disbursed",
  Reconciled: "page.financier.detail.header.reconciled",
};

const FUNDING_BADGE_STYLES: Record<FundingStatus, string> = {
  Requested: "bg-gray-100 text-gray-600 border-gray-200",
  Approved: "bg-amber-50 text-amber-700 border-amber-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  Disbursed: "bg-blue-50 text-blue-700 border-blue-200",
  Reconciled: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function FundingStatusBadge({ status, t }: { status: FundingStatus; t: (key: string) => string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-sm font-semibold ${FUNDING_BADGE_STYLES[status]}`}>
      {t(STATUS_LABEL_KEYS[status])}
    </span>
  );
}

function RiskPill({ badge, t }: { badge: RiskBadgeType; t: (key: string, params?: Record<string, string | number>) => string }) {
  const cls =
    badge === "Rendah"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : badge === "Sedang"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {t("page.financier.portofolio.badge.risiko", { level: badge })}
    </span>
  );
}

function StatusTimeline({
  current,
  rejected,
  t,
}: {
  current: FundingStatus;
  rejected: boolean;
  t: (key: string) => string;
}) {
  const steps = rejected ? ["Requested", "Rejected"] : STATUS_ORDER;
  const currentIdx = steps.indexOf(current);

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const isLast = i === steps.length - 1;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 bg-white text-gray-300",
                ].join(" ")}
              >
                {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              </div>
              <span
                className={[
                  "text-[10px] font-semibold whitespace-nowrap",
                  done
                    ? "text-emerald-600"
                    : active
                      ? "text-amber-700"
                      : "text-gray-300",
                ].join(" ")}
              >
                {t(STATUS_LABEL_KEYS[step as FundingStatus])}
              </span>
            </div>
            {!isLast && (
              <div
                className={[
                  "h-0.5 w-12 sm:w-20 mx-1 -mt-5",
                  i < currentIdx ? "bg-emerald-400" : "bg-gray-200",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FundingDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();

  const { data, loading, error } = useApi(
    () => fetchFinancierDetail(id),
    [id],
  );

  const req = data?.request;
  const lines = data?.lines ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/financier/portofolio"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-amber-700"
        >
          <ArrowLeft size={14} />
          {t("page.financier.portofolio.title")}
        </Link>
      </div>

      <PageHeader
        title={req ? req.coopName : t("page.financier.detail.title")}
        description={req ? `Permohonan dana offtake, ${t("badge.funding.Requested").toLowerCase()} ${req.createdAt.slice(0, 10)}` : t("common.loading")}
      />

      {error && (
        <Alert tone="warning" title={t("common.error")}>
          {error}
        </Alert>
      )}

      {loading && (
        <p className="py-8 text-center text-sm text-gray-400">{t("common.loading")}</p>
      )}

      {req && (
        <>
          {/* Status timeline */}
          <Card className="rounded-2xl border-gray-100 bg-white shadow-sm overflow-x-auto">
            <CardHeader title={t("page.financier.detail.timeline")} />
            <CardContent>
              <div className="overflow-x-auto pb-2">
                <StatusTimeline
                  current={req.status}
                  rejected={req.status === "Rejected"}
                  t={t}
                />
              </div>
            </CardContent>
          </Card>

          {/* Amounts + risk */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-medium text-gray-500 mb-1">{t("common.status")}</p>
                <FundingStatusBadge status={req.status} t={t} />
                <p className="mt-3 text-xs font-medium text-gray-500 mb-1">Penilaian Risiko</p>
                <RiskPill badge={req.riskBadge} t={t} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
              <CardContent className="pt-5 pb-5 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">{t("page.financier.antrean.projected")}</p>
                  <RupiahAmount smallest={req.projectedSettlement} className="text-xl font-bold" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">{t("page.financier.antrean.coverage")}</p>
                  <p className="text-xl font-bold tabular-nums text-gray-900">
                    {(req.coverageRatioBps / 100).toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-gray-400">{t("page.financier.antrean.coverageHint")}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
              <CardContent className="pt-5 pb-5 space-y-2">
                {(
                  [
                    [t("page.financier.detail.header.requested"), req.amountRequested],
                    [t("page.financier.detail.header.approved"), req.amountApproved],
                    [t("page.financier.detail.header.disbursed"), req.amountDisbursed],
                    [t("page.financier.detail.header.reconciled"), req.amountReconciled],
                  ] as const
                ).map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <RupiahAmount smallest={val} className="text-sm font-semibold" />
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-2 mt-2">
                  <span className="font-semibold text-gray-700">{t("page.financier.ringkasan.outstanding")}</span>
                  <RupiahAmount
                    smallest={
                      req.amountDisbursed > req.amountReconciled
                        ? req.amountDisbursed - req.amountReconciled
                        : 0n
                    }
                    tone={req.amountDisbursed > req.amountReconciled ? "negative" : "muted"}
                    className="text-sm font-bold"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Proof hash */}
          <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
            <CardHeader
              title={t("page.financier.detail.proofTitle")}
              description="Hash yang mencerminkan saldo perjanjian offtake yang menjadi jaminan permohonan ini."
            />
            <CardContent>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                <FileText size={16} className="shrink-0 text-amber-600" />
                <p className="font-mono text-sm text-gray-800 break-all">{req.backingHash}</p>
              </div>
              {req.proofUrl && (
                <a
                  href={req.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:underline"
                >
                  Lihat dokumen bukti
                  <ArrowLeft size={13} className="rotate-180" />
                </a>
              )}
            </CardContent>
          </Card>

          {/* Backing lines */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {t("page.financier.detail.backingTitle")}
            </h2>
            <TableFrame>
              <Table>
                <THead>
                  <Th>{t("page.financier.detail.backing.col.agreement")}</Th>
                  <Th>{t("page.financier.detail.backing.col.farmer")}</Th>
                  <Th>{t("page.financier.detail.backing.col.commodity")}</Th>
                  <Th>{t("page.financier.detail.backing.col.status")}</Th>
                  <Th className="text-right">{t("page.financier.detail.backing.col.value")}</Th>
                </THead>
                <TBody>
                  {lines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-gray-400"
                      >
                        Tidak ada perjanjian tercatat sebagai jaminan.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line) => (
                      <Tr key={line.id}>
                        <Td>
                          <Link
                            href={`/kmp/perjanjian/${line.agreementId}`}
                            className="font-mono text-xs text-amber-700 hover:underline"
                          >
                            #{String(line.agreementOnchainId)}
                          </Link>
                        </Td>
                        <Td className="font-medium text-gray-900">{line.farmerName}</Td>
                        <Td className="text-gray-500">
                          {line.commodityCode === "GABAH" ? "Gabah Kering" : line.commodityCode}
                        </Td>
                        <Td>
                          <StatusBadge status={line.status as Parameters<typeof StatusBadge>[0]["status"]} />
                        </Td>
                        <Td className="text-right">
                          <RupiahAmount
                            smallest={line.backingValue}
                            className="text-sm font-semibold"
                          />
                        </Td>
                      </Tr>
                    ))
                  )}
                </TBody>
              </Table>
            </TableFrame>
          </div>

          {/* Financier info */}
          <p className="text-xs text-gray-400">
            {t("shell.financier.label")}: {req.financierName}.
            ID On-Chain: {req.onchainId || "Belum dikonfirmasi"}.
          </p>
        </>
      )}
    </div>
  );
}
