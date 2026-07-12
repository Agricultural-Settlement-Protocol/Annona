"use client";

/** Screen: Pengaturan — KMP cooperative settings.
 *  Demo-grade: all state is local, clearly labeled. No on-chain writes here.
 *  Sections: profil koperasi, dompet, preferensi perjanjian, bahasa/tampilan,
 *  notifikasi, tim pengurus. */

import { type ApiCoop, fetchCoop } from "@/lib/api";
import { PageHeader } from "@/components/kmp/page-header";
import { useApi } from "@/lib/use-api";
import { shortAddr } from "@/lib/mock-data";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
} from "@annona/ui";
import {
  Bell,
  Globe,
  Lock,
  Monitor,
  Settings,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";

// ─── Section 1: Profil Koperasi ──────────────────────────────────────────────

function ProfilSection({ coop }: { coop: ApiCoop }) {
  const [name, setName] = useState<string>(coop.name);
  const [kecamatan, setKecamatan] = useState<string>(coop.kecamatan);
  const [kabupaten, setKabupaten] = useState<string>(coop.kabupaten);
  const [provinsi, setProvinsi] = useState<string>(coop.provinsi);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  }

  return (
    <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
      <CardHeader
        title="Profil Koperasi"
        description="Informasi dasar koperasi. Disimpan lokal untuk demo."
        action={<Settings size={18} className="text-emerald-700" />}
        className="pb-3"
      />
      <CardContent className="space-y-4 pt-3">
        <Input
          label="Nama Koperasi"
          name="koop-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          className="rounded-2xl border-gray-150"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Kecamatan"
            name="koop-kecamatan"
            value={kecamatan}
            onChange={(e) => {
              setKecamatan(e.target.value);
              setSaved(false);
            }}
            className="rounded-2xl border-gray-150"
          />
          <Input
            label="Kabupaten"
            name="koop-kabupaten"
            value={kabupaten}
            onChange={(e) => {
              setKabupaten(e.target.value);
              setSaved(false);
            }}
            className="rounded-2xl border-gray-150"
          />
          <Input
            label="Provinsi"
            name="koop-provinsi"
            value={provinsi}
            onChange={(e) => {
              setProvinsi(e.target.value);
              setSaved(false);
            }}
            className="rounded-2xl border-gray-150"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSave}
            className="rounded-full bg-primary-dark hover:bg-opacity-95 text-white px-5 py-2.5"
          >
            Simpan Profil
          </Button>
          {saved && (
            <Alert tone="success" className="py-1.5 px-3 text-sm rounded-xl">
              Tersimpan (lokal, demo)
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section 2: Dompet dan Jaringan ─────────────────────────────────────────

function DompetSection({ coop }: { coop: ApiCoop }) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnected, setDisconnected] = useState(false);

  function handleDisconnect() {
    if (disconnecting) {
      setDisconnected(true);
      setDisconnecting(false);
    } else {
      setDisconnecting(true);
    }
  }

  return (
    <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
      <CardHeader
        title="Dompet dan Jaringan"
        description="Dompet Freighter yang terhubung ke sesi ini."
        action={<Wallet size={18} className="text-cyan-800" />}
        className="pb-3"
      />
      <CardContent className="space-y-4 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 shadow-sm">
          <div>
            <p className="text-xs font-bold text-gray-400">Alamat Dompet</p>
            <p
              className="mt-0.5 font-mono text-sm text-foreground"
              title={coop.walletAddress}
            >
              {coop.walletAddress}
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              ({shortAddr(coop.walletAddress)})
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Badge tone="aqua" className="rounded-full font-bold">
              Stellar Testnet
            </Badge>
            <Lock size={14} className="text-gray-400" />
          </div>
        </div>

        {disconnected ? (
          <Alert tone="warning" className="rounded-xl">
            Dompet telah diputus (simulasi). Muat ulang halaman untuk
            menghubungkan kembali.
          </Alert>
        ) : disconnecting ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5 space-y-3 shadow-sm">
            <p className="text-sm font-bold text-red-700">
              Yakin ingin memutus dompet dari sesi ini?
            </p>
            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDisconnect}
                className="rounded-full bg-red-600 hover:bg-opacity-95 text-white"
              >
                Ya, Putuskan
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDisconnecting(false)}
                className="rounded-full"
              >
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleDisconnect}
            className="rounded-full"
          >
            Putuskan Dompet
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section 3: Preferensi Perjanjian ───────────────────────────────────────

function PreferensiSection() {
  const [markup, setMarkup] = useState("10");
  const [handling, setHandling] = useState("5");
  const [toleransi, setToleransi] = useState("20");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  }

  return (
    <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
      <CardHeader
        title="Preferensi Perjanjian"
        description="Nilai awal saat membuat perjanjian baru. Bisa diubah per perjanjian."
        action={<Shield size={18} className="text-emerald-700" />}
        className="pb-3"
      />
      <CardContent className="space-y-4 pt-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Markup Saprotan (%)"
            name="pref-markup"
            type="number"
            min="0"
            max="100"
            step="1"
            value={markup}
            onChange={(e) => {
              setMarkup(e.target.value);
              setSaved(false);
            }}
            className="rounded-2xl border-gray-150"
            hint="Default: 10%"
          />
          <Input
            label="Biaya Penanganan HPP (%)"
            name="pref-handling"
            type="number"
            min="0"
            max="100"
            step="1"
            value={handling}
            onChange={(e) => {
              setHandling(e.target.value);
              setSaved(false);
            }}
            className="rounded-2xl border-gray-150"
            hint="Default: 5%"
          />
          <Input
            label="Toleransi Setoran (%)"
            name="pref-toleransi"
            type="number"
            min="0"
            max="100"
            step="1"
            value={toleransi}
            onChange={(e) => {
              setToleransi(e.target.value);
              setSaved(false);
            }}
            className="rounded-2xl border-gray-150"
            hint="Default: 20%"
          />
        </div>
        <p className="text-xs text-gray-500 font-semibold leading-relaxed pt-1">
          Nilai ini hanya digunakan sebagai nilai awal saat membuat perjanjian
          baru, tetap bisa diubah per perjanjian.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSave}
            className="rounded-full bg-primary-dark hover:bg-opacity-95 text-white px-5 py-2.5"
          >
            Simpan Preferensi
          </Button>
          {saved && (
            <Alert tone="success" className="py-1.5 px-3 text-sm rounded-xl">
              Tersimpan (lokal, demo)
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section 4: Bahasa dan Tampilan ─────────────────────────────────────────

function BahasaSection() {
  const [language, setLanguage] = useState("id");
  const [theme, setTheme] = useState("light");

  return (
    <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
      <CardHeader
        title="Bahasa dan Tampilan"
        description="Preferensi antarmuka. Bahasa Inggris tersedia via next-intl."
        action={<Globe size={18} className="text-cyan-800" />}
        className="pb-3"
      />
      <CardContent className="space-y-4 pt-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="select-lang"
              className="mb-2 block text-sm font-bold text-gray-900"
            >
              Bahasa
            </label>
            <select
              id="select-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-100 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
            {language === "en" && (
              <p className="mt-1.5 text-xs text-gray-500 font-semibold">
                Terjemahan penuh segera tersedia lewat next-intl.
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <label
                htmlFor="select-theme"
                className="text-sm font-bold text-gray-900"
              >
                Tema
              </label>
              <Badge tone="neutral" className="rounded-full font-bold">
                Segera
              </Badge>
            </div>
            <select
              id="select-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled
              className="h-12 w-full rounded-2xl border border-gray-100 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none disabled:opacity-50"
            >
              <option value="light">Terang</option>
              <option value="dark">Gelap</option>
              <option value="system">Sistem</option>
            </select>
            <p className="mt-1.5 text-xs text-gray-400 font-semibold">
              Dukungan tema gelap sedang dikembangkan.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section 5: Notifikasi ───────────────────────────────────────────────────

function NotifikasiSection() {
  const [notifSetoran, setNotifSetoran] = useState(true);
  const [notifPanen, setNotifPanen] = useState(true);
  const [notifResidu, setNotifResidu] = useState(false);

  return (
    <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
      <CardHeader
        title="Notifikasi"
        description="Pilih jenis notifikasi yang ingin diterima (lokal, demo)."
        action={<Bell size={18} className="text-emerald-700" />}
        className="pb-3"
      />
      <CardContent className="space-y-4 pt-3">
        {[
          {
            id: "notif-setoran",
            label: "Setoran panen baru",
            hint: "Petani menyetor panen ke gudang",
            checked: notifSetoran,
            onChange: () => setNotifSetoran((v) => !v),
          },
          {
            id: "notif-panen",
            label: "Jadwal panen mendekat",
            hint: "Panen perkiraan dalam 7 hari ke depan",
            checked: notifPanen,
            onChange: () => setNotifPanen((v) => !v),
          },
          {
            id: "notif-residu",
            label: "Residu jatuh tempo",
            hint: "Residu pokok Supplier belum diremitkan lebih dari 14 hari",
            checked: notifResidu,
            onChange: () => setNotifResidu((v) => !v),
          },
        ].map(({ id, label, hint, checked, onChange }) => (
          <label
            key={id}
            htmlFor={id}
            className="flex cursor-pointer items-start gap-3.5 rounded-2xl border border-gray-100 p-4.5 bg-white shadow-sm hover:bg-gray-50 transition-colors"
          >
            <input
              id={id}
              type="checkbox"
              checked={checked}
              onChange={onChange}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary accent-primary"
            />
            <div>
              <p className="text-sm font-bold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">
                {hint}
              </p>
            </div>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Section 6: Tim Pengurus ─────────────────────────────────────────────────

function TimSection() {
  const TEAM = [
    { initials: "HU", name: "H. Usman", role: "Ketua" },
    { initials: "IS", name: "Ibu Sari", role: "Bendahara" },
  ];

  return (
    <Card className="rounded-[2rem] border-gray-100 bg-white shadow-sm overflow-hidden p-5 sm:p-6">
      <CardHeader
        title="Tim Pengurus"
        description="Daftar pengurus yang memiliki akses ke dasbor KMP ini."
        action={<Users size={18} className="text-gray-400" />}
        className="pb-3"
      />
      <CardContent className="space-y-4 pt-3">
        {TEAM.map((member) => (
          <div
            key={member.name}
            className="flex items-center gap-3.5 rounded-2xl border border-gray-100 px-4.5 py-4 bg-white shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 border border-emerald-200">
              {member.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">
                {member.name}
              </p>
            </div>
            <Badge tone="verdant" className="rounded-full font-bold">
              {member.role}
            </Badge>
          </div>
        ))}

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            leftIcon={<Monitor size={14} />}
            className="rounded-full"
          >
            Undang Pengurus
          </Button>
          <p className="mt-2 text-xs text-gray-500 font-medium">
            Manajemen tim pengurus akan segera tersedia.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PengaturanPage() {
  const { data, loading, error } = useApi(fetchCoop);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Konfigurasi koperasi, dompet, preferensi, dan tim pengurus."
      />

      {loading && (
        <p className="text-sm text-muted-foreground">
          Memuat pengaturan koperasi...
        </p>
      )}
      {error && (
        <Alert tone="warning" title="Gagal memuat data koperasi">
          {error}
        </Alert>
      )}

      {data && <ProfilSection coop={data.coop} />}
      {data && <DompetSection coop={data.coop} />}
      <PreferensiSection />
      <BahasaSection />
      <NotifikasiSection />
      <TimSection />
    </div>
  );
}
