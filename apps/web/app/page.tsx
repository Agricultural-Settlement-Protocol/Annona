import { formatRupiah } from "@annona/core";
import { Badge, Button, Logo, MeshBackground, StatCard } from "@annona/ui";
import Link from "next/link";

/**
 * Landing. The one place with the loud mesh + scanlines treatment
 * (DESIGN_GUIDE section 8). Role dashboards are built separately.
 */
export default function Home() {
  return (
    <main>
      <MeshBackground scanlines className="min-h-[70vh]">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <Logo size={30} />
        </div>
        <div className="mx-auto max-w-5xl px-6 pb-24 pt-10">
          <Badge tone="aqua">Stellar APAC Hackathon 2026</Badge>
          <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-tight tracking-tight text-foreground">
            Rel settlement offtake pertanian di Stellar
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-700">
            Mencatat alur kredit input ke pembelian panen (yarnen) secara tahan manipulasi, dengan
            pemotongan utang otomatis dan harga acuan HPP. Untuk Koperasi Desa Merah Putih, dan
            koperasi komoditas mana pun.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg">Mulai untuk Koperasi</Button>
            <Link href="/design">
              <Button size="lg" variant="outline">
                Lihat Design System
              </Button>
            </Link>
          </div>
        </div>
      </MeshBackground>

      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Utang Berjalan" value={formatRupiah(0n)} />
          <StatCard label="Perjanjian Aktif" value="0" />
          <StatCard label="Tingkat Pelunasan" value="0%" tone="good" />
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          Skeleton scaffold. Dashboard coop, auditor, dan farmer menyusul. Lihat docs/PRD.md.
        </p>
      </div>
    </main>
  );
}
