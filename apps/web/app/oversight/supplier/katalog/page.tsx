"use client";

/**
 * Katalog Saprotan (Supplier view) — catalog management only.
 * Dispatch moved to /oversight/supplier/logistik.
 *
 * Full-width table: kode, nama, kategori, satuan, harga pokok, subsidi, stok, region, aksi.
 * Add/Edit via side sheet (all fields). Hapus with confirm step.
 * All changes are local state (mock). Off-chain label shown subtly.
 * No em dashes anywhere in UI copy.
 */

import { OversightPageHeader } from "@/components/oversight/page-header";
import { TBody, THead, Table, TableFrame, Td, Th, Tr } from "@/components/kmp/table";
import { buildEditableCatalog } from "@/lib/oversight-data";
import type { StockStatus } from "@/lib/mock-data";
import { Badge, Button, Card, CardContent, CardHeader, Input, RupiahAmount, StatCard } from "@annona/ui";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Package,
  PackageX,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Fragment, useCallback, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type KategoriFilter = "semua" | "pupuk" | "benih" | "pestisida" | "alsintan";

interface CatalogEntry {
  id: string;
  code: string;
  name: string;
  category: "pupuk" | "benih" | "pestisida" | "alsintan";
  region: string;
  basePriceSupplier: bigint;
  unitLabel: string;
  subsidiFlag: boolean;
  source: string;
  stockStatus: StockStatus;
}

interface FormState {
  code: string;
  name: string;
  category: "pupuk" | "benih" | "pestisida" | "alsintan";
  unitLabel: string;
  basePriceWhole: string;
  subsidiFlag: "Subsidi" | "Non-subsidi";
  stockStatus: StockStatus;
  region: string;
  source: string;
}

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  category: "pupuk",
  unitLabel: "karung 50kg",
  basePriceWhole: "",
  subsidiFlag: "Non-subsidi",
  stockStatus: "Tersedia",
  region: "Jawa Barat",
  source: "",
};

const UNIT_PRESETS = [
  "karung 50kg",
  "karung 25kg",
  "kantong 5kg",
  "botol 400ml",
  "botol 1L",
  "unit",
];

// ─── Stock badge ──────────────────────────────────────────────────────────────

