"use client";

/**
 * Riwayat Setoran table — used on the Setor Panen page.
 * Searchable by farmer name or agreement number, filterable by date range.
 * Newest first. Paid/unpaid badge is settlement-aware (staged settlement).
 * Table lives inside a ScrollArea (capped height). Backed by /deliveries.
 */

import { DateRangePicker, type DateRange } from "@/components/kmp/date-range-picker";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { ScrollArea } from "@/components/scroll-area";
import { fetchDeliveries } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Alert, TxHashLink } from "@annona/ui";
import { CheckCircle2, Clock, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function PaidBadge({ paid }: { paid: boolean }) {
  if (paid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#ebf5e9] px-2.5 py-0.5 text-xs font-semibold text-[#0c7a48] border border-[#d2f9de]">
        <CheckCircle2 size={11} />
        Sudah Dibayar
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200/50">
      <Clock size={11} />
      Belum Dibayar
    </span>
  );
}

/** Parse "YYYY-MM-DD" to midnight timestamp for range comparison. */
function parseDateTs(s: string): number {
  const parts = s.split("-").map(Number);
  return new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1).getTime();
}

function floorToDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function DepositHistoryTable() {
  const [query, setQuery] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const { data, loading, error } = useApi(fetchDeliveries);
  const allRows = data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((r) => {
      const matchSearch =
        !q ||
        r.farmerName.toLowerCase().includes(q) ||
        String(r.agreementOnchainId).includes(q);

      const matchDate = (() => {
        if (!dateRange.start) return true;
        const rowTs = parseDateTs(r.deliveredAt.slice(0, 10));
        const startTs = floorToDay(dateRange.start);
        if (!dateRange.end) return rowTs >= startTs;
        return rowTs >= startTs && rowTs <= floorToDay(dateRange.end);
      })();

      return matchSearch && matchDate;
    });
  }, [allRows, query, dateRange]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <Search size={14} className="shrink-0 text-gray-400" />
          <input
            type="search"
            placeholder="Cari nama petani atau nomor perjanjian..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-full w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Memuat riwayat setoran...</p>}
      {error && (
        <Alert tone="warning" title="Gagal memuat riwayat setoran">
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <ScrollArea maxHeight={420} fade>
          <TableFrame>
            <Table>
              <THead>
                <Th>Tanggal</Th>
                <Th>Petani</Th>
                <Th>Perjanjian</Th>
                <Th>Setoran ke</Th>
                <Th>Volume (kg)</Th>
                <Th>Grade</Th>
                <Th>Kadar Air (%)</Th>
                <Th>Status Bayar</Th>
                <Th>Tx</Th>
              </THead>
              <TBody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada data setoran ditemukan.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <Tr key={row.id}>
                      <Td className="tabular-nums">{row.deliveredAt.slice(0, 10)}</Td>
                      <Td className="font-medium">{row.farmerName}</Td>
                      <Td>
                        <Link
                          href={`/kmp/perjanjian/${row.agreementId}`}
                          className="text-accent hover:underline"
                        >
                          #{String(row.agreementOnchainId)}
                        </Link>
                      </Td>
                      <Td>Ke-{row.seq}</Td>
                      <Td className="tabular-nums">
                        {Number(row.volumeG / 1000n).toLocaleString("id-ID")}
                      </Td>
                      <Td>{row.grade}</Td>
                      <Td className="tabular-nums">
                        {row.moistureBps != null ? (row.moistureBps / 100).toFixed(1) : "-"}
                      </Td>
                      <Td>
                        <PaidBadge paid={row.paid} />
                      </Td>
                      <Td>
                        {row.receiptOnchainRef ? (
                          <TxHashLink hash={row.receiptOnchainRef} />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
