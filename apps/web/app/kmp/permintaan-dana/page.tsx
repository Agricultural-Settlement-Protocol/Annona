"use client";

/**
 * Screen: Permintaan Dana Offtake (KMP side).
 * KMP uses this to request working-capital financing from a Pemodal (financier),
 * backed by the collective projected settlement value of selected offtake
 * agreements.
 *
 * LEFT/TOP: agreement multi-selector + running total + financier picker +
 * "Ajukan Dana" button (useTx demo-mode -> maps to request_funding fn, not yet
 * built on-chain; TODO: wire real Invocation when deployed).
 *
 * RIGHT/BOTTOM: "Riwayat Permintaan Dana" - searchable history from /financier
 * (all requests; in the single-coop demo these are this coop's requests).
 * Columns link to detail or perjanjian detail.
 */

import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { ScrollArea } from "@/components/scroll-area";
import { useTx } from "@/components/kmp/use-tx";
import type { Invocation } from "@/lib/tx";
import {
  fetchAgreements,
  fetchFinancierAll,
  fetchFinancierOverview,
  type ApiAgreement,
  type ApiFundingRequestRow,
  type FundingStatus,
  type RiskBadge,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatRupiah } from "@annona/core";
import type { Status } from "@annona/core";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  RupiahAmount,
  TxHashLink,
} from "@annona/ui";
import {
  CheckCircle2,
  Coins,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Statuses where an agreement has projected future value to back financing. */
const BACKABLE_STATUSES: Status[] = ["Created", "Active", "PartiallyDelivered", "Delivered"];

/** Estimated backing value for one agreement: expectedVolG * hppPerKg (in smallest units).
 *  Formula: (g / 1_000_000_000) * (hppPerKg in smallest units / 10_000_000)
 *  = (g * hppPerKg) / 10_000_000_000_000_000
 *  Simplify: volume_kg * hpp_per_kg (both in whole units) */
function estimateBacking(a: ApiAgreement): bigint {
  // hppPerKg is in smallest units (7 decimal), volume in grams
  // backing_value_smallest = (volumeG / 1000 grams_per_kg) * hppPerKg_smallest / 10^7
  // = volumeG * hppPerKg / (1000 * 10_000_000)
  const grams = a.expectedVolG > a.deliveredVolG ? a.expectedVolG - a.deliveredVolG : 0n;
  if (grams === 0n || a.hppPerKg === 0n) return 0n;
  // (grams / 1000) kg * (hppPerKg / 10^7) Rp = grams * hppPerKg / (1000 * 10^7)
  return (grams * a.hppPerKg) / 10_000_000_000n;
}

function riskBadgeClass(badge: RiskBadge): string {
  if (badge === "Rendah") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (badge === "Sedang") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function FundingStatusBadge({ status }: { status: FundingStatus }) {
  const map: Record<FundingStatus, { cls: string; label: string }> = {
    Requested: { cls: "bg-gray-100 text-gray-600 border-gray-200", label: "Diajukan" },
    Approved: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Disetujui" },
    Rejected: { cls: "bg-red-50 text-red-700 border-red-200", label: "Ditolak" },
    Disbursed: { cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Dicairkan" },
    Reconciled: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Direkonsiliasi" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function AgreementRow({
  agreement,
  selected,
  onToggle,
}: {
  agreement: ApiAgreement;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const backing = estimateBacking(agreement);
  const volKg = Number(agreement.expectedVolG / 1_000_000n); // g -> kg (integer)

  return (
    <button
      type="button"
      onClick={() => onToggle(agreement.id)}
      className={[
        "w-full text-left flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
        selected
          ? "border-amber-300 bg-amber-50/50"
          : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/40",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors",
          selected ? "border-amber-500 bg-amber-500" : "border-gray-300",
        ].join(" ")}
      >
        {selected ? <CheckCircle2 size={14} className="text-white" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{agreement.farmerName}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          #{String(agreement.onchainId)}, {agreement.commodityCode},
          perkiraan {volKg.toLocaleString("id-ID")} kg
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-gray-400 font-medium">Est. nilai jaminan</p>
        <RupiahAmount smallest={backing} className="text-sm font-semibold" />
      </div>
    </button>
  );
}

function FundingHistoryTable() {
  const { data, loading, error } = useApi(fetchFinancierAll);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const all: ApiFundingRequestRow[] = data ?? [];
    const sorted = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (r) =>
        r.coopName.toLowerCase().includes(q) ||
        r.financierName.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <div className="space-y-4">
      <div className="flex h-12 items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Search size={14} className="shrink-0 text-gray-400" />
        <input
          type="search"
          placeholder="Cari koperasi, pemodal, atau status..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-full w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
      </div>

      {loading && (
        <p className="py-4 text-sm text-gray-400">Memuat riwayat...</p>
      )}
      {error && (
        <Alert tone="warning" title="Gagal memuat riwayat">
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <ScrollArea maxHeight={420} fade>
          <TableFrame>
            <Table>
              <THead>
                <Th>Perjanjian</Th>
                <Th>Pemodal</Th>
                <Th>Status</Th>
                <Th>Risiko</Th>
                <Th className="text-right">Diajukan</Th>
                <Th className="text-right">Disetujui</Th>
                <Th className="text-right">Dicairkan</Th>
                <Th className="text-right">Direkonsiliasi</Th>
                <Th>Coverage</Th>
                <Th>Tanggal</Th>
              </THead>
              <TBody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      Tidak ada riwayat permintaan dana.
                    </td>
                  </tr>
                ) : (
                  rows.map((req) => (
                    <Tr key={req.id}>
                      {/* Perjanjian column: link to financier detail for request context,
                          from which the user can click each backing line to /kmp/perjanjian/[id] */}
                      <Td>
                        <Link
                          href={`/financier/${req.id}`}
                          className="font-mono text-xs text-amber-700 hover:underline"
                        >
                          Lihat detail
                        </Link>
                      </Td>
                      <Td className="text-gray-700">{req.financierName}</Td>
                      <Td>
                        <FundingStatusBadge status={req.status} />
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskBadgeClass(req.riskBadge)}`}
                        >
                          {req.riskBadge}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <RupiahAmount smallest={req.amountRequested} className="text-sm" />
                      </Td>
                      <Td className="text-right">
                        <RupiahAmount smallest={req.amountApproved} className="text-sm" />
                      </Td>
                      <Td className="text-right">
                        <RupiahAmount smallest={req.amountDisbursed} className="text-sm" />
                      </Td>
                      <Td className="text-right">
                        <RupiahAmount smallest={req.amountReconciled} className="text-sm" />
                      </Td>
                      <Td className="tabular-nums text-gray-600 text-xs">
                        {(req.coverageRatioBps / 100).toFixed(1)}%
                      </Td>
                      <Td className="tabular-nums text-gray-500 text-xs">
                        {req.createdAt.slice(0, 10)}
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

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PermintaanDanaPage() {
  /* ── Live data ─────────────────────────────────────────────────────────── */
  const { data: agreements, loading: agrLoading } = useApi(fetchAgreements);
  const { data: ovData, loading: ovLoading } = useApi(fetchFinancierOverview);

  /* ── Selection state ───────────────────────────────────────────────────── */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  /* ── TX hook for request_funding ──────────────────────────────────────── */
  const tx = useTx();
  const [submitted, setSubmitted] = useState(false);

  /* ── Derived ────────────────────────────────────────────────────────────── */
  const backableAgreements = useMemo(() => {
    const all = agreements ?? [];
    return all.filter((a) => BACKABLE_STATUSES.includes(a.status));
  }, [agreements]);

  const filteredAgreements = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return backableAgreements;
    return backableAgreements.filter(
      (a) =>
        a.farmerName.toLowerCase().includes(q) ||
        a.commodityCode.toLowerCase().includes(q) ||
        String(a.onchainId).includes(q),
    );
  }, [backableAgreements, search]);

  const selectedAgreements = useMemo(
    () => backableAgreements.filter((a) => selectedIds.has(a.id)),
    [backableAgreements, selectedIds],
  );

  const totalBacking = useMemo(
    () => selectedAgreements.reduce((acc, a) => acc + estimateBacking(a), 0n),
    [selectedAgreements],
  );

  const financierName = ovData?.financier.name ?? "LPDB Koperasi";

  function toggleAgreement(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (submitted) setSubmitted(false);
    tx.reset();
  }

  function handleAjukan() {
    if (selectedIds.size === 0 || tx.state !== "idle") return;
    // NOTE: maps to contract fn request_funding which is NOT yet built on-chain.
    // TODO: wire real Invocation: requestFunding(caller, backing_agreement_ids, amount).
    // In demo mode the builder is never called.
    tx.run(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (_signer: string): Invocation => ({ method: "request_funding", args: [] }),
    );
  }

  // Watch tx transition to success
  if (tx.state === "success" && !submitted) {
    setSubmitted(true);
  }

  const canSubmit = selectedIds.size > 0 && tx.state === "idle" && !submitted;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permintaan Dana Offtake"
        description="Ajukan talangan modal kerja ke pemodal dengan jaminan bukti offtake on-chain."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── LEFT: Agreement selector + summary ─────────────────────────── */}
        <div className="space-y-4">
          <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
            <CardHeader
              title="Pilih Perjanjian Offtake"
              description="Centang perjanjian yang akan dijadikan jaminan. Nilai jaminan adalah proyeksi sisa panen dikali HPP."
              action={<Coins size={18} className="text-amber-500" />}
            />
            <CardContent className="space-y-3">
              {/* Search within agreements */}
              <div className="flex h-11 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 focus-within:ring-2 focus-within:ring-ring">
                <Search size={13} className="shrink-0 text-gray-400" />
                <input
                  type="search"
                  placeholder="Cari petani atau komoditas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-full w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                />
              </div>

              {agrLoading && (
                <p className="py-4 text-center text-sm text-gray-400">
                  Memuat perjanjian...
                </p>
              )}

              {!agrLoading && filteredAgreements.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">
                  Tidak ada perjanjian yang dapat dijaminkan.
                </p>
              )}

              <ScrollArea maxHeight={320} fade>
                <div className="space-y-2 pr-1">
                  {filteredAgreements.map((a) => (
                    <AgreementRow
                      key={a.id}
                      agreement={a}
                      selected={selectedIds.has(a.id)}
                      onToggle={toggleAgreement}
                    />
                  ))}
                </div>
              </ScrollArea>

              {/* Quick select/deselect all */}
              {filteredAgreements.length > 0 && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds(new Set(filteredAgreements.map((a) => a.id)))
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-amber-700"
                  >
                    <Plus size={12} />
                    Pilih semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-600"
                  >
                    <Minus size={12} />
                    Hapus pilihan
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary + submit */}
          <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
            <CardHeader
              title="Ringkasan Permohonan"
              description={`Pemodal: ${ovLoading ? "..." : financierName}`}
            />
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Perjanjian dipilih</span>
                  <span className="font-semibold text-gray-900">{selectedIds.size}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total proyeksi panen</span>
                  <RupiahAmount smallest={totalBacking} className="text-sm font-bold text-amber-700" />
                </div>
              </div>

              {selectedIds.size === 0 && (
                <p className="text-xs text-gray-400">
                  Pilih setidaknya satu perjanjian untuk mengajukan dana.
                </p>
              )}

              {/* Success state */}
              {submitted && tx.txHash && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      Permintaan terkirim (demo mode).
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pemodal akan meninjau dan memberikan keputusan.
                    </p>
                  </div>
                  <TxHashLink hash={tx.txHash} />
                </div>
              )}

              <Button
                variant="primary"
                size="md"
                leftIcon={<Coins size={16} />}
                disabled={!canSubmit}
                onClick={handleAjukan}
                className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
              >
                {tx.state === "signing"
                  ? "Menandatangani..."
                  : tx.state === "submitting"
                    ? "Mengirim ke jaringan..."
                    : submitted
                      ? "Permintaan Terkirim"
                      : "Ajukan Dana"}
              </Button>

              {tx.state === "signing" && (
                <p className="text-xs text-gray-400 text-center">
                  Konfirmasi tanda tangan di Freighter. Jangan tutup jendela.
                </p>
              )}

              <p className="text-[11px] text-gray-400 leading-relaxed">
                Tindakan ini akan mencatat permohonan di blockchain Stellar sebagai bukti
                anti-manipulasi. Pembayaran kas dilakukan secara terpisah oleh pemodal setelah
                persetujuan.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: History table ────────────────────────────────────────── */}
        <div>
          <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
            <CardHeader
              title="Riwayat Permintaan Dana"
              description="Semua permohonan talangan yang pernah diajukan koperasi ini. Klik detail untuk melihat perjanjian yang dijaminkan."
            />
            <CardContent>
              <FundingHistoryTable />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
