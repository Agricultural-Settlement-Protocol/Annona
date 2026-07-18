"use client";

/** Screen: Permintaan Saprotan — the bulk-request desk.
 *  KMP aggregates Created agreements into a single bulk request to the
 *  Supplier. This submit is deliberately OFF-CHAIN (the next on-chain event is
 *  dispatch_supply, Supplier-signed): it persists agreement.supply_requested_at
 *  via POST /agreements/supply-request, so the Terkirim status survives
 *  refresh and feeds the Supplier's live dispatch queue. */

import {
  type ApiAgreement,
  type ApiAgreementInput,
  type ApiCatalogItem,
  fetchCatalog,
  fetchFarmers,
  fetchOverview,
  farmerMap,
  submitSupplyRequest,
} from "@/lib/api";
import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { getSupabase } from "@/lib/supabase";
import { useApi } from "@/lib/use-api";
import { formatRupiah } from "@annona/core";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  RupiahAmount,
  StatCard,
} from "@annona/ui";
import {
  CheckCircle2,
  ClipboardList,
  Download,
  Link as LinkIcon,
  Package,
  Search,
  Send,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useEffect, useMemo, useState } from "react";

type SupplyRequestStatus = "Draft" | "Terkirim" | "Dikirim" | "Diterima";
type SupplyAgreement = ApiAgreement & { inputs: ApiAgreementInput[] };
type EffectiveRow = {
  agreement: SupplyAgreement;
  farmerId: string;
  farmerName: string;
  kecamatan: string;
  effectiveStatus: SupplyRequestStatus;
};
type CatalogMap = Map<string, ApiCatalogItem>;

// ─── Status badge helper ─────────────────────────────────────────────────────

function RequestStatusBadge({ status }: { status: SupplyRequestStatus }) {
  if (status === "Draft")
    return <Badge tone="neutral" className="rounded-full font-bold">Draf</Badge>;
  if (status === "Terkirim")
    return <Badge tone="aqua" className="rounded-full font-bold">Terkirim ke Supplier</Badge>;
  if (status === "Dikirim")
    return <Badge tone="aqua" className="rounded-full font-bold">Dalam Pengiriman</Badge>;
  // Diterima
  return <Badge tone="success" className="rounded-full font-bold">Diterima</Badge>;
}

// ─── Compact item summary helper ────────────────────────────────────────────

function compactItems(agreement: SupplyAgreement, catalog: CatalogMap): string {
  const parts = agreement.inputs.map((inp) => {
    const item = catalog.get(inp.catalogId);
    const shortName = item ? item.name.replace(/\s*\d+.*$/, "").trim() : inp.catalogId;
    return `${inp.qty}x ${shortName}`;
  });
  return parts.join(", ");
}

/** Sum saprotan input baskets across the given agreements, grouped by catalog item. */
function aggregateSaprotan(
  agreements: SupplyAgreement[],
  catalog: CatalogMap,
): { item: ApiCatalogItem; qty: number; principal: bigint }[] {
  const acc = new Map<string, { item: ApiCatalogItem; qty: number; principal: bigint }>();
  for (const a of agreements) {
    for (const inp of a.inputs) {
      const item = catalog.get(inp.catalogId);
      if (!item) continue;
      const cur = acc.get(inp.catalogId) ?? { item, qty: 0, principal: 0n };
      cur.qty += inp.qty;
      cur.principal += inp.lineTotalPrincipal;
      acc.set(inp.catalogId, cur);
    }
  }
  return [...acc.values()];
}

// ─── CSV export ──────────────────────────────────────────────────────────────

