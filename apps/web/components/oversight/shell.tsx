"use client";

import { Logo, LogoMark, cn } from "@annona/ui";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  ChevronRight,
  LayoutDashboard,
  Landmark,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

/** Shared oversight shell for Agrinas (operator) and Pemerintah (regulator).
 *  Visual identity: aqua/teal for Agrinas, neutral (ink/verdant) for Pemerintah.
 *  Mirrors KMP shell: collapsible sidebar, localStorage persistence, mobile drawer.
 *  "Ganti Peran" returns to /oversight role select. */

export type OversightRole = "agrinas" | "pemerintah";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const AGRINAS_NAV: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [
      {
        href: "/oversight/agrinas",
        label: "Ringkasan",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    label: "Operasional",
    items: [
      { href: "/oversight/agrinas/katalog", label: "Katalog dan Logistik", icon: Package },
      { href: "/oversight/agrinas/residu", label: "Rekonsiliasi Residu", icon: Landmark },
    ],
  },
  {
    label: "Asisten",
    items: [{ href: "/oversight/agrinas/ai", label: "Asisten AI", icon: Bot }],
  },
];

const PEMERINTAH_NAV: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [
      {
        href: "/oversight/pemerintah",
        label: "Pengawasan Regional",
        icon: BarChart3,
        exact: true,
      },
    ],
  },
  {
    label: "Alat Analisis",
    items: [{ href: "/oversight/pemerintah/ai", label: "Asisten AI", icon: Bot }],
  },
];

const STORAGE_KEY = "annona.oversight.sidebar.collapsed";

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname.startsWith(item.href);
}

function NavLink({
  item,
  active,
  collapsed,
  viewRole: role,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  viewRole: OversightRole;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const isAgrinas = role === "agrinas";
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
          ? isAgrinas
            ? "bg-aqua-50 text-aqua-800"
            : "bg-verdant-50 text-verdant-800"
          : "text-ink-600 hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <Icon
        size={18}
        className={cn(
          "shrink-0",
          active
            ? isAgrinas
              ? "text-aqua-700"
              : "text-verdant-700"
            : "text-ink-400",
        )}
      />
      {collapsed ? null : (
        <>
          {item.label}
          {active ? (
            <span
              className={cn(
                "ml-auto h-5 w-1 rounded-full",
                isAgrinas ? "bg-aqua-500" : "bg-verdant-500",
              )}
              aria-hidden
            />
          ) : null}
        </>
      )}
    </Link>
  );
}

function SidebarContent({
  viewRole: role,
  collapsed = false,
  onNavigate,
  onToggle,
}: {
  viewRole: OversightRole;
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const navGroups = role === "agrinas" ? AGRINAS_NAV : PEMERINTAH_NAV;
  const isAgrinas = role === "agrinas";

  const roleBadgeClass = isAgrinas
    ? "bg-aqua-50 text-aqua-700"
    : "bg-verdant-50 text-verdant-700";

  const roleLabel = isAgrinas ? "AGRINAS" : "PEMERINTAH";
  const roleIcon = isAgrinas ? (
    <Package size={10} />
  ) : (
    <ShieldCheck size={10} />
  );

  return (
    <div className="flex h-full flex-col">
      {/* Logo + role badge */}
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
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
              roleBadgeClass,
            )}
          >
            {roleIcon}
            {roleLabel}
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

      {/* Role context card */}
      {collapsed ? null : (
        <div className="mx-4 mb-4 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground">
            {isAgrinas ? "PT Agrinas Pangan Nusantara" : "Kementerian Pertanian RI"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isAgrinas ? "Operator protokol offtake" : "Pengawas regulasi (hanya baca)"}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav
        className={cn("flex-1 space-y-4 overflow-y-auto", collapsed ? "px-2" : "px-3")}
        aria-label="Menu pengawasan"
      >
        {navGroups.map((group) => (
          <div key={group.label ?? "utama"}>
            {group.label && !collapsed ? (
              <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.14em] text-ink-400 uppercase">
                {group.label}
              </p>
            ) : null}
            {group.label && collapsed ? (
              <div className="mx-2 mb-1 border-t border-border" />
            ) : null}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item)}
                  collapsed={collapsed}
                  viewRole={role}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: ganti peran + user info */}
      <div className={cn("border-t border-border py-4", collapsed ? "px-2" : "px-4")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                isAgrinas ? "bg-aqua-100 text-aqua-800" : "bg-verdant-100 text-verdant-800",
              )}
            >
              {isAgrinas ? "AG" : "PG"}
            </div>
            <Link
              href="/oversight"
              onClick={onNavigate}
              title="Ganti Peran"
              aria-label="Ganti Peran"
              className="rounded-md p-2 text-ink-500 transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  isAgrinas ? "bg-aqua-100 text-aqua-800" : "bg-verdant-100 text-verdant-800",
                )}
              >
                {isAgrinas ? "AG" : "PG"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {isAgrinas ? "Operator Agrinas" : "Petugas Pengawas"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAgrinas ? "Akses penuh operator" : "Hanya baca"}
                </p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-aqua-50 px-2 py-0.5 text-[10px] font-semibold text-aqua-700">
                <Wifi size={10} />
                Testnet
              </span>
            </div>
            <Link
              href="/oversight"
              onClick={onNavigate}
              className="mt-3 flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <LogOut size={16} />
              Ganti Peran
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export function OversightShell({
  viewRole: role,
  children,
}: {
  viewRole: OversightRole;
  children: ReactNode;
}) {
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
        <SidebarContent viewRole={role} collapsed={collapsed} onToggle={toggleCollapsed} />
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
            <SidebarContent viewRole={role} onNavigate={() => setOpen(false)} />
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
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
            role === "agrinas" ? "bg-aqua-50 text-aqua-700" : "bg-verdant-50 text-verdant-700",
          )}
        >
          {role === "agrinas" ? "AGRINAS" : "PEMERINTAH"}
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
