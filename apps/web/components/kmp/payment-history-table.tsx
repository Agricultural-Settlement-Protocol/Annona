"use client";

/**
 * Riwayat Pembayaran table — used on the Pembayaran page.
 * Searchable by farmer name or agreement number. Newest first.
 * Shows three-way split columns per settlement row.
 */

import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { paymentHistoryRows } from "@/lib/mock-data";
import { RupiahAmount, TxHashLink } from "@annona/ui";
import { CheckCircle2 } from "lucide-react";
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

export function PaymentHistoryTable() {
  const [query, setQuery] = useState("");
  const allRows = useMemo(() => paymentHistoryRows(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) => r.farmer.name.toLowerCase().includes(q) || String(r.agreement.onchainId).includes(q),
    );
  }, [allRows, query]);

  return (
    <div className="space-y-3">
      <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-ring">
        <input
          type="search"
          placeholder="Cari nama petani atau nomor perjanjian..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-full w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

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
            <Th>Potongan (Tangani)</Th>
            <Th>Utang Dicicil</Th>
            <Th>Diterima Petani</Th>
            <Th>Ref Bank</Th>
            <Th>Status</Th>
            <Th>Tx</Th>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-sm text-muted-foreground">
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
                  <Td>{row.agreement.commodityCode === "GABAH" ? "Gabah" : "Jagung"}</Td>
                  <Td>{row.grade}</Td>
                  <Td className="tabular-nums">{(row.moistureBps / 100).toFixed(1)}</Td>
                  <Td className="tabular-nums">
                    {row.settlement.settledVolKg.toLocaleString("id-ID")}
                  </Td>
                  <Td>
                    <RupiahAmount smallest={row.settlement.gross} className="text-sm" />
                  </Td>
                  <Td>
                    <RupiahAmount smallest={row.settlement.handlingCut} className="text-sm" />
                  </Td>
                  <Td>
                    <RupiahAmount smallest={row.settlement.debtNetted} className="text-sm" />
                  </Td>
                  <Td className="font-semibold">
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
    </div>
  );
}
