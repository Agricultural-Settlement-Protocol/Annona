"use client";

import { MOCK_COOP, shortAddr } from "@/lib/mock-data";
import { Logo } from "@annona/ui";
import { cn } from "@annona/ui";
import {
  Banknote,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Menu,
  Users,
  Warehouse,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

/** KMP dashboard shell: sidebar (desktop) + drawer (mobile) + topbar.
 *  Calm cream background, white surfaces, no mesh behind data
 *  (DESIGN_GUIDE section 8, "Coop dashboard" archetype). */

const NAV = [
  { href: "/kmp", label: "Beranda", icon: LayoutDashboard, exact: true },
  { href: "/kmp/petani", label: "Petani", icon: Users },
  { href: "/kmp/perjanjian", label: "Perjanjian", icon: FileText },
  { href: "/kmp/perjanjian/baru", label: "Buat Perjanjian", icon: FilePlus2 },
  { href: "/kmp/setor", label: "Setor & Bayar", icon: Banknote },
  { href: "/kmp/gudang", label: "Gudang & Pasokan", icon: Warehouse },
] as const;

function isActive(pathname: string, item: (typeof NAV)[number]) {
  if ("exact" in item && item.exact) return pathname === item.href;
  if (item.href === "/kmp/perjanjian") {
    // "Perjanjian" owns the list + detail pages but not /baru (its own entry)
    return pathname.startsWith("/kmp/perjanjian") && pathname !== "/kmp/perjanjian/baru";
  }
  return pathname.startsWith(item.href);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 pt-5 pb-4">
        <Link href="/" onClick={onNavigate}>
          <Logo className="h-7 w-auto" />
        </Link>
        <span className="rounded-full bg-aqua-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-aqua-700 uppercase">
          KMP
        </span>
      </div>

      <div className="mx-4 mb-4 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground">{MOCK_COOP.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {MOCK_COOP.kecamatan}, {MOCK_COOP.kabupaten}
        </p>
        <p className="mt-1 font-mono text-[11px] text-aqua-700">
          {shortAddr(MOCK_COOP.walletAddress)}
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Menu utama">
        {NAV.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                "transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active
                  ? "bg-verdant-50 text-verdant-800"
                  : "text-ink-600 hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon size={18} className={active ? "text-verdant-700" : "text-ink-400"} />
              {item.label}
              {active ? (
                <span className="ml-auto h-5 w-1 rounded-full bg-verdant-500" aria-hidden />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-verdant-100 text-sm font-bold text-verdant-800">
            HU
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">H. Usman</p>
            <p className="text-xs text-muted-foreground">Pengurus KMP</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-aqua-50 px-2 py-0.5 text-[10px] font-semibold text-aqua-700">
            <Wifi size={10} />
            Testnet
          </span>
        </div>
      </div>
    </div>
  );
}

export function KmpShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-ink-950/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-lg">
            <button
              type="button"
              aria-label="Tutup menu"
              className="absolute top-4 right-4 rounded-md p-1.5 text-ink-500 hover:bg-surface-muted"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      {/* Mobile topbar */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          aria-label="Buka menu"
          className="rounded-md p-2 text-ink-600 hover:bg-surface-muted"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
        </button>
        <Logo className="h-6 w-auto" />
        <span className="ml-auto rounded-full bg-aqua-50 px-2 py-0.5 text-[10px] font-semibold text-aqua-700">
          Testnet
        </span>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
