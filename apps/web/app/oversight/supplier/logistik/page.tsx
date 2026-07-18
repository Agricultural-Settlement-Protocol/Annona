"use client";

/**
 * Logistik Saprotan (Supplier view) — saprotan dispatch desk, LIVE.
 *
 * Queue = GET /logistics/dispatch-queue: agreements the KMP submitted
 * ("Kirim Permintaan Gabungan" -> supply_requested_at) that are still
 * chain-status Created — the ONLY state dispatch_supply accepts, so a queue
 * card can never hit contract InvalidStatus (#3). Dispatch signs
 * dispatch_supply(onchainId) via useTx (server-signed, Supplier role).
 * History = GET /logistics/dispatch-history: on-chain SupplyDispatched /
 * SupplyAccepted events joined to their agreements. No mock data anywhere.
 * No em dashes.
 */

import { OversightPageHeader } from "@/components/oversight/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { ScrollArea } from "@/components/scroll-area";
import { useTx } from "@/components/kmp/use-tx";
import { dispatchSupply } from "@/lib/invocations";
import {
  type ApiDispatchHistoryItem,
  type ApiDispatchQueueItem,
  fetchDispatchHistory,
  fetchDispatchQueue,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  RupiahAmount,
  StatCard,
  TxHashLink,
} from "@annona/ui";
import {
  ArrowRight,
  CheckCircle2,
  Package,
  Send,
  Truck,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useEffect, useMemo, useRef, useState } from "react";

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return iso.slice(0, 10);
}

// ─── Dispatch request card (one agreement = one dispatch_supply) ──────────────

