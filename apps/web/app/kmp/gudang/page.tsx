"use client";

/** Screen F — Gudang dan Pasokan (PRD §8.1). Two clearly labeled zones:
 *  (1) Kargo masuk on-chain (aqua) — accept_supply double-confirmation gate.
 *  (2) Stok gudang DERIVED (off-chain) — auto-computed from real data, NOT hand-kept:
 *      - Saprotan received  = accepted agreement inputs.
 *      - Hasil panen        = deliveries in, logistik shipments out, balance = in - out.
 *      A logistik dispatch auto-reduces the harvest balance here. */

import {
  type ApiWarehouseSummary,
  fetchOverview,
  fetchWarehouseSummary,
} from "@/lib/api";
import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { type TxState, useTx } from "@/components/kmp/use-tx";
import { acceptSupply } from "@/lib/invocations";
import { useApi } from "@/lib/use-api";
import { formatKg } from "@/lib/mock-data";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  RupiahAmount,
  Skeleton,
  StatCard,
  TxHashLink,
} from "@annona/ui";
import type { ApiAgreement } from "@/lib/api";
import {
  ArrowUpFromLine,
  CheckCircle2,
  Database,
  Link as LinkIcon,
  Package,
  Search,
  Truck,
  Warehouse,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useEffect, useMemo, useRef, useState } from "react";

/** grams -> kg number */
const g2kg = (g: bigint): number => Number(g) / 1000;

function commodityLabel(code: string): string {
  return code === "GABAH" ? "Gabah Kering Panen" : code === "JAGUNG" ? "Jagung Pipilan" : code;
}

/** Single inbound-supply card for one SupplyDispatched agreement.
 *  Handles its own accept flow independently of sibling cards. */