function buildCsv(rows: EffectiveRow[], catalog: CatalogMap): string {
  const headers = ["Petani", "No. Perjanjian", "Rincian Barang", "Nilai Pokok (Rp)", "Perkiraan Panen", "Status"];
  const lines = rows.map((r) => {
    const items = compactItems(r.agreement, catalog);
    const principal = formatRupiah(r.agreement.basePriceSupplier);
    return [
      r.farmerName,
      `#${String(r.agreement.onchainId)}`,
      items,
      principal,
      r.agreement.expectedHarvestDate ?? "",
      r.effectiveStatus,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [headers.join(","), ...lines].join("\n");
}

function downloadCsv(rows: EffectiveRow[], catalog: CatalogMap) {
  const csv = buildCsv(rows, catalog);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `permintaan-saprotan-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PermintaanPage() {
  const { t } = useI18n();
  const { data, loading, error } = useApi(
    () => Promise.all([fetchOverview(), fetchCatalog(), fetchFarmers()]),
    [],
  );
  const catalog: CatalogMap = useMemo(
    () => new Map((data?.[1] ?? []).map((c) => [c.id, c])),
    [data],
  );
  const fmap = useMemo(() => farmerMap(data?.[2] ?? []), [data]);

  // Base rows from the live /overview supply-request queue (with input baskets).
  const baseRows = useMemo(
    () =>
      (data?.[0].supplyRequestRows ?? []).map((r) => ({
        agreement: r.agreement,
        farmerId: r.farmerId,
        farmerName: r.farmerName,
        kecamatan: fmap.get(r.farmerId)?.kecamatan ?? "",
        status: r.status as SupplyRequestStatus,
      })),
    [data, fmap],
  );

  // Local state: set of agreementIds that have been submitted (flipped to Terkirim)
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  // Effective rows with local-state override
  const rows: EffectiveRow[] = useMemo(
    () =>
      baseRows.map((r) => ({
        ...r,
        effectiveStatus: (submittedIds.has(r.agreement.id) ? "Terkirim" : r.status) as SupplyRequestStatus,
      })),
    [baseRows, submittedIds],
  );

  // Search filter
  const [search, setSearch] = useState("");
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.farmerName.toLowerCase().includes(q));
  }, [rows, search]);

  // Checkbox selection (only Draft rows are selectable)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sync out de-selected if they become non-Draft
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of prev) {
        const row = rows.find((r) => r.agreement.id === id);
        if (!row || row.effectiveStatus !== "Draft") next.delete(id);
      }
      return next;
    });
  }, [rows]);

  const draftRows = filteredRows.filter((r) => r.effectiveStatus === "Draft");
  const allDraftSelected = draftRows.length > 0 && draftRows.every((r) => selectedIds.has(r.agreement.id));

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allDraftSelected) {
        for (const r of draftRows) next.delete(r.agreement.id);
      } else {
        for (const r of draftRows) next.add(r.agreement.id);
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Aggregation panel: selected Draft rows, fallback to all Draft rows
  const aggregationSource = useMemo(() => {
    const selDraft = rows.filter((r) => selectedIds.has(r.agreement.id) && r.effectiveStatus === "Draft");
    const allDraft = rows.filter((r) => r.effectiveStatus === "Draft");
    return selDraft.length > 0 ? selDraft : allDraft;
  }, [rows, selectedIds]);

  const aggregated = useMemo(
    () => aggregateSaprotan(aggregationSource.map((r) => r.agreement), catalog),
    [aggregationSource, catalog],
  );

  const grandTotal = useMemo(
    () => aggregated.reduce((sum, a) => sum + a.principal, 0n),
    [aggregated],
  );

  // Stat counts
  const countDraft = rows.filter((r) => r.effectiveStatus === "Draft").length;
  const countTerkirim = rows.filter((r) => r.effectiveStatus === "Terkirim").length;
  const countDikirim = rows.filter((r) => r.effectiveStatus === "Dikirim").length;
  const countDiterima = rows.filter((r) => r.effectiveStatus === "Diterima").length;

  // Bulk submit — persisted OFF-CHAIN via the API (no tx, no wallet).
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleBulkSubmit() {
    if (submitState !== "idle" || selectedIds.size === 0) return;
    setShowSuccess(false);
    setSubmitError(null);
    setSubmitState("submitting");
    try {
      const {
        data: { session },
      } = await getSupabase().auth.getSession();
      if (!session) throw new Error("Sesi berakhir. Silakan masuk kembali.");
      const ids = [...selectedIds];
      const result = await submitSupplyRequest(ids, session.access_token);
      // Flip the persisted rows locally too, so the UI updates without refetch.
      setSubmittedIds((prev) => {
        const next = new Set(prev);
        for (const id of result.submitted) next.add(id);
        return next;
      });
      setSelectedIds(new Set());
      setShowSuccess(true);
      setSubmitState("idle");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
      setSubmitState("idle");
    }
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.kmp.permintaan.title")}
        description={t("page.kmp.permintaan.desc")}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={() => downloadCsv(filteredRows, catalog)}
          >
            {t("common.export")}
          </Button>
        }
      />

      {loading && (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      )}
      {error && (
        <Alert tone="warning" title={t("common.error")}>
          {error}
        </Alert>
      )}

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t("common.all")}
          value={String(countDraft)}
          hint={t("page.kmp.permintaan.open")}
          icon={<ClipboardList size={18} />}
          tone="neutral"
        />
        <StatCard
          label={t("page.kmp.permintaan.ready")}
          value={String(countTerkirim)}
          hint="Menunggu pengiriman Supplier"
          icon={<Send size={18} />}
          tone={countTerkirim > 0 ? "good" : "neutral"}
        />
        <StatCard
          label={t("page.kmp.logistik.badge.inTransit")}
          value={String(countDikirim)}
          hint="Saprotan sedang dikirim"
          icon={<Truck size={18} />}
          tone={countDikirim > 0 ? "good" : "neutral"}
        />
        <StatCard
          label={t("page.kmp.logistik.badge.delivered")}
          value={String(countDiterima)}
          hint="Sudah diterima oleh KMP"
          icon={<CheckCircle2 size={18} />}
          tone={countDiterima > 0 ? "good" : "neutral"}
        />
      </div>

      {/* Success alert from last bulk submit */}
      {showSuccess && (
        <Alert tone="success" title="Permintaan gabungan terkirim ke Supplier" className="rounded-xl">
          Supplier melihat antrean ini di dasbor operatornya dan akan melakukan dispatch on-chain.
          Tidak perlu email atau berkas manual.
        </Alert>
      )}
      {submitError && (
        <Alert tone="warning" title={t("common.error")} className="rounded-xl">
          {submitError}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main table + bulk bar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search bar */}
          <div className="flex h-12 w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring">
            <Search size={15} className="shrink-0 text-gray-400" />
            <input
              type="search"
              placeholder="Cari nama petani..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-full w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 font-semibold"
            />
          </div>

          <TableFrame>
            <Table>
              <THead>
                <Th className="w-10">
                  <input
                    type="checkbox"
                    checked={allDraftSelected}
                    onChange={toggleAll}
                    aria-label="Pilih semua draf"
                    className="h-4 w-4 rounded border-gray-300 text-primary accent-primary"
                  />
                </Th>
                <Th>{t("page.kmp.permintaan.table.col.farmer")}</Th>
                <Th>{t("page.kmp.permintaan.table.col.commodity")}</Th>
                <Th>{t("page.kmp.permintaan.table.col.items")}</Th>
                <Th className="text-right">{t("common.amount")}</Th>
                <Th>{t("page.kmp.permintaan.table.col.volume")}</Th>
                <Th>{t("page.kmp.permintaan.table.col.status")}</Th>
              </THead>
              <TBody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500 font-semibold">
                      Tidak ada permintaan yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const isDraft = r.effectiveStatus === "Draft";
                    const checked = selectedIds.has(r.agreement.id);
                    return (
                      <Tr key={r.agreement.id} className={checked ? "bg-[#ebf5e9]/55" : undefined}>
                        <Td>
                          {isDraft ? (
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRow(r.agreement.id)}
                              aria-label={`Pilih perjanjian ${r.farmerName}`}
                              className="h-4 w-4 rounded border-border text-primary accent-primary"
                            />
                          ) : (
                            <span className="inline-block h-4 w-4" />
                          )}
                        </Td>
                        <Td>
                          <p className="font-medium text-foreground">{r.farmerName}</p>
                          <p className="text-xs text-muted-foreground">{r.kecamatan}</p>
                        </Td>
                        <Td>
                          <Link
                            href={`/kmp/perjanjian/${r.agreement.id}`}
                            className="font-mono text-xs font-bold text-[#0c6a78] hover:underline"
                          >
                            #{String(r.agreement.onchainId)}
                          </Link>
                        </Td>
                        <Td>
                          <span className="text-xs text-muted-foreground">
                            {compactItems(r.agreement, catalog)}
                          </span>
                        </Td>
                        <Td className="text-right font-bold text-gray-900">
                          <RupiahAmount smallest={r.agreement.basePriceSupplier} className="text-sm" />
                        </Td>
                        <Td className="text-gray-500 font-semibold text-sm">
                          {r.agreement.expectedHarvestDate}
                        </Td>
                        <Td>
                          <RequestStatusBadge status={r.effectiveStatus} />
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </TBody>
            </Table>
          </TableFrame>

          {/* Explainer strip */}
          <div className="rounded-2xl border border-gray-100 bg-[#ebf5e9]/20 px-5 py-4 text-sm text-gray-600 font-medium leading-relaxed">
            <span className="font-bold text-gray-900">Alur selanjutnya:</span> Setelah Supplier
            mengirim saprotan, kargo muncul di{" "}
            <Link href="/kmp/gudang" className="text-[#0c6a78] font-bold hover:underline">
              Gudang dan Pasokan
            </Link>{" "}
            untuk dikonfirmasi penerimaannya.
          </div>
        </div>

        {/* Aggregation panel + bulk submit */}
        <div className="lg:col-span-1">
          <div className="space-y-4 lg:sticky lg:top-6">
            <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
              <CardHeader
                title={t("page.kmp.permintaan.totalRequested")}
                description={
                  selectedCount > 0
                    ? `Dari ${selectedCount} draf dipilih`
                    : t("page.kmp.permintaan.send.empty")
                }
                action={<Package size={18} className="text-emerald-700" />}
                className="pb-3"
              />
              <CardContent className="space-y-3 pt-3">
                {aggregated.length === 0 ? (
                    <p className="text-sm text-gray-500 font-semibold">{t("page.kmp.permintaan.history.empty")}</p>
                ) : (
                  <>
                    {aggregated.map(({ item, qty, principal }) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{qty} unit</p>
                        </div>
                        <RupiahAmount smallest={principal} className="shrink-0 text-sm font-bold text-gray-900" />
                      </div>
                    ))}

                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                      <span className="text-sm font-bold text-gray-900">{t("page.kmp.permintaan.totalValue")}</span>
                      <RupiahAmount smallest={grandTotal} className="text-base font-bold text-gray-950" />
                    </div>

                    <div className="flex w-fit items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-150/40 px-3 py-1 text-xs font-bold text-[#0c6a78]">
                      <LinkIcon size={10} />
                      Nilai dikunci saat submit ke Supplier
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Bulk submit */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full rounded-full bg-primary-dark hover:bg-opacity-95 text-white py-3 font-semibold shadow-sm"
                leftIcon={<Send size={16} />}
                disabled={selectedCount === 0 || submitState !== "idle"}
                onClick={handleBulkSubmit}
              >
                {submitState === "submitting"
                  ? "Mengirim ke Supplier..."
                  : selectedCount > 0
                    ? `${t("page.kmp.permintaan.send")} (${selectedCount})`
                    : t("page.kmp.permintaan.send")}
              </Button>
              <p className="text-center text-xs text-gray-505 font-semibold leading-relaxed">
                {selectedCount > 0
                  ? "Permintaan tersimpan dan langsung terlihat oleh Supplier."
                  : "Pilih draf pada tabel untuk mengirim permintaan gabungan."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
