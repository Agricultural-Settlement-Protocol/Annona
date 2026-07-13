"use client";

import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { fetchAgreements, fetchFarmers, farmerMap } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Button, ResiduStatusBadge, RupiahAmount, Skeleton, StatCard, StatusBadge } from "@annona/ui";
import { AlertTriangle, CheckCircle2, FilePlus2, FileText } from "lucide-react";
import Link from "next/link";

/** Agreement list — entry point to Screen E (PRD §8.1). Client component
 *  backed by useApi. */
export default function PerjanjianPage() {
  const { t } = useI18n();
  const { data: agreements, loading: agLoading } = useApi(fetchAgreements);
  const { data: farmers, loading: fLoading } = useApi(fetchFarmers);

  if (agLoading || fLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {["s1", "s2", "s3"].map((id) => (
            <Skeleton key={id} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const farmers_ = farmerMap(farmers ?? []);

  const total = agreements?.length ?? 0;
  const settled = (agreements ?? []).filter((a) => a.status === "Settled").length;
  const flagged = (agreements ?? []).filter((a) => a.status === "Flagged").length;

  return (
    <div>
      <PageHeader
        title={t("page.kmp.perjanjian.title")}
        description={t("page.kmp.perjanjian.desc")}
        actions={
          <Link href="/kmp/perjanjian/baru">
            <Button leftIcon={<FilePlus2 size={16} />} className="rounded-full bg-primary-dark hover:bg-opacity-95 text-white">{t("page.kmp.perjanjian.create")}</Button>
          </Link>
        }
      />

      {/* 3 summary stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("page.kmp.perjanjian.total")}
          value={String(total)}
          hint={t("page.kmp.perjanjian.totalHint")}
          icon={<FileText size={18} />}
        />
        <StatCard
          label={t("page.kmp.perjanjian.lunas")}
          value={String(settled)}
          hint={t("page.kmp.perjanjian.lunasHint")}
          tone="good"
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label={t("page.kmp.perjanjian.flagged")}
          value={String(flagged)}
          hint={t("page.kmp.perjanjian.flaggedHint")}
          tone={flagged > 0 ? "warn" : "good"}
          icon={<AlertTriangle size={18} />}
        />
      </div>

      <TableFrame>
        <Table>
          <THead>
            <Th className="w-12">#</Th>
            <Th>{t("page.kmp.perjanjian.colHeader.farmer")}</Th>
            <Th>{t("page.kmp.perjanjian.colHeader.commodity")}</Th>
            <Th>{t("page.kmp.perjanjian.colHeader.subsidy")}</Th>
            <Th className="text-right">{t("page.kmp.perjanjian.colHeader.estimate")}</Th>
            <Th className="text-right">{t("page.kmp.perjanjian.colHeader.delivered")}</Th>
            <Th className="text-right">{t("page.kmp.perjanjian.colHeader.debt")}</Th>
            <Th>{t("page.kmp.perjanjian.colHeader.status")}</Th>
            <Th>{t("page.kmp.perjanjian.colHeader.residu")}</Th>
          </THead>
          <TBody>
            {(agreements ?? []).map((a) => {
              const farmer = farmers_.get(a.farmerId);
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
                      {farmer?.name ?? (`(${t("common.unknown")})`)}
                    </Link>
                    <p className="text-xs text-muted-foreground">{farmer?.kecamatan}</p>
                  </Td>

                  {/* Komoditas */}
                  <Td className="text-muted-foreground">
                    {a.commodityCode === "GABAH" ? "Gabah Kering" : "Jagung Pipilan"}
                  </Td>

                  {/* Subsidi */}
                  <Td>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.subsidyTier === "Subsidized"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {a.subsidyTier === "Subsidized"
                        ? t("badge.subsidy.Subsidized")
                        : t("badge.subsidy.Commercial")}
                    </span>
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
