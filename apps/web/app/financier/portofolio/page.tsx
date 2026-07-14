"use client";

/**
 * Screen: Portofolio Pemodal.
 * Shows Approved / Disbursed / Reconciled / Rejected requests.
 * Searchable + custom ScrollArea. Row links to detail.
 */

import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { ScrollArea } from "@/components/scroll-area";
import {
  fetchFinancierPortfolio,
  type ApiFundingRequestRow,
  type FundingStatus,
  type RiskBadge,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useApi } from "@/lib/use-api";
import { Alert, RupiahAmount } from "@annona/ui";
import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const STATUS_BADGE_STYLES: Record<FundingStatus, string> = {
  Requested: "bg-gray-100 text-gray-600 border-gray-200",
  Approved: "bg-amber-50 text-amber-700 border-amber-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  Disbursed: "bg-blue-50 text-blue-700 border-blue-200",
  Reconciled: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_BADGE_KEYS: Record<FundingStatus, string> = {
  Requested: "badge.funding.Requested",
  Approved: "badge.funding.Approved",
  Rejected: "badge.funding.Rejected",
  Disbursed: "badge.funding.Disbursed",
  Reconciled: "badge.funding.Reconciled",
};

function StatusBadge({ status, t }: { status: FundingStatus; t: (key: string) => string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE_STYLES[status]}`}>
      {t(STATUS_BADGE_KEYS[status])}
    </span>
  );
}

function RiskPill({ badge }: { badge: RiskBadge }) {
  const cls =
    badge === "Rendah"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : badge === "Sedang"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {badge}
    </span>
  );
}

function remainingAmt(req: ApiFundingRequestRow): bigint {
  return req.amountDisbursed > req.amountReconciled
    ? req.amountDisbursed - req.amountReconciled
    : 0n;
}

export default function PortofolioPage() {
  const { t } = useI18n();
  const { data, loading, error } = useApi(fetchFinancierPortfolio);
  const [query, setQuery] = useState("");

  const rows: ApiFundingRequestRow[] = data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.coopName.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.riskBadge.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.financier.portofolio.title")}
        description={t("page.financier.portofolio.desc")}
      />

      {error && (
        <Alert tone="warning" title={t("common.error")}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <div className="flex h-12 items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Search size={14} className="shrink-0 text-gray-400" />
        <input
          type="search"
          placeholder={t("page.financier.portofolio.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-full w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
      </div>

      {loading && (
        <p className="py-4 text-sm text-gray-400">{t("common.loading")}</p>
      )}

      {!loading && (
        <ScrollArea maxHeight={560} fade>
          <TableFrame>
            <Table>
              <THead>
                <Th>{t("page.financier.portofolio.table.col.coop")}</Th>
                <Th>{t("common.status")}</Th>
                <Th>{t("page.financier.portofolio.table.col.risk")}</Th>
                <Th className="text-right">{t("badge.funding.Requested")}</Th>
                <Th className="text-right">{t("badge.funding.Approved")}</Th>
                <Th className="text-right">{t("badge.funding.Disbursed")}</Th>
                <Th className="text-right">{t("badge.funding.Reconciled")}</Th>
                <Th className="text-right">Sisa</Th>
                <Th>{t("page.financier.portofolio.table.col.date")}</Th>
              </THead>
              <TBody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                      {t("page.financier.portofolio.table.empty")}
                    </td>
                  </tr>
                ) : (
                  filtered.map((req) => (
                    <Tr
                      key={req.id}
                      className="cursor-pointer"
                    >
                      <Td>
                        <Link
                          href={`/financier/${req.id}`}
                          className="font-medium text-gray-900 hover:text-amber-700"
                        >
                          {req.coopName}
                        </Link>
                      </Td>
                      <Td>
                        <StatusBadge status={req.status} t={t} />
                      </Td>
                      <Td>
                        <RiskPill badge={req.riskBadge} />
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
                      <Td className="text-right">
                        <RupiahAmount
                          smallest={remainingAmt(req)}
                          tone={remainingAmt(req) > 0n ? "negative" : "muted"}
                          className="text-sm"
                        />
                      </Td>
                      <Td className="tabular-nums text-gray-500">{req.createdAt.slice(0, 10)}</Td>
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
