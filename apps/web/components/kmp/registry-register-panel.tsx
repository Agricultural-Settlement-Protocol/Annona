"use client";

// Registration panel for Screen B (Farmer Registry). PERSISTS to Postgres via
// POST /farmers (off-chain: raw KTP + name are PII stored server-side; the server
// computes ktp_hash). Survives a refresh, and any officer can register — no
// wallet/chain needed.

import { type ApiFarmer, type CreateFarmerInput, createFarmer } from "@/lib/api";
import { Alert, Button, Input, type SubsidyStatus } from "@annona/ui";
import { X } from "lucide-react";
import { useState } from "react";

interface RegForm {
  name: string;
  ktp: string;
  wallet: string;
  lahan: string;
  commodity: string;
  kecamatan: string;
  subsidyStatus: SubsidyStatus;
}

const EMPTY_FORM: RegForm = {
  name: "",
  ktp: "",
  wallet: "",
  lahan: "",
  commodity: "GABAH",
  kecamatan: "",
  // Officer sets e-RDKK verification at registration; default to not-yet-verified.
  subsidyStatus: "Belum",
};

export function RegistryRegisterPanel({
  onSuccess,
  onClose,
}: {
  onSuccess: (farmer: ApiFarmer) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RegForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(k: keyof RegForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const lahan = Number.parseFloat(form.lahan);
    if (
      !form.name.trim() ||
      !form.ktp.trim() ||
      !form.kecamatan.trim() ||
      Number.isNaN(lahan) ||
      lahan <= 0
    ) {
      setError("Lengkapi semua kolom wajib (bintang merah).");
      return;
    }
    setLoading(true);

    // Raw KTP goes to the server (HTTPS) which stores it (PII home = Postgres)
    // and computes ktp_hash. The wallet is optional; the server generates a
    // placeholder if the officer left it blank.
    const payload: CreateFarmerInput = {
      name: form.name.trim(),
      ktpRaw: form.ktp.trim(),
      walletAddress: form.wallet.trim() || undefined,
      plotAreaHa: lahan,
      defaultCommodityCode: form.commodity,
      kecamatan: form.kecamatan.trim(),
      subsidyStatus: form.subsidyStatus,
    };

    try {
      const created = await createFarmer(payload);
      onSuccess(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan petani.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[2.5rem] border border-soft-green/35 bg-[#ebf5e9]/95 backdrop-blur-md p-8 shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Daftarkan Petani Baru</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup formulir"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-white hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {error ? (
        <Alert tone="danger" className="mb-5 rounded-2xl">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Nama Lengkap"
            name="reg-name"
            placeholder="Budi Santoso"
            value={form.name}
            onChange={set("name")}
            required
            className="rounded-2xl border-gray-100"
          />
          <Input
            label="No. KTP"
            name="reg-ktp"
            placeholder="3201XXXXXXXXXXXX"
            value={form.ktp}
            onChange={set("ktp")}
            hint="Di-hash SHA-256 sebelum dicatat ke chain. Nomor asli tidak pernah ke chain."
            required
            className="rounded-2xl border-gray-100"
          />
          <Input
            label="Alamat Wallet Stellar"
            name="reg-wallet"
            placeholder="G..."
            value={form.wallet}
            onChange={set("wallet")}
            hint="Kosongkan untuk dibuat otomatis (simulasi demo)"
            className="rounded-2xl border-gray-100"
          />
          <Input
            label="Kecamatan"
            name="reg-kecamatan"
            placeholder="Sukamaju"
            value={form.kecamatan}
            onChange={set("kecamatan")}
            required
            className="rounded-2xl border-gray-100"
          />
          <Input
            label="Luas Lahan (ha)"
            name="reg-lahan"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.80"
            value={form.lahan}
            onChange={set("lahan")}
            required
            className="rounded-2xl border-gray-100"
          />
          <div className="w-full">
            <label
              htmlFor="reg-commodity"
              className="mb-2 block text-sm font-bold text-gray-900"
            >
              Komoditas Utama
            </label>
            <select
              id="reg-commodity"
              value={form.commodity}
              onChange={set("commodity")}
              className="h-12 w-full rounded-2xl border border-gray-100 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            >
              <option value="GABAH">Gabah Kering Panen</option>
              <option value="JAGUNG">Jagung Pipilan Kering</option>
            </select>
          </div>
          <div className="w-full">
            <label
              htmlFor="reg-subsidy"
              className="mb-2 block text-sm font-bold text-gray-900"
            >
              Status e-RDKK (Subsidi)
            </label>
            <select
              id="reg-subsidy"
              value={form.subsidyStatus}
              onChange={set("subsidyStatus")}
              className="h-12 w-full rounded-2xl border border-gray-100 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            >
              <option value="Terverifikasi">e-RDKK Terverifikasi (berhak HET)</option>
              <option value="Belum">Belum Terverifikasi</option>
              <option value="NonSubsidi">Non-Subsidi (harga komersial)</option>
            </select>
            <p className="mt-2 text-xs font-medium text-gray-500">
              Menentukan apakah petani berhak atas pupuk bersubsidi (HET) saat buat perjanjian.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-full px-5 py-2.5">
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="rounded-full px-6 py-2.5 bg-primary-dark hover:bg-opacity-95">
            {loading ? "Memproses..." : "Daftarkan Petani"}
          </Button>
        </div>
      </form>
    </div>
  );
}
