"use client";

/**
 * Riwayat Pembayaran table — used on the Pembayaran page.
 * Searchable by farmer name or agreement number, filterable by date range.
 * Shows three-way split columns per settlement row. Newest first.
 * Table lives inside a ScrollArea (capped height) in the parent page.
 */

import { DateRangePicker, type DateRange } from "@/components/kmp/date-range-picker";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { ScrollArea } from "@/components/scroll-area";
import { paymentHistoryRows } from "@/lib/mock-data";
import { RupiahAmount, TxHashLink } from "@annona/ui";
import { CheckCircle2, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function PaidBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 size={11} />
      Dibayar
    </span>
  );
}

function parseDateTs(s: string): number {
  const parts = s.split("-").map(Number);
  return new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1).getTime();
}

function floorToDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function PaymentHistoryTable() {
  const [query, setQuery] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const allRows = useMemo(() => paymentHistoryRows(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((r) => {
      const matchSearch =
        !q ||
        r.farmer.name.toLowerCase().includes(q) ||
        String(r.agreement.onchainId).includes(q);

      const matchDate = (() => {
        if (!dateRange.start) return true;
        const rowTs = parseDateTs(r.settlement.settledAt);
        const startTs = floorToDay(dateRange.start);
        if (!dateRange.end) return rowTs >= startTs;
        return rowTs >= startTs && rowTs <= floorToDay(dateRange.end);
      })();

      return matchSearch && matchDate;
    });
  }, [allRows, query, dateRange]);

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-ring">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cari nama petani atau nomor perjanjian..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-full w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Table inside ScrollArea */}
      <ScrollArea maxHeight={420} fade>
        <TableFrame>
          <Table>
            <THead>
              <Th>Tanggal</Th>
              <Th>Petani</Th>
              <Th>Perjanjian</Th>
              <Th>Komoditas</Th>
              <Th>Grade</Th>
              <Th>Kadar Air (%)</Th>
              <Th>Volume Dibayar (kg)</Th>
              <Th>Nilai Panen</Th>
              <Th>Potongan Tangani</Th>
              <Th>Utang Dicicil</Th>
              <Th>Diterima Petani</Th>
              <Th>Ref Bank</Th>
              <Th>Status</Th>
              <Th>Tx</Th>
            </THead>
            <TBody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Tidak ada data pembayaran ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <Tr key={row.settlement.id}>
                    <Td className="tabular-nums">{row.settlement.settledAt}</Td>
                    <Td className="font-medium">{row.farmer.name}</Td>
                    <Td>
                      <Link
                        href={`/kmp/perjanjian/${row.agreement.id}`}
                        className="text-accent hover:underline"
                      >
                        #{String(row.agreement.onchainId)}
                      </Link>
                    </Td>
                    <Td>
                      {row.agreement.commodityCode === "GABAH" ? "Gabah" : "Jagung"}
                    </Td>
                    <Td>{row.grade}</Td>
                    <Td className="tabular-nums">
                      {(row.moistureBps / 100).toFixed(1)}
                    </Td>
                    <Td className="tabular-nums">
                      {row.settlement.settledVolKg.toLocaleString("id-ID")}
                    </Td>
                    <Td>
                      <RupiahAmount smallest={row.settlement.gross} className="text-sm" />
                    </Td>
                    <Td>
                      <RupiahAmount
                        smallest={row.settlement.handlingCut}
                        className="text-sm"
                      />
                    </Td>
                    <Td>
                      <RupiahAmount
                        smallest={row.settlement.debtNetted}
                        className="text-sm"
                      />
                    </Td>
                    <Td>
                      <RupiahAmount
                        smallest={row.settlement.netPaid}
                        tone="positive"
                        className="text-sm font-semibold"
                      />
                    </Td>
                    <Td className="font-mono text-xs text-muted-foreground">
                      {row.settlement.rupiahRef}
                    </Td>
                    <Td>
                      <PaidBadge />
                    </Td>
                    <Td>
                      <TxHashLink hash={row.settlement.txHash} />
                    </Td>
                  </Tr>
                ))
              )}
            </TBody>
          </Table>
        </TableFrame>
      </ScrollArea>
    </div>
  );
}
