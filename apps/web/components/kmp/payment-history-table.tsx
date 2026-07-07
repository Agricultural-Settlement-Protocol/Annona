"use client";

/**
 * Riwayat Pembayaran table — used on the Pembayaran page.
 * Searchable by farmer name or agreement number. Newest first.
 * Shows three-way split columns per settlement row. Backed by /settlements.
 */

import { fetchSettlements } from "@/lib/api";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { useApi } from "@/lib/use-api";
import { Alert, RupiahAmount, TxHashLink } from "@annona/ui";
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
  const { data, loading, error } = useApi(fetchSettlements);
  const allRows = useMemo(() => {
    const rows = data ?? [];
    // Newest first.
    return [...rows].sort((a, b) => b.settledAt.localeCompare(a.settledAt));
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) => r.farmerName.toLowerCase().includes(q) || String(r.onchainId).includes(q),
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

      {loading && <p className="text-sm text-muted-foreground">Memuat riwayat pembayaran...</p>}
      {error && (
        <Alert tone="warning" title="Gagal memuat riwayat pembayaran">
          {error}
        </Alert>
      )}

      {!loading && !error && (
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
                    <Td className="font-mono text-xs text-muted-foreground">{s.rupiahRef ?? "-"}</Td>
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
      )}
    </div>
  );
}
