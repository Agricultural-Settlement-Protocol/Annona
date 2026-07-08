"use client";

import { signOutToAuth } from "@/lib/supabase";
import { Logo, cn } from "@annona/ui";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  LayoutDashboard,
  Landmark,
  LogOut,
  Menu,
  Package,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Truck,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

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
      { href: "/oversight/agrinas/katalog", label: "Katalog Saprotan", icon: Package },
      { href: "/oversight/agrinas/logistik", label: "Logistik Saprotan", icon: Truck },
      { href: "/oversight/agrinas/penerimaan", label: "Penerimaan Panen", icon: PackageCheck },
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
        "group flex min-h-12 items-center rounded-2xl text-sm font-bold transition-all",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        collapsed ? "justify-center px-2 py-2" : "gap-3 px-4 py-2.5",
        active
          ? isAgrinas
            ? "bg-[#e7fafc] text-[#0c6a78]"
            : "bg-soft-green text-emerald-950"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
      )}
    >
      <Icon
        size={18}
        className={cn(
          "shrink-0 transition-colors",
          active
            ? isAgrinas
              ? "text-[#0c6a78]"
              : "text-emerald-800"
            : "text-gray-400 group-hover:text-gray-700",
        )}
      />
      {collapsed ? null : (
        <>
          {item.label}
          {active ? (
            <span
              className={cn(
                "ml-auto h-5 w-1 rounded-full",
                isAgrinas ? "bg-[#0c6a78]" : "bg-emerald-700",
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
    ? "bg-[#e7fafc] text-[#0c6a78] border border-[#c3f2f6]"
    : "bg-soft-green text-emerald-950 border border-soft-green/30";

  const roleLabel = isAgrinas ? "AGRINAS" : "PEMERINTAH";
  const roleIcon = isAgrinas ? (
    <Package size={10} className="text-[#0c6a78]" />
  ) : (
    <ShieldCheck size={10} className="text-emerald-800" />
  );

  return (
    <div className="flex h-full flex-col">
      {/* Logo + role badge. Row must never overflow the rail: logo link gets
          min-w-0, badge + toggle are shrink-0. Collapsed shows toggle only. */}
      <div
        className={cn(
          "flex items-center overflow-hidden pt-5 pb-4",
          collapsed ? "justify-center px-2" : "gap-2.5 px-4.5",
        )}
      >
        {collapsed ? null : (
          <>
            <Link
              href="/"
              onClick={onNavigate}
              aria-label="Annona"
              className="min-w-0 overflow-hidden"
            >
              <Logo className="h-6 w-auto" />
            </Link>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase shadow-sm",
                roleBadgeClass,
              )}
            >
              {roleIcon}
              {roleLabel}
            </span>
          </>
        )}
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Perlebar menu" : "Perkecil menu"}
            className={cn(
              "hidden shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-55 hover:text-gray-800 lg:block",
              collapsed ? "" : "ml-auto",
            )}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        ) : null}
      </div>

      {/* Role context card */}
      {collapsed ? null : (
        <div className={cn(
          "mx-4.5 mb-4 rounded-2xl border p-4 shadow-sm",
          isAgrinas 
            ? "border-[#c3f2f6] bg-[#e7fafc]/40" 
            : "border-soft-green/30 bg-soft-green/20"
        )}>
          <p className="text-sm font-bold text-gray-900 leading-snug">
            {isAgrinas ? "PT Agrinas Pangan Nusantara" : "Kementerian Pertanian RI"}
          </p>
          <p className="mt-1 text-xs font-semibold text-gray-500 leading-normal">
            {isAgrinas ? "Operator protokol offtake" : "Pengawas regional (hanya baca)"}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav
        className={cn("flex-1 space-y-4.5 overflow-y-auto pt-2", collapsed ? "px-2" : "px-3")}
        aria-label="Menu pengawasan"
      >
        {navGroups.map((group) => (
          <div key={group.label ?? "utama"} className="space-y-1.5">
            {group.label && !collapsed ? (
              <p className="px-4 pb-1 text-[10px] font-bold tracking-[0.14em] text-gray-400 uppercase">
                {group.label}
              </p>
            ) : null}
            {group.label && collapsed ? (
              <div className="mx-2 mb-1.5 border-t border-gray-100" />
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
      <div className={cn("border-t border-gray-100 py-4.5 bg-white", collapsed ? "px-2" : "px-4")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-sm",
                isAgrinas ? "bg-[#e7fafc] text-[#0c6a78]" : "bg-soft-green text-emerald-950",
              )}
            >
              {isAgrinas ? "AG" : "PG"}
            </div>
            <button
              type="button"
              onClick={() => void signOutToAuth()}
              title="Keluar"
              aria-label="Keluar"
              className="rounded-full p-2.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm",
                  isAgrinas ? "bg-[#e7fafc] text-[#0c6a78]" : "bg-soft-green text-emerald-950",
                )}
              >
                {isAgrinas ? "AG" : "PG"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">
                  {isAgrinas ? "Operator Agrinas" : "Petugas Pengawas"}
                </p>
                <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                  {isAgrinas ? "Akses penuh operator" : "Hanya baca"}
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[9px] font-bold text-cyan-800 border border-cyan-100">
                <Wifi size={10} />
                Testnet
              </span>
            </div>
            <button
              type="button"
              onClick={() => void signOutToAuth()}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-gray-100 px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <LogOut size={16} className="shrink-0" />
              Keluar
            </button>
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
    <div className="min-h-screen bg-[#fcf9f8] urbangreen-body">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-gray-100 bg-white lg:block",
          hydrated ? "transition-[width] duration-200" : "",
          railW,
        )}
      >
        <SidebarContent viewRole={role} collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              aria-label="Tutup menu"
              className="absolute inset-0 bg-black cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-72 bg-white border-r border-gray-100 shadow-xl"
            >
              <button
                type="button"
                aria-label="Tutup menu"
                className="absolute top-4 right-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
              <SidebarContent viewRole={role} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile topbar */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-100 bg-white/95 px-4 backdrop-blur-md lg:hidden">
        <button
          type="button"
          aria-label="Buka menu"
          className="rounded-full p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
        </button>
        <Logo className="h-6 w-auto" />
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase shadow-sm border",
            role === "agrinas" 
              ? "bg-[#e7fafc] text-[#0c6a78] border-[#c3f2f6]" 
              : "bg-soft-green text-emerald-950 border-soft-green/30",
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