function DispatchCard({
  item,
  onDispatched,
}: {
  item: ApiDispatchQueueItem;
  onDispatched: (agreementId: string, txHash: string) => void;
}) {
  const { t } = useI18n();
  const tx = useTx();
  const prevState = useRef(tx.state);

  function handleDispatch() {
    tx.run((signer) => dispatchSupply(signer, item.onchainId));
  }

  useEffect(() => {
    const prev = prevState.current;
    prevState.current = tx.state;
    if (prev !== "success" && tx.state === "success" && tx.txHash) {
      onDispatched(item.agreementId, tx.txHash);
      tx.reset();
    }
  }, [tx.state, tx.txHash, item.agreementId, onDispatched, tx]);

  const expectedKg = Number(item.expectedVolG / 1000n);

  return (
    <div className="flex flex-col rounded-[14px] border border-aqua-200 bg-aqua-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">
            Perjanjian #{String(item.onchainId)}, {item.farmerName}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.coopName}, {item.kabupaten}. Diminta {fmtDate(item.supplyRequestedAt)}.
          </p>
        </div>
        <Badge tone="aqua">{t("page.oversight.supplier.logistik.pending")}</Badge>
      </div>

      <div className="mt-4 flex-1 space-y-2">
        {item.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Rincian barang tidak tersedia untuk perjanjian ini.
          </p>
        ) : (
          item.items.map((line) => (
            <div
              key={`${item.agreementId}-${line.name}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="text-foreground">
                {line.name}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {line.qty} {line.unitLabel}
                </span>
              </span>
              <RupiahAmount smallest={line.lineTotalPrincipal} className="text-sm tabular-nums" />
            </div>
          ))
        )}
        <div className="flex items-center justify-between border-t border-aqua-200 pt-2 text-sm font-semibold">
          <span>{t("page.oversight.supplier.logistik.card.total")}</span>
          <RupiahAmount smallest={item.basePriceSupplier} className="text-sm font-bold tabular-nums" />
        </div>
        <p className="text-xs text-muted-foreground">
          Perkiraan panen {expectedKg.toLocaleString("id-ID")} kg {item.commodityCode}.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <Button
          variant="accent"
          size="sm"
          leftIcon={<Send size={13} />}
          disabled={tx.state !== "idle"}
          onClick={handleDispatch}
          className="w-full"
        >
          {tx.state === "signing"
            ? "Menandatangani..."
            : tx.state === "submitting"
              ? "Mencatat di Stellar..."
              : t("page.oversight.supplier.logistik.dispatch")}
        </Button>
        {tx.error && (
          <Alert tone="warning" title={t("common.error")}>
            {tx.error}
          </Alert>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LogistikPage() {
  const { t } = useI18n();
  const {
    data,
    loading,
    error,
    refetch,
  } = useApi(() => Promise.all([fetchDispatchQueue(), fetchDispatchHistory()]), []);
  const queue = useMemo(() => data?.[0] ?? [], [data]);
  const history = useMemo(() => data?.[1] ?? [], [data]);

  // Locally hide freshly-dispatched cards until the indexer catches up.
  const [dispatchedMap, setDispatchedMap] = useState<Record<string, string>>({});
  const [historySearch, setHistorySearch] = useState<string>("");

  const pending = queue.filter((q) => !dispatchedMap[q.agreementId]);
  const dispatchedCount = Object.keys(dispatchedMap).length;

  const filteredHistory = useMemo(() => {
    const q = historySearch.toLowerCase();
    if (!q) return history;
    return history.filter(
      (r) =>
        r.coopName.toLowerCase().includes(q) ||
        r.farmerName.toLowerCase().includes(q) ||
        (r.dispatchTxHash ?? "").toLowerCase().includes(q),
    );
  }, [history, historySearch]);

  const totalPending = pending.reduce((s, r) => s + r.basePriceSupplier, 0n);

  return (
    <div className="space-y-8">
      <OversightPageHeader
        title={t("page.oversight.supplier.logistik.title")}
        description={t("page.oversight.supplier.logistik.desc")}
      />

      {loading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
      {error && (
        <Alert tone="warning" title={t("common.error")}>
          {error}
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t("page.oversight.supplier.logistik.pending")}
          value={String(pending.length)}
          hint="Permintaan KMP menunggu dispatch"
          tone={pending.length > 0 ? "warn" : "good"}
          icon={<Truck size={18} />}
        />
        <StatCard
          label={t("page.oversight.supplier.logistik.totalValue")}
          value={<RupiahAmount smallest={totalPending} className="text-3xl" />}
          hint="Nilai pokok menunggu dispatch"
          tone={totalPending > 0n ? "warn" : "good"}
          icon={<Package size={18} />}
        />
        <StatCard
          label={t("page.oversight.supplier.logistik.dispatch")}
          value={String(dispatchedCount)}
          hint="Dispatch sesi ini"
          tone={dispatchedCount > 0 ? "good" : "neutral"}
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label={t("page.oversight.supplier.logistik.dispatched")}
          value={String(history.length)}
          hint="Total riwayat dispatch on-chain"
          icon={<Send size={18} />}
        />
      </div>

      {/* Success banner */}
      {dispatchedCount > 0 && (
        <Alert tone="success" title="Dispatch tercatat di Stellar">
          <span className="text-sm">
            Koperasi akan melihat kiriman di menu Gudang dan mengkonfirmasi penerimaan
            (accept_supply).
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.values(dispatchedMap).map((hash) => (
              <TxHashLink key={hash} hash={hash} />
            ))}
          </div>
        </Alert>
      )}

      {/* Pending request cards */}
      <div>
        <div className="mb-4">
          <p className="font-semibold text-foreground">
            {t("page.oversight.supplier.logistik.pending")}
          </p>
          <p className="text-xs text-muted-foreground">
            Satu kartu = satu perjanjian = satu transaksi dispatch_supply.
          </p>
        </div>

        {pending.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-border py-12 text-center">
            <CheckCircle2 size={36} className="mb-3 text-emerald-500" />
            <p className="font-medium text-foreground">{t("common.noData")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tidak ada permintaan saprotan yang menunggu dispatch.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((item) => (
              <DispatchCard
                key={item.agreementId}
                item={item}
                onDispatched={(agreementId, txHash) => {
                  setDispatchedMap((prev) => ({ ...prev, [agreementId]: txHash }));
                  // Refresh so the row moves to Riwayat once indexed.
                  setTimeout(() => refetch(), 6000);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Riwayat Dispatch */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-foreground">
            {t("page.oversight.supplier.logistik.dispatched")}
          </p>
          <div className="relative w-64">
            <input
              type="text"
              placeholder={t("common.search")}
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface py-1.5 pl-3 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <ScrollArea maxHeight={420}>
              <TableFrame>
                <Table>
                  <THead>
                    <Th>{t("common.date")}</Th>
                    <Th>Perjanjian</Th>
                    <Th>{t("page.oversight.supplier.logistik.card.coop")}</Th>
                    <Th className="text-right">{t("page.oversight.supplier.logistik.card.total")}</Th>
                    <Th>{t("common.status")}</Th>
                    <Th>Tgl Diterima</Th>
                    <Th>Tx</Th>
                  </THead>
                  <TBody>
                    {filteredHistory.length === 0 ? (
                      <Tr>
                        <Td colSpan={7} className="py-8 text-center text-muted-foreground">
                          Belum ada riwayat dispatch.
                        </Td>
                      </Tr>
                    ) : (
                      filteredHistory.map((row) => (
                        <Tr key={row.agreementId}>
                          <Td className="text-xs text-muted-foreground whitespace-nowrap">
                            {fmtDate(row.dispatchedAt)}
                          </Td>
                          <Td className="font-medium">
                            #{String(row.onchainId)}, {row.farmerName}
                          </Td>
                          <Td className="text-xs text-muted-foreground">
                            {row.coopName}, {row.kabupaten}
                          </Td>
                          <Td className="text-right">
                            <RupiahAmount
                              smallest={row.basePriceSupplier}
                              className="text-sm tabular-nums"
                            />
                          </Td>
                          <Td>
                            <Badge tone={row.received ? "success" : "aqua"}>
                              {row.received ? "Diterima KMP" : "Dalam Perjalanan"}
                            </Badge>
                          </Td>
                          <Td className="text-xs text-muted-foreground whitespace-nowrap">
                            {fmtDate(row.acceptedAt)}
                          </Td>
                          <Td>
                            {row.dispatchTxHash ? (
                              <TxHashLink hash={row.dispatchTxHash} />
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
          </CardContent>
        </Card>
      </div>

      {/* Cara Kerja Dispatch */}
      <Card>
        <CardHeader
          title={t("page.oversight.supplier.logistik.explanation.title")}
          description={t("page.oversight.supplier.logistik.desc")}
        />
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {(
              [
                {
                  step: 1,
                  title: "Permintaan dari KMP",
                  desc: "KMP mengirim permintaan gabungan saprotan dari perjanjian yang baru dibuat. Antrean ini muncul otomatis di sini.",
                },
                {
                  step: 2,
                  title: "Supplier Dispatch",
                  desc: "Operator Supplier menekan Dispatch. Transaksi dispatch_supply dicatat di Stellar testnet dan status perjanjian menjadi Dalam Pengiriman.",
                },
                {
                  step: 3,
                  title: "KMP Konfirmasi (accept_supply)",
                  desc: "Petugas KMP mengkonfirmasi penerimaan fisik saprotan di menu Gudang. Transaksi accept_supply mengaktifkan utang petani sesuai perjanjian.",
                },
              ] as const
            ).map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aqua-100 text-sm font-bold text-aqua-700">
                  {step}
                </div>
                <div>
                  <p className="font-medium text-foreground">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                  {step < 3 && (
                    <ArrowRight size={14} className="mt-2 hidden text-muted-foreground sm:block" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
