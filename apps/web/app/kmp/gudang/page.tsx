"use client";

/** Screen F — Gudang dan Pasokan (PRD §8.1). Two clearly labeled zones:
 *  (1) Kargo masuk on-chain (aqua) — accept_supply double-confirmation gate.
 *  (2) Stok off-chain (muted badge) — local inventory log, not blockchain. */

import { type ApiAgreement, fetchOverview } from "@/lib/api";
import { PageHeader } from "@/components/kmp/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { type TxState, useTx } from "@/components/kmp/use-tx";
import { acceptSupply } from "@/lib/invocations";
import { useApi } from "@/lib/use-api";
import { MOCK_STOCK, formatKg } from "@/lib/mock-data";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  RupiahAmount,
  StatCard,
  TxHashLink,
} from "@annona/ui";
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
import { useEffect, useMemo, useRef, useState } from "react";

/** Parse a string like "19.150 kg" or "4.580 kg" to a number (ID locale: dots = thousands). */
function parseKgQty(qty: string): number {
  const clean = qty.replace(/\./g, "").replace(/[^0-9]/g, "");
  return clean ? Number(clean) : 0;
}

/** Single inbound-supply card for one SupplyDispatched agreement.
 *  Handles its own accept flow independently of sibling cards. */
function InboundCard({
  agreement,
  farmerName,
  isAnyProcessing,
  onAccept,
  state,
  txHash,
  isDone,
  doneTxHash,
}: {
  agreement: ApiAgreement;
  farmerName: string;
  isAnyProcessing: boolean;
  onAccept: () => void;
  state: TxState;
  txHash: string | null;
  isDone: boolean;
  doneTxHash: string | null;
}) {
  const isMine = state !== "idle" && !isDone;

  if (isDone) {
    return (
      <div className="rounded-lg border border-aqua-200 bg-aqua-50/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span className="font-semibold text-foreground">
                Perjanjian #{String(agreement.onchainId)}, {farmerName}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Barang diterima. Utang saprotan{" "}
              <RupiahAmount smallest={agreement.inputDebt} className="text-sm" /> kini aktif sebagai
              kewajiban petani.
            </p>
          </div>
          {doneTxHash && <TxHashLink hash={doneTxHash} />}
        </div>
        <Alert tone="success" className="mt-4">
          Status perjanjian berubah menjadi Berjalan. Gerbang konfirmasi ganda selesai: Agrinas
          kirim, KMP terima. Utang saprotan mulai dihitung.
        </Alert>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">
            Perjanjian #{String(agreement.onchainId)}, {farmerName}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {agreement.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan"}
          </p>
          <div className="mt-3 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Pokok Agrinas: </span>
              <RupiahAmount smallest={agreement.basePriceAgrinas} className="text-sm" />
            </div>
            <div>
              <span className="text-muted-foreground">Utang petani jika diterima: </span>
              <RupiahAmount smallest={agreement.inputDebt} className="text-sm" />
            </div>
            <div>
              <span className="text-muted-foreground">Perkiraan panen: </span>
              <span>{formatKg(agreement.expectedVolKg)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Tanggal pengiriman Agrinas: {agreement.createdAt}
          </p>
        </div>

        {/* Accept button */}
        <div className="flex flex-col items-end gap-2">
          <Button
            variant="accent"
            size="md"
            leftIcon={<Truck size={16} />}
            disabled={isAnyProcessing && !isMine}
            onClick={onAccept}
          >
            {isMine && state === "signing"
              ? "Menandatangani..."
              : isMine && state === "submitting"
                ? "Mengirim ke chain..."
                : "Periksa dan Terima Barang"}
          </Button>
          {isMine && (
            <span className="text-xs text-muted-foreground">
              {state === "signing"
                ? "Konfirmasi di dompet Freighter"
                : "Menunggu konfirmasi Stellar"}
            </span>
          )}
        </div>
      </div>

      <Alert tone="info" className="mt-4">
        Setelah diterima, utang saprotan petani menjadi kewajiban aktif. Tindakan ini mencatat
        konfirmasi fisik penerimaan barang oleh KMP di blockchain.
      </Alert>
    </div>
  );
}

export default function GudangPage() {
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
    // GATE 2: KMP confirms physical receipt of dispatched supply -> Active.
    txAccept.run((coop) => acceptSupply(coop, onchainId));
  }

  const isAnyProcessing = txAccept.state !== "idle" && txAccept.state !== "success";

  // Split MOCK_STOCK by category
  const saprotanStock = MOCK_STOCK.filter((s) => s.category === "saprotan");
  const hasilPanenStock = MOCK_STOCK.filter((s) => s.category === "hasil-panen");

  // Summary totals for the stat strip
  const totalPanenDiterima = hasilPanenStock.reduce((sum, s) => sum + parseKgQty(s.inQty), 0);
  const totalDiteruskan = hasilPanenStock.reduce((sum, s) => sum + parseKgQty(s.outQty), 0);

  // Stock table search
  const [stockSearch, setStockSearch] = useState("");
  const filteredSaprotan = useMemo(() => {
    const q = stockSearch.toLowerCase().trim();
    if (!q) return saprotanStock;
    return saprotanStock.filter((s) => s.itemName.toLowerCase().includes(q));
  }, [saprotanStock, stockSearch]);
  const filteredHasil = useMemo(() => {
    const q = stockSearch.toLowerCase().trim();
    if (!q) return hasilPanenStock;
    return hasilPanenStock.filter((s) => s.itemName.toLowerCase().includes(q));
  }, [hasilPanenStock, stockSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gudang dan Pasokan"
        description="Kiriman saprotan masuk (on-chain) dan stok fisik gudang (catatan lokal)."
      />

      {/* Summary stat strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Kargo Menunggu"
          value={String(inbound.length)}
          hint="Kiriman saprotan dari Agrinas menunggu konfirmasi penerimaan"
          icon={<Truck size={18} />}
          tone={inbound.length > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Panen Diterima"
          value={`${totalPanenDiterima.toLocaleString("id-ID")} kg`}
          hint="Total hasil panen yang diterima di gudang"
          icon={<Package size={18} />}
        />
        <StatCard
          label="Diteruskan ke Gudang Agrinas"
          value={`${totalDiteruskan.toLocaleString("id-ID")} kg`}
          hint="Total yang sudah dikirim ke gudang Agrinas"
          icon={<ArrowUpFromLine size={18} />}
        />
      </div>

      {/* Zone 1: On-chain inbound supply */}
      <Card>
        <CardHeader
          title="Kargo Masuk dari Agrinas"
          description="Barang dalam perjalanan menunggu konfirmasi penerimaan fisik. Konfirmasi Anda mengaktifkan utang saprotan petani."
          action={
            <span className="flex items-center gap-1 rounded-full bg-aqua-100 px-2.5 py-0.5 text-xs font-semibold text-aqua-700">
              <LinkIcon size={11} />
              On-chain
            </span>
          }
        />
        <CardContent className="space-y-4">
          {inbound.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Tidak ada kiriman saprotan yang sedang menunggu konfirmasi.
            </div>
          ) : (
            inbound.map((a) => {
              return (
                <InboundCard
                  key={a.id}
                  agreement={a}
                  farmerName={a.farmerName}
                  isAnyProcessing={isAnyProcessing}
                  onAccept={() => handleAccept(a.id, a.onchainId)}
                  state={activeId === a.id ? txAccept.state : "idle"}
                  txHash={activeId === a.id ? txAccept.txHash : null}
                  isDone={!!doneMap[a.id]}
                  doneTxHash={doneMap[a.id] ?? null}
                />
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Zone 2: Off-chain stock (clearly labeled) */}
      <Card>
        <CardHeader
          title="Stok Gudang"
          description="Catatan fisik gudang koperasi. Data ini disimpan lokal, tidak di blockchain."
          action={
            <Badge tone="neutral" icon={<Database size={11} />}>
              Catatan Lokal
            </Badge>
          }
        />
        <CardContent className="space-y-6 p-0 pb-4">
          {/* Warning banner */}
          <div className="mx-5 mt-2">
            <Alert tone="warning" title="Data off-chain">
              Tabel stok di bawah adalah catatan lokal koperasi. Tidak ada catatan blockchain untuk
              ini. Konfirmasi kargo Agrinas di zona atas yang menciptakan rekam on-chain.
            </Alert>
          </div>

          {/* Stock search */}
          <div className="mx-5">
            <Input
              name="stock-search"
              placeholder="Cari nama barang..."
              leading={<Search size={15} />}
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Saprotan stock */}
          <div>
            <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-5 py-3">
              <Warehouse size={15} className="text-verdant-600" />
              <span className="text-sm font-semibold text-foreground">Saprotan</span>
              <Badge tone="verdant">Pertanian</Badge>
            </div>
            <TableFrame className="border-0 shadow-none">
              <Table>
                <THead>
                  <Th>Barang</Th>
                  <Th className="text-right">Masuk</Th>
                  <Th className="text-right">Keluar</Th>
                  <Th className="text-right">Sisa</Th>
                  <Th>Catatan</Th>
                </THead>
                <TBody>
                  {filteredSaprotan.length > 0 ? (
                    filteredSaprotan.map((s) => (
                      <Tr key={s.id}>
                        <Td className="font-medium">{s.itemName}</Td>
                        <Td className="text-right tabular-nums text-muted-foreground">{s.inQty}</Td>
                        <Td className="text-right tabular-nums text-muted-foreground">
                          {s.outQty}
                        </Td>
                        <Td className="text-right tabular-nums">
                          <span
                            className={
                              s.balance === "0"
                                ? "text-muted-foreground"
                                : "font-semibold text-verdant-700"
                            }
                          >
                            {s.balance}
                          </span>
                        </Td>
                        <Td className="text-muted-foreground">{s.note}</Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Tidak ada barang saprotan yang cocok.
                      </Td>
                    </Tr>
                  )}
                </TBody>
              </Table>
            </TableFrame>
          </div>

          {/* Hasil panen stock */}
          <div>
            <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-5 py-3">
              <Warehouse size={15} className="text-aqua-600" />
              <span className="text-sm font-semibold text-foreground">Hasil Panen</span>
              <Badge tone="aqua">Diteruskan ke Gudang Agrinas</Badge>
            </div>
            <TableFrame className="border-0 shadow-none">
              <Table>
                <THead>
                  <Th>Komoditas</Th>
                  <Th className="text-right">Diterima</Th>
                  <Th className="text-right">Diteruskan</Th>
                  <Th className="text-right">Sisa di Gudang</Th>
                  <Th>Catatan</Th>
                </THead>
                <TBody>
                  {filteredHasil.length > 0 ? (
                    filteredHasil.map((s) => (
                      <Tr key={s.id}>
                        <Td className="font-medium">{s.itemName}</Td>
                        <Td className="text-right tabular-nums text-muted-foreground">{s.inQty}</Td>
                        <Td className="text-right tabular-nums text-muted-foreground">
                          {s.outQty}
                        </Td>
                        <Td className="text-right tabular-nums">
                          <span
                            className={
                              s.balance === "0"
                                ? "text-muted-foreground"
                                : "font-semibold text-aqua-700"
                            }
                          >
                            {s.balance}
                          </span>
                        </Td>
                        <Td className="text-muted-foreground">{s.note}</Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Tidak ada hasil panen yang cocok.
                      </Td>
                    </Tr>
                  )}
                </TBody>
              </Table>
            </TableFrame>

            {/* Summary row */}
            <div className="mt-4 flex flex-wrap gap-6 px-5 text-sm">
              {hasilPanenStock.map((s) => (
                <div key={s.id} className="rounded-lg border border-border bg-surface p-3">
                  <p className="font-medium text-foreground">{s.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    Diterima: {s.inQty}. Diteruskan ke Gudang Agrinas: {s.outQty}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-aqua-700">
                    Sisa di gudang: {s.balance}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
