import { formatRupiah } from "@annona/core";
import { StatCard } from "@annona/ui";

/**
 * Placeholder landing. Real dashboards are role-routed:
 *   app/(coop)   app/(auditor)   app/(farmer)
 * Design pending (use the impeccable skill when ready). No em dashes in UI.
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
        Annona Protocol
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
        Rel settlement offtake pertanian di Stellar
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Mencatat alur kredit input ke pembelian panen (yarnen) secara tahan manipulasi, dengan
        pemotongan utang otomatis dan harga acuan HPP. Untuk Koperasi Desa Merah Putih.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Utang Berjalan" value={formatRupiah(0n)} tone="neutral" />
        <StatCard label="Perjanjian Aktif" value="0" tone="neutral" />
        <StatCard label="Tingkat Pelunasan" value="0%" tone="good" />
      </div>

      <p className="mt-10 text-sm text-slate-400">
        Skeleton scaffold. Dashboard coop / auditor / farmer to be built. See docs/PRD.md.
      </p>
    </main>
  );
}
