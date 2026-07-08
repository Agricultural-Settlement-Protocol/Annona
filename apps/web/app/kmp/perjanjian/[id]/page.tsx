"use client";

/** Screen E — Agreement Detail (PRD §8.1). Client component so useParams
 *  is available and bigint values from mock-data stay client-side only. */

import { LifecycleTimeline } from "@/components/kmp/lifecycle-timeline";
import { PageHeader } from "@/components/kmp/page-header";
import {
  TBody,
  THead,
  Table,
  TableFrame,
  Td,
  Th,
  Tr,
} from "@/components/kmp/table";
import {
  fetchAgreement,
  fetchCatalog,
  fetchFarmers,
  fetchHpp,
  fetchResidu,
  fetchSettlements,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  ProgressBar,
  ReputationBadge,
  ResiduStatusBadge,
  RupiahAmount,
  SplitSettlementCard,
  StatusBadge,
  TxHashLink,
} from "@annona/ui";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Calendar,
  CloudRain,
  ExternalLink,
  FileText,
  Landmark,
  Leaf,
  Percent,
  Scale,
  Tag,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

/** Labeled info row — two-column pair used in the details grid. */
function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-4">
      <span className="min-w-44 text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  );
}

export default function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useApi(
    () =>
      Promise.all([
        fetchAgreement(id),
        fetchFarmers(),
        fetchCatalog(),
        fetchHpp(),
        fetchSettlements(),
        fetchResidu(),
      ]),
    [id],
  );

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Memuat perjanjian...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16">
        <EmptyState
          icon={<FileText size={36} />}
          title="Perjanjian tidak ditemukan"
          description={
            error
              ? `Gagal memuat perjanjian: ${error}`
              : `Tidak ada perjanjian dengan ID "${id}". Periksa kembali daftar perjanjian.`
          }
          action={
            <Link href="/kmp/perjanjian">
              <Button
                variant="outline"
                leftIcon={<ArrowLeft size={16} />}
                className="rounded-full"
              >
                Kembali ke Daftar
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const [agreement, farmers, catalog, hppRefs, allSettlements, allResidu] =
    data;
  const farmer = farmers.find((f) => f.id === agreement.farmerId);
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const deliveries = agreement.deliveries;
  const settlements = allSettlements.filter(
    (s) => s.agreementId === agreement.id,
  );
  const residu = allResidu.find((r) => r.agreementId === agreement.id);
  const priceRef = hppRefs.find(
    (p) => p.commodityCode === agreement.commodityCode,
  );

  const deliveredKg = Number(agreement.deliveredVolG / 1000n);
  const settledKg = Number(agreement.settledVolG / 1000n);

  // Grade and kadar air: show estimate badge before first delivery, actual badge after.
  // agreement.grade/moistureBps = default at creation time (SOP estimate).
  // latest delivery's grade/moistureBps = physical measurement.
  const latestDelivery =
    deliveries.length > 0 ? deliveries[deliveries.length - 1] : undefined;
  const hasDelivery = deliveries.length > 0;
  const gradeDisplay = latestDelivery?.grade ?? agreement.grade;
  const moistureDisplay = latestDelivery?.moistureBps ?? agreement.moistureBps;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Perjanjian #${String(agreement.onchainId)}`}
        description={`${farmer?.name ?? "(petani)"}, ${agreement.commodityCode === "GABAH" ? "Gabah Kering Panen" : "Jagung Pipilan Kering"}`}
        actions={
          <>
            <Link href="/kmp/perjanjian">
              <Button
                variant="ghost"
                leftIcon={<ArrowLeft size={16} />}
                className="rounded-full"
              >
                Daftar Perjanjian
              </Button>
            </Link>
            {(agreement.status === "Active" ||
              agreement.status === "PartiallyDelivered" ||
              agreement.status === "Delivered") && (
              <Link href="/kmp/setor">
                <Button
                  leftIcon={<Scale size={16} />}
                  className="rounded-full bg-primary-dark hover:bg-opacity-95 text-white"
                >
                  Catat Setoran
                </Button>
              </Link>
            )}
          </>
        }
      />

      {/* Flagged / ForceMajeure alerts — flags indicate, humans decide */}
      {agreement.status === "Flagged" && (
        <Alert tone="warning" title="Perlu Ditinjau">
          Setoran {deliveredKg.toLocaleString("id-ID")} kg dari perkiraan{" "}
          {agreement.expectedVolKg.toLocaleString("id-ID")} kg (
          {Math.round((deliveredKg / agreement.expectedVolKg) * 100)}%).
          Penyebab perlu dikonfirmasi petugas lapangan sebelum kesimpulan
          diambil.
        </Alert>
      )}
      {agreement.status === "ForceMajeure" && (
        <Alert tone="danger" title="Gagal Panen Dikonfirmasi">
          Kondisi force majeure telah dicatat. Tanpa penalti reputasi untuk
          petani. Utang direstrukturisasi di luar sistem rantai sesuai prosedur
          koperasi.
        </Alert>
      )}

      {/* Lifecycle timeline */}
      <Card>
        <CardHeader title="Tahapan Perjanjian" />
        <CardContent>
          <LifecycleTimeline status={agreement.status} />
        </CardContent>
      </Card>

      {/* Info grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Petani + identitas */}
        <Card>
          <CardHeader
            title="Info Petani"
            action={<Leaf size={18} className="text-verdant-400" />}
          />
          <CardContent className="space-y-3">
            <InfoRow label="Nama">
              <span className="font-semibold">
                {farmer?.name ?? "(tidak diketahui)"}
              </span>
            </InfoRow>
            <InfoRow label="Reputasi">
              {farmer ? <ReputationBadge tier={farmer.repTier} /> : null}
            </InfoRow>
            <InfoRow label="Kecamatan">{farmer?.kecamatan}</InfoRow>
            <InfoRow label="Luas Lahan">
              {Number(farmer?.plotAreaHa ?? 0).toLocaleString("id-ID")} ha
            </InfoRow>
            <InfoRow label="Dompet">
              <span className="font-mono text-xs text-muted-foreground">
                {farmer
                  ? `${farmer.walletAddress.slice(0, 8)}...${farmer.walletAddress.slice(-6)}`
                  : "-"}
              </span>
            </InfoRow>
            <div className="pt-1">
              <Link
                href={farmer ? `/kmp/petani?fokus=${farmer.id}` : "/kmp/petani"}
              >
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<User size={14} />}
                >
                  Lihat profil petani
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Komoditas + harga */}
        <Card>
          <CardHeader
            title="Komoditas dan Harga"
            action={<Tag size={18} className="text-verdant-400" />}
          />
          <CardContent className="space-y-3">
            <InfoRow label="Komoditas">
              {agreement.commodityCode === "GABAH"
                ? "Gabah Kering Panen"
                : "Jagung Pipilan Kering"}
            </InfoRow>

            {/* Grade: Perkiraan sebelum setoran pertama, Aktual setelahnya */}
            <InfoRow label="Grade">
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">Grade {gradeDisplay}</span>
                  <Badge tone={hasDelivery ? "verdant" : "neutral"}>
                    {hasDelivery ? "Aktual" : "Perkiraan"}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground">
                  {hasDelivery
                    ? "Hasil pengukuran setoran terakhir"
                    : "Nilai perkiraan sesuai SOP, diukur saat setoran panen"}
                </span>
              </span>
            </InfoRow>

            {/* Kadar Air: sama, Perkiraan sebelum setoran, Aktual setelahnya */}
            <InfoRow label="Kadar Air">
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span>{(moistureDisplay / 100).toFixed(1)}%</span>
                  <Badge tone={hasDelivery ? "verdant" : "neutral"}>
                    {hasDelivery ? "Aktual" : "Perkiraan"}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground">
                  {hasDelivery
                    ? "Hasil pengukuran setoran terakhir"
                    : "Nilai perkiraan sesuai SOP, diukur saat setoran panen"}
                </span>
              </span>
            </InfoRow>

            <InfoRow label="Harga Pokok Agrinas">
              <RupiahAmount smallest={agreement.basePriceAgrinas} />
              <span className="ml-1 text-xs text-muted-foreground">
                (pokok saprotan)
              </span>
            </InfoRow>
            <InfoRow label="Markup Saprotan">
              {agreement.saprotanMarkupBps / 100}%
            </InfoRow>
            <InfoRow label="Utang Saprotan">
              <RupiahAmount smallest={agreement.inputDebt} />
            </InfoRow>
            <InfoRow label="Biaya Penanganan">
              {agreement.hppHandlingFeeBps / 100}% dari hasil
            </InfoRow>
            <InfoRow label="HPP per kg">
              <RupiahAmount smallest={agreement.hppPerKg} />
              <span className="ml-1 text-xs text-muted-foreground">
                (v{agreement.hppVersion}, {priceRef?.hppSource ?? "Inpres"})
              </span>
            </InfoRow>
            <InfoRow label="Toleransi Setoran">
              {agreement.toleranceBps / 100}%
            </InfoRow>
          </CardContent>
        </Card>
      </div>

      {/* Rincian saprotan (inputs) */}
      <Card>
        <CardHeader
          title="Rincian Saprotan"
          description="Barang yang diterima petani. Harga pokok Agrinas, markup KMP menghasilkan utang saprotan."
          action={<Boxes size={18} className="text-verdant-400" />}
        />
        <CardContent className="p-0 pb-4">
          <TableFrame className="border-0 shadow-none">
            <Table>
              <THead>
                <Th>Barang</Th>
                <Th>Kategori</Th>
                <Th className="text-right">Jumlah</Th>
                <Th className="text-right">Harga Pokok / unit</Th>
                <Th className="text-right">Subtotal Pokok</Th>
              </THead>
              <TBody>
                {agreement.inputs.map((inp) => {
                  const item = catalogById.get(inp.catalogId);
                  const lineTotal = inp.lineTotalPrincipal;
                  return (
                    <Tr key={inp.catalogId}>
                      <Td className="font-medium">
                        {item?.name ?? inp.catalogId}
                      </Td>
                      <Td className="text-muted-foreground capitalize">
                        {item?.category ?? "-"}
                      </Td>
                      <Td className="text-right tabular-nums">
                        {inp.qty} unit
                      </Td>
                      <Td className="text-right">
                        <RupiahAmount smallest={inp.basePriceAgrinas} />
                      </Td>
                      <Td className="text-right">
                        <RupiahAmount smallest={lineTotal} />
                      </Td>
                    </Tr>
                  );
                })}
                {/* Totals row */}
                <tr className="border-t-2 border-border bg-surface-muted">
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-sm font-semibold text-foreground"
                  >
                    Total Pokok Agrinas
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RupiahAmount
                      smallest={agreement.basePriceAgrinas}
                      className="font-bold"
                    />
                  </td>
                </tr>
                <tr className="bg-surface-muted">
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-sm text-muted-foreground"
                  >
                    Utang Saprotan (termasuk markup{" "}
                    {agreement.saprotanMarkupBps / 100}%)
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RupiahAmount smallest={agreement.inputDebt} />
                  </td>
                </tr>
              </TBody>
            </Table>
          </TableFrame>
        </CardContent>
      </Card>

      {/* Progress setoran */}
      <Card>
        <CardHeader
          title="Progress Setoran"
          description={`${deliveredKg.toLocaleString("id-ID")} kg dari ${agreement.expectedVolKg.toLocaleString("id-ID")} kg perkiraan`}
          action={<Percent size={18} className="text-verdant-400" />}
        />
        <CardContent>
          <ProgressBar
            value={deliveredKg}
            max={agreement.expectedVolKg}
            label={`Sudah disetor: ${deliveredKg.toLocaleString("id-ID")} kg`}
            tone={
              deliveredKg >= agreement.expectedVolKg * 0.98
                ? "verdant"
                : deliveredKg >= agreement.expectedVolKg * 0.8
                  ? "verdant"
                  : "aqua"
            }
          />
          {settledKg > 0 && settledKg < deliveredKg && (
            <div className="mt-3">
              <ProgressBar
                value={settledKg}
                max={deliveredKg}
                label={`Sudah diselesaikan: ${settledKg.toLocaleString("id-ID")} kg`}
                tone="aqua"
              />
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Utang tersisa: </span>
              <RupiahAmount
                smallest={agreement.remainingDebt}
                tone={agreement.remainingDebt > 0n ? "negative" : "positive"}
              />
            </div>
            <div>
              <span className="text-muted-foreground">
                Dibayarkan ke petani:{" "}
              </span>
              <RupiahAmount smallest={agreement.paidToFarmer} tone="positive" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Riwayat setoran */}
      {deliveries.length > 0 && (
        <Card>
          <CardHeader
            title="Riwayat Setoran Panen"
            description="Setiap setoran memiliki resi on-chain yang dapat diverifikasi."
            action={<Calendar size={18} className="text-aqua-400" />}
          />
          <CardContent className="p-0 pb-4">
            <TableFrame className="border-0 shadow-none">
              <Table>
                <THead>
                  <Th>Seq</Th>
                  <Th className="text-right">Volume</Th>
                  <Th>Grade</Th>
                  <Th className="text-right">Kadar Air</Th>
                  <Th>Tanggal</Th>
                  <Th>Resi On-chain</Th>
                </THead>
                <TBody>
                  {deliveries.map((d) => (
                    <Tr key={d.id}>
                      <Td className="font-mono text-xs">{d.seq}</Td>
                      <Td className="text-right tabular-nums font-medium">
                        {Number(d.volumeG / 1000n).toLocaleString("id-ID")} kg
                      </Td>
                      <Td>
                        <span
                          className={
                            d.grade === "A"
                              ? "font-semibold text-verdant-700"
                              : d.grade === "B"
                                ? "font-semibold text-foreground"
                                : "font-semibold text-amber-600"
                          }
                        >
                          Grade {d.grade}
                        </span>
                      </Td>
                      <Td className="text-right tabular-nums text-muted-foreground">
                        {d.moistureBps != null
                          ? `${(d.moistureBps / 100).toFixed(1)}%`
                          : "-"}
                      </Td>
                      <Td className="text-muted-foreground">{d.deliveredAt}</Td>
                      <Td>
                        {d.receiptOnchainRef ? (
                          <TxHashLink hash={d.receiptOnchainRef} />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableFrame>
          </CardContent>
        </Card>
      )}

      {/* Penyelesaian (settlements) */}
      {settlements.length > 0 && (
        <Card>
          <CardHeader
            title="Catatan Penyelesaian"
            description="Catatan pembayaran anti-manipulasi. Kas keluar dari BRILink/BRI, split tercatat di Stellar."
            action={<Landmark size={18} className="text-aqua-400" />}
          />
          <CardContent className="space-y-6">
            {settlements.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-border bg-surface-muted/40 p-4"
              >
                {/* Settlement meta */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Penyelesaian{" "}
                      {Number(s.settledVolG / 1000n).toLocaleString("id-ID")} kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tanggal {s.settledAt}. Ref bank: {s.rupiahRef ?? "-"}
                    </p>
                  </div>
                  {s.txHash && <TxHashLink hash={s.txHash} />}
                </div>

                {/* SplitSettlementCard for the three-way split */}
                <SplitSettlementCard
                  gross={s.gross}
                  handlingCut={s.handlingCut}
                  netToFarmer={s.netPaid}
                  residuPrincipal={s.principalToAgrinas}
                  coopMargin={s.coopMargin}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Residu pokok Agrinas */}
      {residu && (
        <Card>
          <CardHeader
            title="Residu Pokok Agrinas"
            description="Bagian Agrinas dari pembayaran. Wajib disetor balik ke Agrinas."
            action={<Landmark size={18} className="text-aqua-400" />}
          />
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <ResiduStatusBadge status={residu.status} />
                <p className="mt-1 text-sm text-muted-foreground">
                  Jumlah pokok:{" "}
                  <RupiahAmount
                    smallest={residu.principalAmount}
                    className="text-sm"
                  />
                </p>
              </div>
              {residu.txHash && <TxHashLink hash={residu.txHash} />}
            </div>

            {residu.bankRef && (
              <div className="text-sm text-muted-foreground">
                Referensi bank:{" "}
                <span className="font-mono text-foreground">
                  {residu.bankRef}
                </span>
              </div>
            )}

            {residu.remittedAt && (
              <div className="text-sm text-muted-foreground">
                Tanggal setor: {residu.remittedAt}
              </div>
            )}

            {residu.clearedAt && (
              <div className="text-sm text-muted-foreground">
                Tanggal terverifikasi: {residu.clearedAt}
              </div>
            )}

            {residu.status === "Pending" && (
              <Alert tone="warning" title="Residu belum disetor">
                Sebesar{" "}
                <RupiahAmount
                  smallest={residu.principalAmount}
                  className="text-sm"
                />{" "}
                adalah uang Agrinas yang tersimpan di kas koperasi. Segera
                remitkan ke rekening Agrinas untuk menyelesaikan kewajiban.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tautan explorer */}
      {agreement.createTxHash && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-aqua-50/50 px-4 py-3 text-sm text-aqua-700">
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${agreement.createTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-medium hover:underline"
          >
            <ExternalLink size={14} />
            Lihat perjanjian di Stellar Explorer
          </a>
          <span className="text-muted-foreground">(testnet)</span>
        </div>
      )}
    </div>
  );
}
