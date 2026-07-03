import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { MOCK_AGREEMENTS, getFarmer } from "@/lib/mock-data";
import { Button, ResiduStatusBadge, RupiahAmount, StatCard, StatusBadge } from "@annona/ui";
import { AlertTriangle, CheckCircle2, FilePlus2, FileText } from "lucide-react";
import Link from "next/link";

/** Agreement list — entry point to Screen E (PRD §8.1). Server component,
 *  read-only. No bigint crosses a client-component prop boundary here because
 *  RupiahAmount / StatusBadge are not "use client" components. */
export default function PerjanjianPage() {
  const total = MOCK_AGREEMENTS.length;
  const settled = MOCK_AGREEMENTS.filter((a) => a.status === "Settled").length;
  const flagged = MOCK_AGREEMENTS.filter((a) => a.status === "Flagged").length;

  return (
    <div>
      <PageHeader
        title="Perjanjian"
        description="Seluruh perjanjian offtake: aktif, selesai, dan perlu ditinjau."
        actions={
          <Link href="/kmp/perjanjian/baru">
            <Button leftIcon={<FilePlus2 size={16} />}>Buat Perjanjian</Button>
          </Link>
        }
      />

      {/* 3 summary stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Perjanjian"
          value={String(total)}
          hint="Semua tahap"
          icon={<FileText size={18} />}
        />
        <StatCard
          label="Lunas"
          value={String(settled)}
          hint="Pembayaran selesai, split tercatat"
          tone="good"
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label="Perlu Ditinjau"
          value={String(flagged)}
          hint="Setoran di bawah perkiraan, menunggu petugas"
          tone={flagged > 0 ? "warn" : "good"}
          icon={<AlertTriangle size={18} />}
        />
      </div>

      <TableFrame>
        <Table>
          <THead>
            <Th className="w-12">#</Th>
            <Th>Petani</Th>
            <Th>Komoditas</Th>
            <Th className="text-right">Perkiraan</Th>
            <Th className="text-right">Disetor</Th>
            <Th className="text-right">Utang Berjalan</Th>
            <Th>Status</Th>
            <Th>Residu</Th>
          </THead>
          <TBody>
            {MOCK_AGREEMENTS.map((a) => {
              const farmer = getFarmer(a.farmerId);
              const deliveredKg = Number(a.deliveredVolG / 1000n);

              return (
                <Tr key={a.id}>
                  {/* # column — links to detail */}
                  <Td>
                    <Link
                      href={`/kmp/perjanjian/${a.id}`}
                      className="font-mono text-xs text-accent hover:underline"
                    >
                      #{String(a.onchainId)}
                    </Link>
                  </Td>

                  {/* Petani */}
                  <Td>
                    <Link
                      href={`/kmp/perjanjian/${a.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {farmer?.name ?? "(tidak diketahui)"}
                    </Link>
                    <p className="text-xs text-muted-foreground">{farmer?.kecamatan}</p>
                  </Td>

                  {/* Komoditas */}
                  <Td className="text-muted-foreground">
                    {a.commodityCode === "GABAH" ? "Gabah Kering" : "Jagung Pipilan"}
                  </Td>

                  {/* Perkiraan kg */}
                  <Td className="text-right tabular-nums">
                    {a.expectedVolKg.toLocaleString("id-ID")} kg
                  </Td>

                  {/* Disetor kg */}
                  <Td className="text-right tabular-nums">
                    {deliveredKg.toLocaleString("id-ID")} kg
                  </Td>

                  {/* Utang Berjalan */}
                  <Td className="text-right">
                    <RupiahAmount
                      smallest={a.remainingDebt}
                      tone={a.remainingDebt > 0n ? "negative" : "muted"}
                    />
                  </Td>

                  {/* Status */}
                  <Td>
                    <StatusBadge status={a.status} />
                  </Td>

                  {/* Residu — hanya tampilkan untuk yang sudah Lunas */}
                  <Td>
                    {a.status === "Settled" ? (
                      <ResiduStatusBadge status={a.residuStatus} />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </TableFrame>
    </div>
  );
}
