"use client";

import { fetchCoop } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { shortAddr } from "@/lib/mock-data";
import { Logo, LogoMark } from "@annona/ui";
import { cn } from "@annona/ui";
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  ClipboardList,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  Warehouse,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

/** KMP dashboard shell: collapsible sidebar (desktop) + drawer (mobile) +
 *  topbar. Calm cream background, white surfaces, no mesh behind data
 *  (DESIGN_GUIDE section 8, "Coop dashboard" archetype). Collapsed state
 *  persists in localStorage; main content widens to fill the reclaimed space. */

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [
      { href: "/kmp", label: "Beranda", icon: LayoutDashboard, exact: true },
      { href: "/kmp/petani", label: "Petani", icon: Users },
      { href: "/kmp/perjanjian", label: "Perjanjian", icon: FileText },
    ],
  },
  {
    label: "Transaksi",
    items: [
      { href: "/kmp/permintaan", label: "Permintaan Saprotan", icon: ClipboardList },
      { href: "/kmp/setor", label: "Setor Panen", icon: PackageCheck },
      { href: "/kmp/pembayaran", label: "Pembayaran", icon: Banknote },
      { href: "/kmp/residu", label: "Residu Agrinas", icon: Landmark },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { href: "/kmp/gudang", label: "Gudang & Pasokan", icon: Warehouse },
      { href: "/kmp/pengaturan", label: "Pengaturan", icon: Settings },
    ],
  },
];

const STORAGE_KEY = "annona.kmp.sidebar.collapsed";

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname.startsWith(item.href);
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex min-h-10 items-center rounded-md text-sm font-medium",
        "transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
        active
          ? "bg-verdant-50 text-verdant-800"
          : "text-ink-600 hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <Icon size={18} className={cn("shrink-0", active ? "text-verdant-700" : "text-ink-400")} />
      {collapsed ? null : (
        <>
          {item.label}
          {active ? (
            <span className="ml-auto h-5 w-1 rounded-full bg-verdant-500" aria-hidden />
          ) : null}
        </>
      )}
    </Link>
  );
}

function SidebarContent({
  collapsed = false,
  onNavigate,
  onToggle,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const { data: coopData } = useApi(fetchCoop);
  const coop = coopData?.coop;
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center pt-5 pb-4",
          collapsed ? "justify-center px-2" : "gap-2 px-5",
        )}
      >
        <Link href="/" onClick={onNavigate} aria-label="Annona">
          {collapsed ? <LogoMark className="h-7 w-7" /> : <Logo className="h-7 w-auto" />}
        </Link>
        {collapsed ? null : (
          <span className="rounded-full bg-aqua-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-aqua-700 uppercase">
            KMP
          </span>
        )}
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Perlebar menu" : "Perkecil menu"}
            className={cn(
              "hidden rounded-md p-1.5 text-ink-400 transition-colors hover:bg-surface-muted hover:text-foreground lg:block",
              collapsed ? "mt-2" : "ml-auto",
            )}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        ) : null}
      </div>

      {collapsed ? null : (
        <div className="mx-4 mb-4 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground">{coop?.name ?? "Koperasi"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {coop ? `${coop.kecamatan}, ${coop.kabupaten}` : ""}
          </p>
          <p className="mt-1 font-mono text-[11px] text-aqua-700">
            {coop ? shortAddr(coop.walletAddress) : ""}
          </p>
        </div>
      )}

      <nav
        className={cn("flex-1 space-y-4 overflow-y-auto", collapsed ? "px-2" : "px-3")}
        aria-label="Menu utama"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label ?? "utama"}>
            {group.label && !collapsed ? (
              <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.14em] text-ink-400 uppercase">
                {group.label}
              </p>
            ) : null}
            {group.label && collapsed ? <div className="mx-2 mb-1 border-t border-border" /> : null}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item)}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-border py-4", collapsed ? "px-2" : "px-4")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-verdant-100 text-sm font-bold text-verdant-800">
              HU
            </div>
            <Link
              href="/"
              onClick={onNavigate}
              title="Keluar"
              aria-label="Keluar"
              className="rounded-md p-2 text-ink-500 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={16} />
            </Link>
          </div>
        ) : (
          <>
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
            <Link
              href="/"
              onClick={onNavigate}
              className="mt-3 flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <LogOut size={16} />
              Keluar
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export function KmpShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    setHydrated(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const railW = collapsed ? "lg:w-16" : "lg:w-64";
  const mainML = collapsed ? "lg:ml-16" : "lg:ml-64";

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface lg:block",
          hydrated ? "transition-[width] duration-200" : "",
          railW,
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={toggleCollapsed} />
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

      <main
        className={cn(
          "px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
          hydrated ? "transition-[margin] duration-200" : "",
          mainML,
        )}
      >
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