function InboundCard({
  agreement,
  farmerName,
  isAnyProcessing,
  onAccept,
  state,
  isDone,
  doneTxHash,
}: {
  agreement: ApiAgreement;
  farmerName: string;
  isAnyProcessing: boolean;
  onAccept: () => void;
  state: TxState;
  isDone: boolean;
  doneTxHash: string | null;
}) {
  const isMine = state !== "idle" && !isDone;

  if (isDone) {
    return (
      <div className="rounded-2xl border border-cyan-150 bg-[#e7fafc]/45 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#0c6a78]" />
              <span className="font-bold text-gray-900">
                Perjanjian #{String(agreement.onchainId)}, {farmerName}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600 font-medium">
              Barang diterima. Utang saprotan{" "}
              <RupiahAmount smallest={agreement.inputDebt} className="text-sm font-bold text-gray-900" /> kini aktif sebagai
              kewajiban petani.
            </p>
          </div>
          {doneTxHash && <TxHashLink hash={doneTxHash} />}
        </div>
        <Alert tone="success" className="mt-4 rounded-xl">
          Status perjanjian berubah menjadi Berjalan. Gerbang konfirmasi ganda selesai: Supplier
          kirim, KMP terima. Utang saprotan mulai dihitung.
        </Alert>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-bold text-gray-900">
            Perjanjian #{String(agreement.onchainId)}, {farmerName}
          </p>
          <p className="mt-1 text-xs text-gray-500 font-semibold">
            {commodityLabel(agreement.commodityCode)}
          </p>
          <div className="mt-4 flex flex-wrap gap-6 text-sm font-bold text-gray-700">
            <div>
              <span className="text-gray-400 font-medium">Pokok Supplier: </span>
              <RupiahAmount smallest={agreement.basePriceSupplier} className="text-sm font-bold text-gray-900" />
            </div>
            <div>
              <span className="text-gray-400 font-medium">Utang petani jika diterima: </span>
              <RupiahAmount smallest={agreement.inputDebt} className="text-sm font-bold text-gray-900" />
            </div>
            <div>
              <span className="text-gray-400 font-medium">Perkiraan panen: </span>
              <span className="text-gray-900">{formatKg(agreement.expectedVolKg)}</span>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-gray-400 font-semibold">
            Tanggal pengiriman Supplier: {agreement.createdAt}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Button
            type="button"
            variant="accent"
            size="md"
            leftIcon={<Truck size={16} />}
            disabled={isAnyProcessing && !isMine}
            onClick={onAccept}
            className="rounded-full bg-[#0c6a78] hover:bg-[#0c6a78]/95 text-white"
          >
            {isMine && state === "signing"
              ? "Menandatangani..."
              : isMine && state === "submitting"
                ? "Mengirim ke chain..."
                : "Periksa dan Terima Barang"}
          </Button>
          {isMine && (
            <span className="text-xs text-amber-700 font-semibold">
              {state === "signing"
                ? "Konfirmasi di dompet Freighter"
                : "Menunggu konfirmasi Stellar"}
            </span>
          )}
        </div>
      </div>

      <Alert tone="info" className="mt-4 rounded-xl">
        Setelah diterima, utang saprotan petani menjadi kewajiban aktif. Tindakan ini mencatat
        konfirmasi fisik penerimaan barang oleh KMP di blockchain.
      </Alert>
    </div>
  );
}

export default function GudangPage() {
  const { t } = useI18n();
  const { data: overview } = useApi(fetchOverview);
  const inbound = overview?.inboundSupply ?? [];

  // One tx instance at a time; track which card is processing and which are done.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [doneMap, setDoneMap] = useState<Record<string, string>>({}); // agreementId -> txHash
  const txAccept = useTx();
  const prevState = useRef<TxState>("idle");

  useEffect(() => {
    const prev = prevState.current;
    prevState.current = txAccept.state;
    const hash = txAccept.txHash;
    if (prev !== "success" && txAccept.state === "success" && activeId && hash) {
      setDoneMap((m) => ({ ...m, [activeId]: hash }));
    }
  }, [txAccept.state, txAccept.txHash, activeId]);

  function handleAccept(id: string, onchainId: bigint) {
    if (txAccept.state !== "idle") return;
    setActiveId(id);
    txAccept.run((coop) => acceptSupply(coop, onchainId));
  }

  const isAnyProcessing = txAccept.state !== "idle" && txAccept.state !== "success";

  // Derived warehouse summary (auto from deliveries + shipments + inputs).
  const { data: summary, loading: summaryLoading, error: summaryError } =
    useApi<ApiWarehouseSummary>(fetchWarehouseSummary);
  const saprotan = summary?.saprotan ?? [];
  const hasilPanen = summary?.hasilPanen ?? [];

  const [stockSearch, setStockSearch] = useState("");
  const q = stockSearch.toLowerCase().trim();
  const filteredSaprotan = useMemo(
    () => (q ? saprotan.filter((s) => s.name.toLowerCase().includes(q)) : saprotan),
    [saprotan, q],
  );
  const filteredHasil = useMemo(
    () => (q ? hasilPanen.filter((h) => commodityLabel(h.commodityCode).toLowerCase().includes(q)) : hasilPanen),
    [hasilPanen, q],
  );

  // Stat strip totals.
  const totalReceivedKg = hasilPanen.reduce((s, h) => s + g2kg(h.receivedG), 0);
  const totalForwardedKg = hasilPanen.reduce((s, h) => s + g2kg(h.forwardedG), 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.kmp.gudang.title")} description={t("page.kmp.gudang.desc")} />

      {/* Summary stat strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("page.kmp.logistik.badge.inTransit")}
          value={String(inbound.length)}
          hint="Kiriman saprotan dari Supplier menunggu konfirmasi penerimaan"
          icon={<Truck size={18} />}
          tone={inbound.length > 0 ? "warn" : "good"}
        />
        <StatCard
          label={t("page.kmp.gudang.stats.totalStock")}
          value={`${totalReceivedKg.toLocaleString("id-ID")} kg`}
          hint="Total hasil panen yang diterima di gudang"
          icon={<Package size={18} />}
        />
        <StatCard
          label={t("page.kmp.gudang.stats.readyShip")}
          value={`${totalForwardedKg.toLocaleString("id-ID")} kg`}
          hint="Total yang sudah dikirim ke gudang Agrinas"
          icon={<ArrowUpFromLine size={18} />}
        />
      </div>

      {/* Zone 1: On-chain inbound supply */}
      <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
        <CardHeader
          title={t("page.kmp.gudang.title")}
          description="Barang dalam perjalanan menunggu konfirmasi penerimaan fisik. Konfirmasi Anda mengaktifkan utang saprotan petani."
          action={
            <span className="flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-150/40 px-3 py-0.5 text-xs font-bold text-[#0c6a78] uppercase">
              <LinkIcon size={11} />
              On-chain
            </span>
          }
          className="pb-3"
        />
        <CardContent className="space-y-4 pt-3">
          {inbound.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-150 py-10 text-center text-sm text-gray-500 font-semibold bg-gray-50/30">
              Tidak ada kiriman saprotan yang sedang menunggu konfirmasi.
            </div>
          ) : (
            inbound.map((a) => (
              <InboundCard
                key={a.id}
                agreement={a}
                farmerName={a.farmerName}
                isAnyProcessing={isAnyProcessing}
                onAccept={() => handleAccept(a.id, a.onchainId)}
                state={activeId === a.id ? txAccept.state : "idle"}
                isDone={!!doneMap[a.id]}
                doneTxHash={doneMap[a.id] ?? null}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Zone 2: Derived off-chain stock */}
      <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
        <CardHeader
          title={t("page.kmp.gudang.title")}
          description="Stok dihitung otomatis dari data nyata: saprotan diterima dari perjanjian, hasil panen dari setoran petani dikurangi yang sudah diteruskan lewat Logistik."
          action={
            <Badge tone="neutral" icon={<Database size={11} />} className="rounded-full font-bold">
              {t("page.kmp.gudang.label.offChain")}
            </Badge>
          }
          className="pb-3"
        />
        <CardContent className="space-y-6 p-0 pb-4 pt-3">
          <div className="mx-5">
            <Alert tone="info" title="Dihitung otomatis (off-chain)" className="rounded-xl">
              Angka di bawah bukan input manual. Saprotan diakumulasi dari perjanjian yang sudah
              diterima; hasil panen = total setoran dikurangi yang sudah dikirim ke gudang Agrinas
              di menu Logistik. Mengirim lewat Logistik otomatis mengurangi sisa di gudang.
            </Alert>
          </div>

          <div className="mx-5">
            <div className="flex h-11 w-full max-w-xs items-center gap-2.5 rounded-2xl border border-gray-150 bg-white px-3.5 shadow-sm focus-within:ring-2 focus-within:ring-ring">
              <Search size={15} className="shrink-0 text-gray-400" />
              <input
                type="search"
                placeholder="Cari nama barang..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="h-full w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 font-semibold"
              />
            </div>
          </div>

          {summaryLoading ? (
            <div className="mx-5 space-y-2">
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          ) : null}

          {summaryError ? (
            <div className="mx-5">
              <Alert tone="warning" className="rounded-xl text-sm">{summaryError}</Alert>
            </div>
          ) : null}

          {/* Saprotan (derived) */}
          {!summaryLoading ? (
            <div>
              <div className="flex items-center gap-2 border-b border-gray-100 bg-[#ebf5e9]/30 px-5 py-4">
                <Warehouse size={15} className="text-emerald-700" />
                <span className="text-sm font-bold text-gray-900">{t("page.kmp.gudang.zone.saprotan")}</span>
                <Badge tone="verdant" className="rounded-full">Pertanian</Badge>
              </div>
              <TableFrame className="border-0 shadow-none rounded-none overflow-visible">
                <Table>
                  <THead>
                    <Th>Barang</Th>
                    <Th>Kategori</Th>
                    <Th className="text-right">Diterima</Th>
                  </THead>
                  <TBody>
                    {filteredSaprotan.length > 0 ? (
                      filteredSaprotan.map((s) => (
                        <Tr key={`${s.name}-${s.category}`}>
                          <Td className="font-bold text-gray-900">{s.name}</Td>
                          <Td className="text-gray-500 font-medium capitalize">{s.category}</Td>
                          <Td className="text-right tabular-nums font-bold text-emerald-800">
                            {Number(s.qty).toLocaleString("id-ID")} {s.unit}
                          </Td>
                        </Tr>
                      ))
                    ) : (
                      <Tr>
                        <Td colSpan={3} className="py-6 text-center text-gray-450 font-medium">
                          {q ? "Tidak ada barang saprotan yang cocok." : "Belum ada saprotan diterima."}
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
              </TableFrame>
            </div>
          ) : null}

          {/* Hasil panen (derived: in - out = balance) */}
          {!summaryLoading ? (
            <div>
              <div className="flex items-center gap-2 border-b border-gray-100 bg-cyan-50/20 px-5 py-4">
                <Warehouse size={15} className="text-[#0c6a78]" />
                <span className="text-sm font-bold text-gray-900">Hasil Panen</span>
                <Badge tone="aqua" className="rounded-full">Diteruskan ke Gudang Agrinas</Badge>
              </div>
              <TableFrame className="border-0 shadow-none rounded-none overflow-visible">
                <Table>
                  <THead>
                    <Th>Komoditas</Th>
                    <Th className="text-right">Diterima</Th>
                    <Th className="text-right">Diteruskan</Th>
                    <Th className="text-right">Sisa di Gudang</Th>
                  </THead>
                  <TBody>
                    {filteredHasil.length > 0 ? (
                      filteredHasil.map((h) => {
                        const balance = g2kg(h.balanceG);
                        return (
                          <Tr key={h.commodityCode}>
                            <Td className="font-bold text-gray-900">{commodityLabel(h.commodityCode)}</Td>
                            <Td className="text-right tabular-nums text-gray-500 font-medium">
                              {g2kg(h.receivedG).toLocaleString("id-ID")} kg
                            </Td>
                            <Td className="text-right tabular-nums text-gray-500 font-medium">
                              {g2kg(h.forwardedG).toLocaleString("id-ID")} kg
                            </Td>
                            <Td className="text-right tabular-nums">
                              <span className={balance <= 0 ? "text-gray-400 font-medium" : "font-bold text-[#0c6a78]"}>
                                {balance.toLocaleString("id-ID")} kg
                              </span>
                            </Td>
                          </Tr>
                        );
                      })
                    ) : (
                      <Tr>
                        <Td colSpan={4} className="py-6 text-center text-gray-450 font-medium">
                          {q ? "Tidak ada hasil panen yang cocok." : "Belum ada hasil panen diterima."}
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
              </TableFrame>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
