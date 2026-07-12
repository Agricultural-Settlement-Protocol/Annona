import { ActivityFeed } from "@/components/kmp/activity-feed";
import { PageHeader } from "@/components/kmp/page-header";
import { ScrollArea } from "@/components/scroll-area";
import { fetchCoop, fetchOverview } from "@/lib/api";
import { MOCK_ACTIVITY, formatKg } from "@/lib/mock-data";
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
export default async function KmpHomePage() {
  const [ov, { coop }] = await Promise.all([fetchOverview(), fetchCoop()]);
  const overview = ov.coopOverview;
  const harvest = ov.harvestThisWeek;
  const cashNeeded = ov.cashNeededThisWeek;
  const inbound = ov.inboundSupply;
  const cashFunded = coop.prefundedCashBalance >= cashNeeded;

  return (
    <div>
      <PageHeader
        title="Beranda"
        description="Ringkasan buku offtake dan kesehatan kas koperasi minggu ini."
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/kmp/petani">
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<UserPlus size={15} />}
                className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Daftarkan Petani
              </Button>
            </Link>
            <Link href="/kmp/perjanjian/baru">
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<FilePlus2 size={15} />}
                className="rounded-full bg-primary-dark px-4 font-semibold text-white shadow-sm shadow-primary-dark/20 transition-transform hover:bg-opacity-95 active:scale-[0.98]"
              >
                Buat Perjanjian
              </Button>
            </Link>
          </div>
        }
      />

      {/* Pre-funded cash banner: green = funded, red = shortfall */}
      <div
        className={
          cashFunded
            ? "mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-200/50 bg-[#ebf5e9]/55 px-5 py-4 shadow-sm"
            : "mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-red-250 bg-red-50/50 px-5 py-4 shadow-sm"
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
          <p className="text-sm font-bold text-gray-900">
            {cashFunded
              ? "Kas siap untuk panen minggu ini"
              : "Kas kurang untuk panen minggu ini"}
          </p>
          <p className="mt-1 text-xs text-gray-500 font-semibold leading-relaxed">
            Perlu disiapkan {formatRupiah(cashNeeded)} untuk pembayaran petani.
            Saldo kas saat ini {formatRupiah(coop.prefundedCashBalance)}.
          </p>
        </div>
        <Badge
          tone={cashFunded ? "success" : "danger"}
          className="rounded-full font-bold"
        >
          {cashFunded ? "Terdanai" : "Kurang dana"}
        </Badge>
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Utang Saprotan Berjalan"
          value={
            <RupiahAmount
              smallest={overview.outstandingDebt}
              className="text-3xl font-bold"
            />
          }
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
          value={
            <RupiahAmount
              smallest={overview.residuOwed}
              className="text-3xl font-bold"
            />
          }
          hint="Uang Agrinas di kas KMP, wajib disetor balik"
          tone={overview.residuOwed > 0n ? "warn" : "good"}
          icon={<Landmark size={18} />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Panen Minggu Ini */}
          <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
            <CardHeader
              title="Panen Minggu Ini"
              description={`Perkiraan ${formatKg(harvest.totalKg)} senilai ${formatRupiah(harvest.totalValue)} (formula transparan, sumber BPS)`}
              action={
                <span className="text-gray-400">
                  <CalendarClock size={18} />
                </span>
              }
              className="pb-3"
            />
            <CardContent className="space-y-4 pt-3">
              {harvest.rows.map((a) => {
                const deliveredKg = Number(a.deliveredVolG / 1000n);
                return (
                  <Link
                    key={a.id}
                    href={`/kmp/perjanjian/${a.id}`}
                    className="block rounded-2xl border border-gray-100 p-5 bg-white transition-all hover:border-soft-green hover:bg-[#ebf5e9]/10 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {a.farmerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.commodityCode === "GABAH" ? "Gabah" : "Jagung"},
                          perkiraan {formatKg(a.expectedVolKg)}, panen{" "}
                          {a.expectedHarvestDate}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    <ProgressBar
                      className="mt-3.5"
                      value={deliveredKg}
                      max={a.expectedVolKg}
                      label={`Setoran masuk ${formatKg(deliveredKg)}`}
                    />
                  </Link>
                );
              })}
              {harvest.rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 font-medium">
                  Tidak ada jadwal panen minggu ini.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Inbound supply strip */}
          <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
            <CardHeader
              title="Kiriman Saprotan Masuk"
              description="Kargo Agrinas dalam perjalanan, menunggu konfirmasi penerimaan Anda."
              action={
                <span className="text-indigo-400">
                  <Truck size={18} />
                </span>
              }
              className="pb-3"
            />
            <CardContent className="space-y-3 pt-3">
              {inbound.map((a) => {
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/40 px-5 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Perjanjian #{String(a.onchainId)}, {a.farmerName}
                      </p>
                      <p className="text-xs text-gray-500 font-semibold mt-1">
                        Nilai pokok {formatRupiah(a.basePriceAgrinas)}, utang
                        belum aktif sebelum barang diterima
                      </p>
                    </div>
                    <Link href="/kmp/gudang">
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        rightIcon={<ArrowRight size={14} />}
                        className="rounded-full bg-primary-dark font-semibold text-white shadow-sm hover:bg-opacity-95"
                      >
                        Periksa & Terima
                      </Button>
                    </Link>
                  </div>
                );
              })}
              {inbound.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 font-medium">
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
          <Card className="flex h-full flex-col lg:absolute lg:inset-0 rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
            <CardHeader
              title="Aktivitas Terbaru"
              description="Setiap baris adalah transaksi nyata di Stellar."
              className="pb-3"
            />
            <CardContent className="min-h-0 flex-1 p-0 pt-2">
              <ScrollArea viewportClassName="h-full px-1" className="h-full">
                <ActivityFeed items={MOCK_ACTIVITY} />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
