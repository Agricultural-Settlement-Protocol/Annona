"use client";

import { signOutToAuth } from "@/lib/supabase";
import { Logo, cn } from "@annona/ui";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Wallet,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import "../../app/urbangreen/urbangreen.css";

/** Financier (Pemodal) dashboard shell. Amber/gold capital tone to distinguish
 *  from KMP (green) and Supplier (teal). Collapsible sidebar + localStorage
 *  persist + mobile drawer. Mirrors the KMP shell structure exactly. */

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
      {
        href: "/financier",
        label: "Ringkasan",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    label: "Pendanaan",
    items: [
      {
        href: "/financier/antrean",
        label: "Antrean Persetujuan",
        icon: ClipboardCheck,
      },
      {
        href: "/financier/portofolio",
        label: "Portofolio",
        icon: Wallet,
      },
    ],
  },
];

const STORAGE_KEY = "annona.financier.sidebar.collapsed";

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
        "group flex min-h-[44px] items-center rounded-xl text-sm font-semibold transition-all",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        collapsed ? "justify-center px-2.5 py-2.5" : "gap-3 px-4 py-2.5",
        active
          ? "bg-amber-50 text-amber-900 shadow-sm"
          : "text-gray-600 hover:bg-gray-100/50 hover:text-gray-900",
      )}
    >
      <Icon
        size={18}
        className={cn("shrink-0", active ? "text-amber-700" : "text-gray-400")}
      />
      {collapsed ? null : (
        <>
          <span>{item.label}</span>
          {active ? (
            <span
              className="ml-auto h-5 w-1 rounded-full bg-amber-500"
              aria-hidden
            />
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

  return (
    <div className="flex h-full flex-col">
      {/* Brand logo header */}
      <div
        className={cn(
          "flex items-center pt-5 pb-4",
          collapsed ? "justify-center px-2" : "gap-2 px-5",
        )}
      >
        {collapsed ? null : (
          <>
            <Link href="/" onClick={onNavigate} aria-label="Annona" className="min-w-0">
              <Logo size={20} className="shrink-0" />
            </Link>
            <span className="rounded-full bg-amber-50 border border-amber-200/60 px-2 py-0.5 text-[9px] font-mono font-bold tracking-wide text-amber-800 uppercase">
              PEMODAL
            </span>
          </>
        )}
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Perlebar menu" : "Perkecil menu"}
            className={cn(
              "hidden rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:block",
              collapsed ? "mt-2" : "ml-auto",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
        ) : null}
      </div>

      {/* Financier context card */}
      {collapsed ? null : (
        <div className="mx-4 mb-4 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2.5">
          <p className="text-sm font-semibold text-gray-900">LPDB Koperasi</p>
          <p className="mt-0.5 text-xs text-gray-500">Lembaga Pengelola Dana Bergulir</p>
        </div>
      )}

      {/* Navigation menu */}
      <nav
        className={cn(
          "flex-1 space-y-4 overflow-y-auto [scrollbar-width:thin]",
          "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300/60",
          "hover:[&::-webkit-scrollbar-thumb]:bg-gray-400/70",
          collapsed ? "px-2" : "px-3",
        )}
        aria-label="Menu pemodal"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label ?? "utama"}>
            {group.label && !collapsed ? (
              <p className="px-3 pb-1 text-[10px] font-bold tracking-[0.14em] text-gray-400 uppercase">
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
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile + logout footer */}
      <div
        className={cn(
          "border-t border-border py-4",
          collapsed ? "px-2" : "px-4",
        )}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800 border border-amber-200">
              LP
            </div>
            <button
              type="button"
              onClick={() => void signOutToAuth()}
              title="Keluar"
              aria-label="Keluar"
              className="rounded-md p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 border border-amber-200">
                LP
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground leading-tight">
                  Petugas LPDB
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Pemodal
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-mono font-bold text-amber-700 border border-amber-200/50">
                <Wifi size={9} className="animate-pulse" />
                Testnet
              </span>
            </div>
            <button
              type="button"
              onClick={() => void signOutToAuth()}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 hover:border-red-100"
            >
              <LogOut size={14} />
              Keluar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function FinancierShell({ children }: { children: ReactNode }) {
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
    <div className="urbangreen-body min-h-screen bg-[#fcf9f8] text-gray-900 font-sans antialiased">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-gray-100 bg-white lg:block",
          hydrated ? "transition-[width] duration-200" : "",
          railW,
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              aria-label="Tutup menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black pointer-events-auto"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-[#fcf9f8] p-6 shadow-2xl flex flex-col gap-6 overflow-y-auto border-r border-gray-100 pointer-events-auto"
            >
              <button
                type="button"
                aria-label="Tutup menu"
                className="absolute top-4 right-4 rounded-full p-2 text-gray-400 hover:bg-gray-100"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile topbar */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-100 bg-white/80 px-4 backdrop-blur-md lg:hidden">
        <button
          type="button"
          aria-label="Buka menu"
          className="rounded-full p-2 text-gray-700 hover:bg-gray-100"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
        </button>
        <Logo className="h-6 w-auto" />
        <span className="ml-auto rounded-full bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 text-[9px] font-mono font-bold text-amber-800 uppercase">
          PEMODAL
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