function StockBadge({ status }: { status: StockStatus }) {
  const map: Record<StockStatus, { tone: "success" | "warning" | "danger"; label: string }> = {
    Tersedia: { tone: "success", label: "Tersedia" },
    Menipis: { tone: "warning", label: "Menipis" },
    Habis: { tone: "danger", label: "Habis" },
  };
  const { tone, label } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

// ─── Category badge ───────────────────────────────────────────────────────────

function KategoriBadge({ cat }: { cat: CatalogEntry["category"] }) {
  const toneMap: Record<CatalogEntry["category"], "verdant" | "aqua" | "warning" | "neutral"> = {
    pupuk: "verdant",
    benih: "aqua",
    pestisida: "warning",
    alsintan: "neutral",
  };
  return <Badge tone={toneMap[cat]}>{cat}</Badge>;
}

// ─── Side sheet (add / edit) ──────────────────────────────────────────────────

function CatalogFormSheet({
  open,
  editingId,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  editingId: string | null;
  initial: FormState;
  onClose: () => void;
  onSave: (form: FormState, id: string | null) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Re-sync form when sheet opens with new initial values
  const prevOpen = useRef(false);
  if (open !== prevOpen.current) {
    prevOpen.current = open;
    if (open) {
      setForm(initial);
      setErrors({});
    }
  }

  // Schedule focus on first input when sheet opens (no autoFocus attr)
  if (open && firstInputRef.current && document.activeElement !== firstInputRef.current) {
    setTimeout(() => firstInputRef.current?.focus(), 30);
  }

  function patch(key: keyof FormState, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.code.trim()) errs.code = "Kode wajib diisi";
    if (!form.name.trim()) errs.name = "Nama wajib diisi";
    if (!form.basePriceWhole.trim() || Number.isNaN(Number(form.basePriceWhole.replace(/\D/g, "")))) {
      errs.basePriceWhole = "Harga pokok wajib diisi";
    }
    if (!form.region.trim()) errs.region = "Wilayah wajib diisi";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave(form, editingId);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Tutup panel"
      />
      {/* biome-ignore lint/a11y/useSemanticElements: side-sheet uses role="dialog" on div; native <dialog> lacks the CSS positioning primitives needed for this fixed-right layout */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editingId ? t("common.edit") : t("page.oversight.supplier.katalog.add")}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="font-semibold text-foreground">
              {editingId ? t("page.oversight.supplier.katalog.form.title") : t("page.oversight.supplier.katalog.add")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("page.oversight.supplier.katalog.desc")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Kode */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="form-code">
               {t("page.oversight.supplier.katalog.form.code")}
            </label>
            <input
              id="form-code"
              ref={firstInputRef}
              type="text"
              value={form.code}
              onChange={(e) => patch("code", e.target.value)}
              placeholder="Mis. UREA-50"
              className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
          </div>

          {/* Nama */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="form-name">
               {t("page.oversight.supplier.katalog.form.name")}
            </label>
            <Input
              id="form-name"
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="Mis. Pupuk Urea 50kg"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Kategori */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="form-category">
               {t("page.oversight.supplier.katalog.table.col.category")}
            </label>
            <select
              id="form-category"
              value={form.category}
              onChange={(e) => patch("category", e.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="pupuk">Pupuk</option>
              <option value="benih">Benih</option>
              <option value="pestisida">Pestisida</option>
              <option value="alsintan">Alsintan</option>
            </select>
          </div>

          {/* Satuan */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="form-unit">
              Satuan
            </label>
            <select
              id="form-unit"
              value={form.unitLabel}
              onChange={(e) => patch("unitLabel", e.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {UNIT_PRESETS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Harga Pokok */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="form-price">
               {t("page.oversight.supplier.katalog.form.price")}
            </label>
            <Input
              id="form-price"
              type="number"
              value={form.basePriceWhole}
              onChange={(e) => patch("basePriceWhole", e.target.value)}
              placeholder="Mis. 560000"
            />
            {errors.basePriceWhole && (
              <p className="mt-1 text-xs text-red-600">{errors.basePriceWhole}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Harga pokok = principal. Terkunci ke perjanjian saat dibuat (snapshot on-chain).
            </p>
          </div>

          {/* Subsidi */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="form-subsidi">
               Status Subsidi
            </label>
            <select
              id="form-subsidi"
              value={form.subsidiFlag}
              onChange={(e) => patch("subsidiFlag", e.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="Subsidi">Subsidi</option>
              <option value="Non-subsidi">Non-subsidi</option>
            </select>
          </div>

          {/* Status Stok */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="form-stock">
               Status Stok
            </label>
            <select
              id="form-stock"
              value={form.stockStatus}
              onChange={(e) => patch("stockStatus", e.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="Tersedia">Tersedia</option>
              <option value="Menipis">Menipis</option>
              <option value="Habis">Habis</option>
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="form-region">
              Wilayah
            </label>
            <Input
              id="form-region"
              value={form.region}
              onChange={(e) => patch("region", e.target.value)}
              placeholder="Mis. Jawa Barat"
            />
            {errors.region && <p className="mt-1 text-xs text-red-600">{errors.region}</p>}
          </div>

          {/* Sumber */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="form-source">
               {t("page.oversight.supplier.katalog.form.source")}
            </label>
            <Input
              id="form-source"
              value={form.source}
              onChange={(e) => patch("source", e.target.value)}
              placeholder="Mis. Pupuk Indonesia"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            {editingId ? t("page.oversight.supplier.katalog.form.save") : t("page.oversight.supplier.katalog.add")}
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Hapus confirm ────────────────────────────────────────────────────────────

function HapusConfirm({
  item,
  onConfirm,
  onCancel,
}: {
  item: CatalogEntry;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[1px]"
        onClick={onCancel}
        aria-label={t("common.cancel")}
      />
      {/* biome-ignore lint/a11y/useSemanticElements: confirm dialog uses role="dialog" on div; native <dialog> lacks the CSS positioning primitives needed for this centered overlay */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("page.oversight.supplier.katalog.form.delete")}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-sm rounded-[14px] bg-surface p-6 shadow-md">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <p className="font-semibold text-foreground">{t("page.oversight.supplier.katalog.form.delete")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{item.name}</span> ({item.code}) akan
            dihapus dari katalog. Perjanjian yang sudah dibuat tidak terpengaruh.
          </p>
          <div className="mt-5 flex gap-3">
            <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function KatalogPage() {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState<CatalogEntry[]>(() =>
    buildEditableCatalog().map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      category: r.category,
      region: r.region,
      basePriceSupplier: r.basePriceSupplier,
      unitLabel: r.unitLabel,
      subsidiFlag: r.subsidiFlag,
      source: r.source,
      stockStatus: r.stockStatus,
    })),
  );

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetInitial, setSheetInitial] = useState<FormState>(EMPTY_FORM);

  // Hapus confirm
  const [hapusTarget, setHapusTarget] = useState<CatalogEntry | null>(null);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [kategoriFilter, setKategoriFilter] = useState<KategoriFilter>("semua");

  const openAdd = useCallback(() => {
    setEditingId(null);
    setSheetInitial(EMPTY_FORM);
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((entry: CatalogEntry) => {
    setEditingId(entry.id);
    setSheetInitial({
      code: entry.code,
      name: entry.name,
      category: entry.category,
      unitLabel: entry.unitLabel,
      basePriceWhole: String(Number(entry.basePriceSupplier / 10_000_000n)),
      subsidiFlag: entry.subsidiFlag ? "Subsidi" : "Non-subsidi",
      stockStatus: entry.stockStatus,
      region: entry.region,
      source: entry.source,
    });
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback((form: FormState, id: string | null) => {
    const parsed = Number.parseInt(form.basePriceWhole.replace(/\D/g, ""), 10);
    const price = BigInt(parsed) * 10_000_000n;
    if (id) {
      // Edit existing
      setCatalog((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                code: form.code.trim(),
                name: form.name.trim(),
                category: form.category,
                unitLabel: form.unitLabel,
                basePriceSupplier: price,
                subsidiFlag: form.subsidiFlag === "Subsidi",
                stockStatus: form.stockStatus,
                region: form.region.trim(),
                source: form.source.trim(),
              }
            : row,
        ),
      );
    } else {
      // Add new
      const newId = `cat-new-${Date.now()}`;
      setCatalog((prev) => [
        ...prev,
        {
          id: newId,
          code: form.code.trim(),
          name: form.name.trim(),
          category: form.category,
          unitLabel: form.unitLabel,
          basePriceSupplier: price,
          subsidiFlag: form.subsidiFlag === "Subsidi",
          stockStatus: form.stockStatus,
          region: form.region.trim(),
          source: form.source.trim(),
        },
      ]);
    }
    setSheetOpen(false);
  }, []);

  const handleHapus = useCallback((entry: CatalogEntry) => {
    setHapusTarget(entry);
  }, []);

  const confirmHapus = useCallback(() => {
    if (!hapusTarget) return;
    setCatalog((prev) => prev.filter((r) => r.id !== hapusTarget.id));
    setHapusTarget(null);
  }, [hapusTarget]);

  // Derived
  const filtered = catalog.filter((row) => {
    const matchKat = kategoriFilter === "semua" || row.category === kategoriFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      row.name.toLowerCase().includes(q) ||
      row.code.toLowerCase().includes(q) ||
      row.region.toLowerCase().includes(q);
    return matchKat && matchSearch;
  });

  const stokHabis = catalog.filter((r) => r.stockStatus === "Habis").length;
  const stokMenipis = catalog.filter((r) => r.stockStatus === "Menipis").length;

  return (
    <div className="space-y-6">
      <OversightPageHeader
        title={t("page.oversight.supplier.katalog.title")}
        description={t("page.oversight.supplier.katalog.desc")}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={openAdd}
          >
            {t("page.oversight.supplier.katalog.add")}
          </Button>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t("page.oversight.supplier.katalog.total")}
          value={String(catalog.length)}
          hint={t("page.oversight.supplier.katalog.desc")}
          icon={<Package size={18} />}
        />
        <StatCard
          label="Stok Menipis"
          value={String(stokMenipis)}
          hint={t("page.oversight.supplier.katalog.desc")}
          tone={stokMenipis > 0 ? "warn" : "neutral"}
          icon={<AlertCircle size={18} />}
        />
        <StatCard
          label="Stok Habis"
          value={String(stokHabis)}
          hint={t("page.oversight.supplier.katalog.desc")}
          tone={stokHabis > 0 ? "bad" : "neutral"}
          icon={<PackageX size={18} />}
        />
        <StatCard
          label="Tersedia"
          value={String(catalog.filter((r) => r.stockStatus === "Tersedia").length)}
          hint={t("page.oversight.supplier.katalog.desc")}
          tone="good"
          icon={<CheckCircle2 size={18} />}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder={t("page.oversight.supplier.katalog.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[10px] border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["semua", "pupuk", "benih", "pestisida", "alsintan"] as KategoriFilter[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKategoriFilter(k)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                kategoriFilter === k
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:border-ring hover:text-foreground"
              }`}
            >
              {k === "semua" ? t("common.all") : k}
            </button>
          ))}
        </div>
      </div>

      {/* Off-chain note */}
      <p className="text-xs text-muted-foreground">
        {t("page.oversight.supplier.katalog.desc")}
      </p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <TableFrame>
            <Table>
              <THead>
                <Th>{t("page.oversight.supplier.katalog.table.col.code")}</Th>
                <Th>{t("page.oversight.supplier.katalog.table.col.name")}</Th>
                <Th>{t("page.oversight.supplier.katalog.table.col.category")}</Th>
                <Th>Satuan</Th>
                <Th className="text-right">{t("page.oversight.supplier.katalog.table.col.price")}</Th>
                <Th>{t("page.oversight.supplier.katalog.table.col.source")}</Th>
                <Th>Stok</Th>
                <Th>Wilayah</Th>
                <Th>{t("page.oversight.supplier.katalog.table.col.actions")}</Th>
              </THead>
              <TBody>
                {filtered.length === 0 ? (
                  <Tr>
                    <Td colSpan={9} className="py-10 text-center text-muted-foreground">
                      {t("page.oversight.supplier.katalog.table.empty")}
                    </Td>
                  </Tr>
                ) : (
                  filtered.map((row) => (
                    <Fragment key={row.id}>
                      <Tr>
                        <Td className="font-mono text-xs text-muted-foreground">{row.code}</Td>
                        <Td className="font-medium">{row.name}</Td>
                        <Td>
                          <KategoriBadge cat={row.category} />
                        </Td>
                        <Td className="text-xs text-muted-foreground">{row.unitLabel}</Td>
                        <Td className="text-right">
                          <RupiahAmount smallest={row.basePriceSupplier} className="text-sm" />
                        </Td>
                        <Td>
                          <Badge tone={row.subsidiFlag ? "success" : "neutral"}>
                            {row.subsidiFlag ? "Subsidi" : "Non-subsidi"}
                          </Badge>
                        </Td>
                        <Td>
                          <StockBadge status={row.stockStatus} />
                        </Td>
                        <Td className="text-xs text-muted-foreground">{row.region}</Td>
                        <Td>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-ring hover:text-foreground"
                            >
                              <Edit3 size={11} />
                              {t("common.edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHapus(row)}
                              className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:border-red-400 hover:bg-red-50"
                            >
                              <Trash2 size={11} />
                              {t("common.delete")}
                            </button>
                          </div>
                        </Td>
                      </Tr>
                    </Fragment>
                  ))
                )}
              </TBody>
            </Table>
          </TableFrame>
        </CardContent>
      </Card>

      {/* Side sheet */}
      <CatalogFormSheet
        open={sheetOpen}
        editingId={editingId}
        initial={sheetInitial}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
      />

      {/* Hapus confirm */}
      {hapusTarget && (
        <HapusConfirm
          item={hapusTarget}
          onConfirm={confirmHapus}
          onCancel={() => setHapusTarget(null)}
        />
      )}
    </div>
  );
}
