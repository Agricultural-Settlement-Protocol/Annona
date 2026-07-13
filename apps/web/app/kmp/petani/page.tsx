"use client";

// Screen B — Petani (Farmer Registry) (PRD §8.1).
// Searchable table of registered farmers with expandable detail rows and inline registration.
// "use client" here because the table is interactive (search, row expand, register form).
//
// Deep-link focus: ?fokus=frm-xxx auto-expands and scrolls to that farmer's row.
// useSearchParams is isolated inside PetaniPageInner, wrapped in <Suspense> so the
// production build does not fail (Next.js App Router requirement).

import { type ApiAgreement, type ApiFarmer, fetchAgreements, fetchFarmers } from "@/lib/api";
import { PageHeader } from "@/components/kmp/page-header";
import { RegistryRegisterPanel } from "@/components/kmp/registry-register-panel";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { useApi } from "@/lib/use-api";
import { type MockFarmer, shortAddr } from "@/lib/mock-data";
import type { Status } from "@annona/core";
import {
  Alert,
  Button,
  EmptyState,
  Input,
  ReputationBadge,
  RupiahAmount,
  Skeleton,
  StatusBadge,
  cn,
} from "@annona/ui";
import { ChevronDown, ChevronUp, Search, UserPlus, Wallet } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

// Statuses that count toward "running debt" per farmer
const DEBT_STATUSES: Status[] = ["Active", "PartiallyDelivered", "Delivered", "Flagged"];

// Statuses that count as an "active" agreement (shown in the count pill)
const ACTIVE_STATUSES: Status[] = ["SupplyDispatched", "Active", "PartiallyDelivered", "Delivered"];

function farmerRunningDebt(agreements: ApiAgreement[], farmerId: string): bigint {
  return agreements
    .filter((a) => a.farmerId === farmerId && DEBT_STATUSES.includes(a.status))
    .reduce((sum, a) => sum + a.remainingDebt, 0n);
}

function farmerActiveAgreementCount(agreements: ApiAgreement[], farmerId: string): number {
  return agreements.filter(
    (a) => a.farmerId === farmerId && ACTIVE_STATUSES.includes(a.status),
  ).length;
}

/** Adapt a locally-registered MockFarmer (demo write path) to the ApiFarmer shape. */
function mockToApiFarmer(f: MockFarmer): ApiFarmer {
  return {
    id: f.id,
    coopId: "",
    name: f.name,
    ktpHash: f.ktpHash,
    walletAddress: f.walletAddress,
    plotAreaHa: String(f.plotAreaHa),
    defaultCommodityCode: f.defaultCommodityCode,
    kecamatan: f.kecamatan,
    kabupaten: "",
    createdAt: new Date().toISOString(),
    repTier: f.repTier,
    reputation: { ...f.reputation, score: 0 },
  };
}

/** Skeleton shown while the Suspense boundary resolves useSearchParams. */
function PetaniPageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

