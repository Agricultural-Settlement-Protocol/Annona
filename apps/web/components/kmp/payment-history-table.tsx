"use client";

/**
 * Riwayat Pembayaran table — used on the Pembayaran page.
 * Searchable by farmer name or agreement number, filterable by date range.
 * Shows three-way split columns per settlement row. Newest first.
 * Table lives inside a ScrollArea (capped height). Backed by /settlements.
 */

import { DateRangePicker, type DateRange } from "@/components/kmp/date-range-picker";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { ScrollArea } from "@/components/scroll-area";
import { fetchSettlements } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Alert, RupiahAmount, TxHashLink } from "@annona/ui";
import { CheckCircle2, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function PaidBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#ebf5e9] px-2.5 py-0.5 text-xs font-semibold text-[#0c7a48] border border-[#d2f9de]">
      <CheckCircle2 size={11} />
      Dibayar
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

export function PaymentHistoryTable() {
  const [query, setQuery] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const { data, loading, error } = useApi(fetchSettlements);
  const allRows = useMemo(() => {
    const rows = data ?? [];
    // Newest first.
    return [...rows].sort((a, b) => b.settledAt.localeCompare(a.settledAt));
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((r) => {
      const matchSearch =
        !q || r.farmerName.toLowerCase().includes(q) || String(r.onchainId).includes(q);

      const matchDate = (() => {
        if (!dateRange.start) return true;
        const rowTs = parseDateTs(r.settledAt.slice(0, 10));
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

<<<<<<< HEAD
      {loading && <p className="text-sm text-muted-foreground">Memuat riwayat pembayaran...</p>}
      {error && (
        <Alert tone="warning" title="Gagal memuat riwayat pembayaran">
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
                  filtered.map((s) => (
                    <Tr key={s.id}>
                      <Td className="tabular-nums">{s.settledAt}</Td>
                      <Td className="font-medium">{s.farmerName}</Td>
                      <Td>
                        <Link
                          href={`/kmp/perjanjian/${s.agreementId}`}
                          className="text-accent hover:underline"
                        >
                          #{String(s.onchainId)}
                        </Link>
                      </Td>
                      <Td>{s.commodityCode === "GABAH" ? "Gabah" : "Jagung"}</Td>
                      <Td>{s.grade}</Td>
                      <Td className="tabular-nums">{(s.moistureBps / 100).toFixed(1)}</Td>
                      <Td className="tabular-nums">
                        {Number(s.settledVolG / 1000n).toLocaleString("id-ID")}
                      </Td>
                      <Td>
                        <RupiahAmount smallest={s.gross} className="text-sm" />
                      </Td>
                      <Td>
                        <RupiahAmount smallest={s.handlingCut} className="text-sm" />
                      </Td>
                      <Td>
                        <RupiahAmount smallest={s.debtNetted} className="text-sm" />
                      </Td>
                      <Td className="font-semibold">
                        <RupiahAmount
                          smallest={s.netPaid}
                          tone="positive"
                          className="text-sm font-semibold"
                        />
                      </Td>
                      <Td className="font-mono text-xs text-muted-foreground">
                        {s.rupiahRef ?? "-"}
                      </Td>
                      <Td>
                        <PaidBadge />
                      </Td>
                      <Td>
                        {s.txHash ? (
                          <TxHashLink hash={s.txHash} />
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
=======
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
              <Th>Volume (kg)</Th>
              <Th>Nilai Panen</Th>
              <Th>Handling Fee</Th>
              <Th>Cicil Utang</Th>
              <Th>Diterima Petani</Th>
              <Th>Ref Bank</Th>
              <Th>Status</Th>
              <Th>Tx</Th>
            </THead>
            <TBody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-sm text-gray-500 font-medium">
                    Tidak ada data pembayaran ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <Tr key={row.settlement.id}>
                    <Td className="tabular-nums">{row.settlement.settledAt}</Td>
                    <Td className="font-bold text-gray-900">{row.farmer.name}</Td>
                    <Td>
                      <Link
                        href={`/kmp/perjanjian/${row.agreement.id}`}
                        className="text-emerald-700 font-bold hover:text-emerald-950 hover:underline"
                      >
                        #{String(row.agreement.onchainId)}
                      </Link>
                    </Td>
                    <Td>{row.agreement.commodityCode === "GABAH" ? "Gabah" : "Jagung"}</Td>
                    <Td className="font-semibold">{row.grade}</Td>
                    <Td className="tabular-nums font-semibold">
                      {(row.moistureBps / 100).toFixed(1)}
                    </Td>
                    <Td className="tabular-nums font-semibold text-gray-900">
                      {row.settlement.settledVolKg.toLocaleString("id-ID")}
                    </Td>
                    <Td>
                      <RupiahAmount smallest={row.settlement.gross} className="text-sm font-semibold tabular-nums" />
                    </Td>
                    <Td>
                      <RupiahAmount smallest={row.settlement.handlingCut} className="text-sm tabular-nums text-gray-500" />
                    </Td>
                    <Td>
                      <RupiahAmount smallest={row.settlement.debtNetted} className="text-sm tabular-nums text-amber-700 font-semibold" />
                    </Td>
                    <Td>
                      <RupiahAmount smallest={row.settlement.netPaid} tone="positive" className="text-sm font-bold tabular-nums" />
                    </Td>
                    <Td className="font-mono text-xs text-gray-650">{row.settlement.rupiahRef}</Td>
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
>>>>>>> e56fca8 (refactor: overhaul UrbanGreen component structure and update KMP interface styling)
    </div>
  );
}
