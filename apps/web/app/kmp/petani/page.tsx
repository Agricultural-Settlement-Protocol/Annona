"use client";

// Screen B — Petani (Farmer Registry) (PRD §8.1).
// Searchable table of registered farmers with expandable detail rows and inline registration.
// "use client" here because the table is interactive (search, row expand, register form).

import { PageHeader } from "@/components/kmp/page-header";
import { RegistryRegisterPanel } from "@/components/kmp/registry-register-panel";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import {
  MOCK_AGREEMENTS,
  MOCK_FARMERS,
  type MockFarmer,
  agreementsOfFarmer,
  shortAddr,
} from "@/lib/mock-data";
import type { Status } from "@annona/core";
import {
  Alert,
  Button,
  EmptyState,
  Input,
  ReputationBadge,
  RupiahAmount,
  StatusBadge,
} from "@annona/ui";
import { ChevronDown, ChevronUp, Search, UserPlus, Wallet } from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

// Statuses that count toward "running debt" per farmer
const DEBT_STATUSES: Status[] = ["Active", "PartiallyDelivered", "Delivered", "Flagged"];

// Statuses that count as an "active" agreement (shown in the count pill)
const ACTIVE_STATUSES: Status[] = ["SupplyDispatched", "Active", "PartiallyDelivered", "Delivered"];

function farmerRunningDebt(farmerId: string): bigint {
  return MOCK_AGREEMENTS.filter(
    (a) => a.farmerId === farmerId && DEBT_STATUSES.includes(a.status),
  ).reduce((sum, a) => sum + a.remainingDebt, 0n);
}

function farmerActiveAgreementCount(farmerId: string): number {
  return MOCK_AGREEMENTS.filter(
    (a) => a.farmerId === farmerId && ACTIVE_STATUSES.includes(a.status),
  ).length;
}

export default function PetaniPage() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [registeredFarmers, setRegisteredFarmers] = useState<MockFarmer[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const allFarmers = useMemo(() => [...MOCK_FARMERS, ...registeredFarmers], [registeredFarmers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allFarmers;
    return allFarmers.filter(
      (f) => f.name.toLowerCase().includes(q) || f.kecamatan.toLowerCase().includes(q),
    );
  }, [allFarmers, search]);

  function toggleRow(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleRegisterSuccess(farmer: MockFarmer) {
    setRegisteredFarmers((prev) => [...prev, farmer]);
    setShowRegister(false);
    setSuccessMessage(`Petani ${farmer.name} berhasil didaftarkan (demo lokal).`);
    setTimeout(() => setSuccessMessage(null), 6000);
  }

  return (
    <div>
      <PageHeader
        title="Petani"
        description="Daftar petani yang terdaftar di KMP Sukamaju. Klik baris untuk melihat detail dan perjanjian."
        actions={
          <Button
            variant="primary"
            leftIcon={<UserPlus size={16} />}
            onClick={() => {
              setShowRegister((v) => !v);
              setExpandedId(null);
            }}
          >
            Daftarkan Petani
          </Button>
        }
      />

      {successMessage ? <Alert tone="success" title={successMessage} className="mb-6" /> : null}

      {showRegister ? (
        <div className="mb-6">
          <RegistryRegisterPanel
            onSuccess={handleRegisterSuccess}
            onClose={() => setShowRegister(false)}
          />
        </div>
      ) : null}

      {/* Search bar */}
      <div className="mb-4 max-w-xs">
        <Input
          name="farmer-search"
          placeholder="Cari nama atau kecamatan..."
          leading={<Search size={15} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={32} />}
          title="Tidak ada petani ditemukan"
          description={
            search
              ? `Tidak ada petani yang cocok dengan pencarian "${search}".`
              : "Belum ada petani terdaftar."
          }
          action={
            <Button
              variant="outline"
              leftIcon={<UserPlus size={16} />}
              onClick={() => setShowRegister(true)}
            >
              Daftarkan Petani
            </Button>
          }
        />
      ) : (
        <TableFrame>
          <Table>
            <THead>
              <Th>Nama</Th>
              <Th>Kecamatan</Th>
              <Th>Lahan (ha)</Th>
              <Th>Komoditas</Th>
              <Th>Perjanjian Aktif</Th>
              <Th>Reputasi</Th>
              <Th>Utang Berjalan</Th>
              <Th className="w-10" />
            </THead>
            <TBody>
              {filtered.map((farmer) => {
                const activeCount = farmerActiveAgreementCount(farmer.id);
                const debt = farmerRunningDebt(farmer.id);
                const isExpanded = expandedId === farmer.id;
                const farmerAgreements = agreementsOfFarmer(farmer.id);

                return (
                  <Fragment key={farmer.id}>
                    {/* Main row */}
                    <Tr className="cursor-pointer select-none" onClick={() => toggleRow(farmer.id)}>
                      <Td className="font-medium">{farmer.name}</Td>
                      <Td className="text-muted-foreground">{farmer.kecamatan}</Td>
                      <Td>{farmer.plotAreaHa.toFixed(2)}</Td>
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
        {filtered.length} dari {allFarmers.length} petani ditampilkan.
      </p>
    </div>
  );
}
