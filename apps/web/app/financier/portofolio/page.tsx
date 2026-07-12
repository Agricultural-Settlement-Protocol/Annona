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
import { useApi } from "@/lib/use-api";
import { Alert, RupiahAmount } from "@annona/ui";
import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function StatusBadge({ status }: { status: FundingStatus }) {
  const map: Record<FundingStatus, { cls: string; label: string }> = {
    Requested: { cls: "bg-gray-100 text-gray-600 border-gray-200", label: "Diajukan" },
    Approved: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Disetujui" },
    Rejected: { cls: "bg-red-50 text-red-700 border-red-200", label: "Ditolak" },
    Disbursed: { cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Dicairkan" },
    Reconciled: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Direkonsiliasi" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
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
        title="Portofolio"
        description="Semua permohonan yang sudah disetujui, dicairkan, direkonsiliasi, atau ditolak."
      />

      {error && (
        <Alert tone="warning" title="Gagal memuat portofolio">
          {error}
        </Alert>
      )}

      {/* Search */}
      <div className="flex h-12 items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Search size={14} className="shrink-0 text-gray-400" />
        <input
          type="search"
          placeholder="Cari koperasi, status, atau risiko..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-full w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
      </div>

      {loading && (
        <p className="py-4 text-sm text-gray-400">Memuat portofolio...</p>
      )}

      {!loading && (
        <ScrollArea maxHeight={560} fade>
          <TableFrame>
            <Table>
              <THead>
                <Th>Koperasi</Th>
                <Th>Status</Th>
                <Th>Risiko</Th>
                <Th className="text-right">Diajukan</Th>
                <Th className="text-right">Disetujui</Th>
                <Th className="text-right">Dicairkan</Th>
                <Th className="text-right">Direkonsiliasi</Th>
                <Th className="text-right">Sisa</Th>
                <Th>Tanggal</Th>
              </THead>
              <TBody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                      Tidak ada data ditemukan.
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
                        <StatusBadge status={req.status} />
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
