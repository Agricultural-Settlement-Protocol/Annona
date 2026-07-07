"use client";

/**
 * DateRangePicker — single-month calendar popover.
 * First click sets start, second click sets end; clicking again restarts.
 * Trigger label: "Semua tanggal" or "1 Jun 2026 sampai 30 Jun 2026" (no em dash).
 * Reused on Setor Panen and Pembayaran history panels.
 * Built with plain Date math; no external date library needed.
 */

import { cn } from "@annona/ui";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTHS_SHORT_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agt",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function floorToDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInRange(d: Date, start: Date, end: Date): boolean {
  const t = floorToDay(d);
  return t >= floorToDay(start) && t <= floorToDay(end);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}

function formatDisplay(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  /** "start" = next click sets the start date; "end" = next click sets the end date. */
  const [picking, setPicking] = useState<"start" | "end">("start");
  const [hover, setHover] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Click outside closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleDayClick(day: Date) {
    if (!value.start || picking === "start") {
      // Start fresh or restart selection
      onChange({ start: day, end: null });
      setPicking("end");
    } else {
      // picking === "end": place end date, swap if needed
      const s = floorToDay(value.start);
      const d = floorToDay(day);
      if (d < s) {
        onChange({ start: day, end: value.start });
      } else {
        onChange({ start: value.start, end: day });
      }
      setPicking("start");
      setOpen(false);
    }
  }

  function handleReset() {
    onChange({ start: null, end: null });
    setPicking("start");
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const days = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);

  // Build calendar grid cells; null entries are leading empty slots.
  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(viewYear, viewMonth, d));

  const triggerLabel = (() => {
    if (!value.start) return "Semua tanggal";
    if (!value.end) return `${formatDisplay(value.start)} sampai ...`;
    return `${formatDisplay(value.start)} sampai ${formatDisplay(value.end)}`;
  })();

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <Calendar size={14} className="shrink-0 text-muted-foreground" />
        <span className="whitespace-nowrap">{triggerLabel}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-surface p-4 shadow-md">
          {/* Month navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded p-1 hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {MONTHS_ID[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded p-1 hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {DAYS_ID.map((d) => (
              <div key={d} className="py-0.5 text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day)
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: leading pad cells are positional placeholders that never reorder
                  <div key={`e-${i}`} aria-hidden />
                );

              const { start, end } = value;
              const isStart = !!start && isSameDay(day, start);
              const isEnd = !!end && isSameDay(day, end);
              const inRange = !!start && !!end && isInRange(day, start, end);

              // Hover preview range while picking end
              let inHoverRange = false;
              if (value.start && !value.end && hover && picking === "end") {
                const hStart =
                  floorToDay(hover) < floorToDay(value.start) ? hover : value.start;
                const hEnd =
                  floorToDay(hover) < floorToDay(value.start) ? value.start : hover;
                inHoverRange = isInRange(day, hStart, hEnd);
              }

              return (
                <button
                  key={`${viewYear}-${viewMonth}-${day.getDate()}`}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => setHover(day)}
                  onMouseLeave={() => setHover(null)}
                  className={cn(
                    "py-1.5 text-center text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
                    isStart || isEnd
                      ? "rounded-full bg-primary font-semibold text-primary-foreground"
                      : inRange
                        ? "bg-verdant-100 text-verdant-800"
                        : inHoverRange
                          ? "bg-verdant-50 text-verdant-700"
                          : "rounded text-foreground hover:bg-surface-muted",
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Reset */}
          {(value.start || value.end) && (
            <div className="mt-3 border-t border-border pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus:outline-none"
              >
                <X size={12} />
                Hapus filter
              </button>
            </div>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            {!value.start || picking === "start"
              ? "Klik untuk pilih tanggal mulai"
              : "Klik untuk pilih tanggal akhir"}
          </p>
        </div>
      )}
    </div>
  );
}
