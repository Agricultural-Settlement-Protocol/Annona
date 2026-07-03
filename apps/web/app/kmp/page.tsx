import { ActivityFeed } from "@/components/kmp/activity-feed";
import { PageHeader } from "@/components/kmp/page-header";
import { ScrollArea } from "@/components/scroll-area";
import {
  MOCK_ACTIVITY,
  MOCK_COOP,
  cashNeededThisWeek,
  coopOverview,
  formatKg,
  getFarmer,
  harvestThisWeek,
  inboundSupply,
} from "@/lib/mock-data";
import { formatRupiah } from "@annona/core";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  ProgressBar,
  RupiahAmount,
  StatCard,
  StatusBadge,
} from "@annona/ui";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  FilePlus2,
  Landmark,
  Scale,
  Truck,
  UserPlus,
  Wallet,
  Wheat,
} from "lucide-react";
import Link from "next/link";

/** Screen A — Home / Overview (PRD §8.1). At-a-glance offtaker-book +
 *  cash-agent health. Big color-coded numbers, plain Bahasa. */
export default function KmpHomePage() {
  const overview = coopOverview();
  const harvest = harvestThisWeek();
  const cashNeeded = cashNeededThisWeek();
  const inbound = inboundSupply();
  const cashFunded = MOCK_COOP.prefundedCashBalance >= cashNeeded;

  return (
    <div>
      <PageHeader
        title="Beranda"
        description="Ringkasan buku offtake dan kesehatan kas koperasi minggu ini."
        actions={
          <>
            <Link href="/kmp/petani">
              <Button variant="outline" size="md" leftIcon={<UserPlus size={16} />}>
                Daftarkan Petani
              </Button>
            </Link>
            <Link href="/kmp/perjanjian/baru">
              <Button variant="primary" size="md" leftIcon={<FilePlus2 size={16} />}>
                Buat Perjanjian
              </Button>
            </Link>
          </>
        }
      />

      {/* Pre-funded cash banner: green = funded, red = shortfall */}
      <div
        className={
          cashFunded
            ? "mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4"
            : "mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-red-200 bg-red-50 px-5 py-4"
        }
      >
        <span
          className={
            cashFunded
              ? "flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
              : "flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700"
          }
        >
          <Wallet size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {cashFunded ? "Kas siap untuk panen minggu ini" : "Kas kurang untuk panen minggu ini"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Perlu disiapkan {formatRupiah(cashNeeded)} untuk pembayaran petani. Saldo kas saat ini{" "}
            {formatRupiah(MOCK_COOP.prefundedCashBalance)}.
          </p>
        </div>
        <Badge tone={cashFunded ? "success" : "danger"}>
          {cashFunded ? "Terdanai" : "Kurang dana"}
        </Badge>
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Utang Saprotan Berjalan"
          value={<RupiahAmount smallest={overview.outstandingDebt} className="text-3xl" />}
          hint="Piutang koperasi ke petani aktif"
          icon={<Scale size={18} />}
        />
        <StatCard
          label="Perjanjian Aktif"
          value={String(overview.activeAgreements)}
          hint="Termasuk kiriman saprotan dalam perjalanan"
          icon={<Wheat size={18} />}
        />
        <StatCard
          label="Tingkat Pelunasan"
          value={`${overview.settlementRatePct}%`}
          hint="Perjanjian selesai yang berakhir Lunas"
          tone={overview.settlementRatePct >= 60 ? "good" : "warn"}
          icon={<Banknote size={18} />}
        />
        <StatCard
          label="Residu Pokok Agrinas"
          value={<RupiahAmount smallest={overview.residuOwed} className="text-3xl" />}
          hint="Uang Agrinas di kas KMP, wajib disetor balik"
          tone={overview.residuOwed > 0n ? "warn" : "good"}
          icon={<Landmark size={18} />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Panen Minggu Ini */}
          <Card>
            <CardHeader
              title="Panen Minggu Ini"
              description={`Perkiraan ${formatKg(harvest.totalKg)} senilai ${formatRupiah(harvest.totalValue)} (formula transparan, sumber BPS)`}
              action={
                <span className="text-ink-400">
                  <CalendarClock size={18} />
                </span>
              }
            />
            <CardContent className="space-y-4">
              {harvest.rows.map((a) => {
                const farmer = getFarmer(a.farmerId);
                const deliveredKg = Number(a.deliveredVolG / 1000n);
                return (
                  <Link
                    key={a.id}
                    href={`/kmp/perjanjian/${a.id}`}
                    className="block rounded-lg border border-border p-4 transition-colors hover:border-verdant-300 hover:bg-surface-muted/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{farmer?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.commodityCode === "GABAH" ? "Gabah" : "Jagung"}, perkiraan{" "}
                          {formatKg(a.expectedVolKg)}, panen {a.expectedHarvestDate}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    <ProgressBar
                      className="mt-3"
                      value={deliveredKg}
                      max={a.expectedVolKg}
                      label={`Setoran masuk ${formatKg(deliveredKg)}`}
                    />
                  </Link>
                );
              })}
              {harvest.rows.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Tidak ada jadwal panen minggu ini.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Inbound supply strip */}
          <Card>
            <CardHeader
              title="Kiriman Saprotan Masuk"
              description="Kargo Agrinas dalam perjalanan, menunggu konfirmasi penerimaan Anda."
              action={
                <span className="text-indigo-400">
                  <Truck size={18} />
                </span>
              }
            />
            <CardContent className="space-y-3">
              {inbound.map((a) => {
                const farmer = getFarmer(a.farmerId);
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Perjanjian #{String(a.onchainId)}, {farmer?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Nilai pokok {formatRupiah(a.basePriceAgrinas)}, utang belum aktif sebelum
                        barang diterima
                      </p>
                    </div>
                    <Link href="/kmp/gudang">
                      <Button size="sm" variant="accent" rightIcon={<ArrowRight size={14} />}>
                        Periksa & Terima
                      </Button>
                    </Link>
                  </div>
                );
              })}
              {inbound.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Tidak ada kiriman dalam perjalanan.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Activity feed. The relative/absolute pair pins the card's height to
            the LEFT column (harvest + inbound cards); the feed scrolls inside
            instead of stretching the row. */}
        <div className="relative min-h-96 lg:col-span-2">
          <Card className="flex h-full flex-col lg:absolute lg:inset-0">
            <CardHeader
              title="Aktivitas Terbaru"
              description="Setiap baris adalah transaksi nyata di Stellar."
            />
            <CardContent className="min-h-0 flex-1 p-0">
              <ScrollArea viewportClassName="h-full px-5 pt-2" className="h-full">
                <ActivityFeed items={MOCK_ACTIVITY} />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