/** Inner component reads useSearchParams — must be inside Suspense. */
function PetaniPageInner() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const fokusId = searchParams.get("fokus") ?? null;

  const { data, loading, error } = useApi(
    () => Promise.all([fetchFarmers(), fetchAgreements()]),
    [],
  );
  const farmers = data?.[0] ?? [];
  const agreements = data?.[1] ?? [];

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [registeredFarmers, setRegisteredFarmers] = useState<ApiFarmer[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const allFarmers = useMemo(
    () => [...farmers, ...registeredFarmers],
    [farmers, registeredFarmers],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allFarmers;
    return allFarmers.filter(
      (f) => f.name.toLowerCase().includes(q) || f.kecamatan.toLowerCase().includes(q),
    );
  }, [allFarmers, search]);

  // Auto-expand the focused farmer row when fokusId arrives.
  useEffect(() => {
    if (fokusId) setExpandedId(fokusId);
  }, [fokusId]);

  // Scroll to the focused row after expand renders.
  // Uses a data attribute on the Tr so no ref forwarding is needed.
  // Timeout gives React one tick to paint the expanded row before scrolling.
  useEffect(() => {
    if (!fokusId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-farmer-id="${fokusId}"]`);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 80);
    return () => clearTimeout(timer);
  }, [fokusId]);

  function toggleRow(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleRegisterSuccess(farmer: MockFarmer) {
    setRegisteredFarmers((prev) => [...prev, mockToApiFarmer(farmer)]);
    setShowRegister(false);
    setSuccessMessage(`Petani ${farmer.name} berhasil didaftarkan (demo lokal).`);
    setTimeout(() => setSuccessMessage(null), 6000);
  }

  return (
    <div>
      <PageHeader
        title={t("page.kmp.petani.title")}
        description={t("page.kmp.petani.desc")}
        actions={
          <Button
            variant="primary"
            leftIcon={<UserPlus size={16} />}
            onClick={() => {
              setShowRegister((v) => !v);
              setExpandedId(null);
            }}
            className="rounded-full bg-primary-dark hover:bg-opacity-95 text-white"
          >
            {t("page.kmp.petani.register")}
          </Button>
        }
      />

      {successMessage ? <Alert tone="success" title={successMessage} className="mb-6" /> : null}

      {loading ? <PetaniPageSkeleton /> : null}
      {error ? (
        <Alert tone="warning" title={t("common.error")} className="mb-6">
          {error}
        </Alert>
      ) : null}

      {showRegister ? (
        <div className="mb-6">
          <RegistryRegisterPanel
            onSuccess={handleRegisterSuccess}
            onClose={() => setShowRegister(false)}
          />
        </div>
      ) : null}

      {!loading && !error ? (
        <>
      {/* Search bar */}
      <div className="mb-4 max-w-xs">
        <Input
          name="farmer-search"
          placeholder={t("page.kmp.petani.search")}
          leading={<Search size={15} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={32} />}
          title={t("common.notFound")}
          description={
            search
              ? `Tidak ada petani yang cocok dengan pencarian "${search}".`
              : t("common.noData")
          }
          action={
            <Button
              variant="outline"
              leftIcon={<UserPlus size={16} />}
              onClick={() => setShowRegister(true)}
              className="rounded-full"
            >
              {t("page.kmp.petani.register")}
            </Button>
          }
        />
      ) : (
        <TableFrame>
          <Table>
            <THead>
              <Th>{t("page.kmp.petani.table.col.name")}</Th>
              <Th>{t("page.kmp.petani.table.col.district")}</Th>
              <Th>{t("page.kmp.petani.table.col.area")}</Th>
              <Th>{t("page.kmp.petani.table.col.commodity")}</Th>
              <Th>{t("page.kmp.petani.table.col.status")}</Th>
              <Th>{t("page.kmp.petani.table.col.reputation")}</Th>
              <Th>{t("page.kmp.petani.table.col.debt")}</Th>
              <Th className="w-10" />
            </THead>
            <TBody>
              {filtered.map((farmer) => {
                const activeCount = farmerActiveAgreementCount(agreements, farmer.id);
                const debt = farmerRunningDebt(agreements, farmer.id);
                const isExpanded = expandedId === farmer.id;
                const isFocused = fokusId === farmer.id;
                const farmerAgreements = agreements.filter((a) => a.farmerId === farmer.id);

                return (
                  <Fragment key={farmer.id}>
                    {/* Main row — data-farmer-id for scroll targeting; ring highlight when focused */}
                    <Tr
                      className={cn(
                        "cursor-pointer select-none",
                        isFocused && "ring-2 ring-inset ring-verdant-300",
                      )}
                      data-farmer-id={farmer.id}
                      onClick={() => toggleRow(farmer.id)}
                    >
                      <Td className="font-medium">{farmer.name}</Td>
                      <Td className="text-muted-foreground">{farmer.kecamatan}</Td>
                      <Td>{Number(farmer.plotAreaHa).toFixed(2)}</Td>
                      <Td className="text-muted-foreground">
                        {farmer.defaultCommodityCode === "GABAH" ? "Gabah" : "Jagung"}
                      </Td>
                      <Td>
                        <span
                          className={
                            activeCount > 0
                              ? "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-verdant-100 px-2 text-xs font-semibold text-verdant-700"
                              : "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-ink-100 px-2 text-xs font-semibold text-ink-600"
                          }
                        >
                          {activeCount}
                        </span>
                      </Td>
                      <Td>
                        <ReputationBadge tier={farmer.repTier} />
                      </Td>
                      <Td>
                        {debt > 0n ? (
                          <RupiahAmount smallest={debt} tone="negative" />
                        ) : (
                          <span className="text-muted-foreground">Rp0</span>
                        )}
                      </Td>
                      <Td className="text-right">
                        {isExpanded ? (
                          <ChevronUp size={16} className="inline text-muted-foreground" />
                        ) : (
                          <ChevronDown size={16} className="inline text-muted-foreground" />
                        )}
                      </Td>
                    </Tr>

                    {/* Expandable detail row */}
                    {isExpanded ? (
                      <tr className="bg-surface-muted/40">
                        <td colSpan={8} className="px-6 py-5">
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {/* Identity */}
                            <div className="space-y-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Identitas On-Chain
                              </p>
                              <div className="space-y-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <Wallet size={13} className="shrink-0 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Wallet</span>
                                  </div>
                                  <p className="mt-0.5 font-mono text-xs text-foreground">
                                    {shortAddr(farmer.walletAddress)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Hash KTP (di chain)
                                  </p>
                                  <p className="mt-0.5 font-mono text-xs text-foreground">
                                    {farmer.ktpHash.slice(0, 16)}...
                                    {farmer.ktpHash.slice(-4)}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    Nomor KTP asli tidak pernah dicatat ke chain.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Reputation counters */}
                            <div className="space-y-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Statistik Reputasi
                              </p>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                {(
                                  [
                                    ["Total Setoran", farmer.reputation.deliveries],
                                    ["Tepat Waktu", farmer.reputation.onTime],
                                    [
                                      "Volume Setor",
                                      `${farmer.reputation.totalSettledKg.toLocaleString("id-ID")} kg`,
                                    ],
                                    ["Peringatan", farmer.reputation.flags],
                                    ["Gagal Panen", farmer.reputation.forceMajeureEvents],
                                  ] as [string, string | number][]
                                ).map(([label, val]) => (
                                  <div key={label}>
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                    <p className="text-sm font-semibold text-foreground">{val}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Agreements */}
                            <div className="space-y-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Perjanjian
                              </p>
                              {farmerAgreements.length > 0 ? (
                                <div className="space-y-1.5">
                                  {farmerAgreements.map((a) => (
                                    <Link
                                      key={a.id}
                                      href={`/kmp/perjanjian/${a.id}`}
                                      onClick={(ev) => ev.stopPropagation()}
                                      className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-xs transition-colors hover:border-verdant-300 hover:bg-verdant-50"
                                    >
                                      <span className="font-medium text-foreground">
                                        Perjanjian #{String(a.onchainId)}
                                      </span>
                                      <StatusBadge status={a.status} />
                                    </Link>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Belum ada perjanjian.
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </TBody>
          </Table>
        </TableFrame>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {t("common.view")}: {filtered.length}/{allFarmers.length}
      </p>
        </>
      ) : null}
    </div>
  );
}

/** Screen B — Farmer Registry. Suspense boundary isolates useSearchParams so
 *  the production build does not throw a missing-boundary error. */
export default function PetaniPage() {
  return (
    <Suspense fallback={<PetaniPageSkeleton />}>
      <PetaniPageInner />
    </Suspense>
  );
}
