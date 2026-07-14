"use client";

import { cn } from "@annona/ui";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";

export interface SearchSelectItem {
  id: string;
  /** primary text, also what the search matches against (plus keywords) */
  label: string;
  /** secondary muted line */
  sublabel?: string;
  /** right-aligned extra (badge, amount) */
  extra?: ReactNode;
  /** additional search terms (kecamatan, commodity, status) */
  keywords?: string;
  disabled?: boolean;
  /** shown muted next to label when disabled */
  disabledReason?: string;
}

/** Searchable dropdown (combobox) used across KMP forms: pilih petani, pilih
 *  perjanjian, katalog. Type-to-filter, click-outside closes, keyboard basics.
 *  44px trigger (touch target), list capped with vertical scroll. */
export function SearchSelect({
  items,
  value,
  onChange,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  emptyText = "Tidak ada hasil.",
  className,
}: {
  items: SearchSelectItem[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = items.find((i) => i.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      `${i.label} ${i.sublabel ?? ""} ${i.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2.5 rounded-2xl border border-gray-100",
          "bg-white px-4 text-left text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring",
          selected ? "text-gray-900" : "text-gray-400",
        )}
      >
        <span className="min-w-0 truncate">
          {selected ? (
            <>
              <span className="font-semibold">{selected.label}</span>
              {selected.sublabel ? (
                <span className="ml-2 text-xs text-gray-500 font-normal">{selected.sublabel}</span>
              ) : null}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronsUpDown size={15} className="shrink-0 text-gray-400" />
      </button>

      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg p-1.5">
          <div className="flex items-center gap-2.5 border-b border-gray-50 px-4">
            <Search size={14} className="shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 font-semibold"
            />
          </div>
          <ul id={listId} className="max-h-64 overflow-y-auto py-1" aria-label={placeholder}>
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-gray-500 font-medium">{emptyText}</li>
            ) : (
              filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold rounded-xl transition-all",
                      "hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50",
                      item.id === value && "bg-soft-green text-gray-900",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-gray-900">
                        {item.label}
                        {item.disabled && item.disabledReason ? (
                          <span className="ml-2 text-xs font-normal text-gray-400">
                            ({item.disabledReason})
                          </span>
                        ) : null}
                      </span>
                      {item.sublabel ? (
                        <span className="block truncate text-xs text-gray-500 font-normal mt-0.5">
                          {item.sublabel}
                        </span>
                      ) : null}
                    </span>
                    {item.extra}
                    {item.id === value ? (
                      <Check size={15} className="shrink-0 text-emerald-700" />
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
