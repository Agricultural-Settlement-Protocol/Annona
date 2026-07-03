"use client";

/**
 * Riwayat Setoran table — used on the Setor Panen page.
 * Searchable by farmer name or agreement number. Newest first.
 * Paid/unpaid badge is settlement-aware (staged settlement).
 */

import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { deliveryHistoryRows } from "@/lib/mock-data";
import { TxHashLink } from "@annona/ui";
import { CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

/** Inline payment-status badge — not a Status enum so we keep it local. */
function PaidBadge({ paid }: { paid: boolean }) {
  if (paid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 size={11} />
        Sudah Dibayar
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <Clock size={11} />
      Belum Dibayar
    </span>
  );
}

export function DepositHistoryTable() {
  const [query, setQuery] = useState("");
  const allRows = useMemo(() => deliveryHistoryRows(), []);

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
                <Tr key={row.delivery.id}>
                  <Td className="tabular-nums">{row.delivery.deliveredAt}</Td>
                  <Td className="font-medium">{row.farmer.name}</Td>
                  <Td>
                    <Link
                      href={`/kmp/perjanjian/${row.agreement.id}`}
                      className="text-accent hover:underline"
                    >
                      #{String(row.agreement.onchainId)}
                    </Link>
                  </Td>
                  <Td>Ke-{row.delivery.seq}</Td>
                  <Td className="tabular-nums">{row.delivery.volumeKg.toLocaleString("id-ID")}</Td>
                  <Td>{row.delivery.grade}</Td>
                  <Td className="tabular-nums">{(row.delivery.moistureBps / 100).toFixed(1)}</Td>
                  <Td>
                    <PaidBadge paid={row.paid} />
                  </Td>
                  <Td>
                    <TxHashLink hash={row.delivery.receiptTxHash} />
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
