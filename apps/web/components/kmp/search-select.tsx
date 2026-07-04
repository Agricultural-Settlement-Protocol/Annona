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
          "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-border",
          "bg-surface px-3 text-left text-sm",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          selected ? "text-foreground" : "text-ink-400",
        )}
      >
        <span className="min-w-0 truncate">
          {selected ? (
            <>
              <span className="font-medium">{selected.label}</span>
              {selected.sublabel ? (
                <span className="ml-2 text-xs text-muted-foreground">{selected.sublabel}</span>
              ) : null}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronsUpDown size={15} className="shrink-0 text-ink-400" />
      </button>

      {open ? (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search size={14} className="shrink-0 text-ink-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-ink-400"
            />
          </div>
          <ul id={listId} className="max-h-64 overflow-y-auto py-1" aria-label={placeholder}>
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">{emptyText}</li>
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
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm",
                      "transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50",
                      item.id === value && "bg-verdant-50",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">
                        {item.label}
                        {item.disabled && item.disabledReason ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({item.disabledReason})
                          </span>
                        ) : null}
                      </span>
                      {item.sublabel ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.sublabel}
                        </span>
                      ) : null}
                    </span>
                    {item.extra}
                    {item.id === value ? (
                      <Check size={15} className="shrink-0 text-verdant-600" />
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
