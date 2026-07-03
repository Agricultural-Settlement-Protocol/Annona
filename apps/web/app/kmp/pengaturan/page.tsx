"use client";

/** Screen: Pengaturan — KMP cooperative settings.
 *  Demo-grade: all state is local, clearly labeled. No on-chain writes here.
 *  Sections: profil koperasi, dompet, preferensi perjanjian, bahasa/tampilan,
 *  notifikasi, tim pengurus. */

import { PageHeader } from "@/components/kmp/page-header";
import { MOCK_COOP, shortAddr } from "@/lib/mock-data";
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

function ProfilSection() {
  const [name, setName] = useState<string>(MOCK_COOP.name);
  const [kecamatan, setKecamatan] = useState<string>(MOCK_COOP.kecamatan);
  const [kabupaten, setKabupaten] = useState<string>(MOCK_COOP.kabupaten);
  const [provinsi, setProvinsi] = useState<string>(MOCK_COOP.provinsi);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  }

  return (
    <Card>
      <CardHeader
        title="Profil Koperasi"
        description="Informasi dasar koperasi. Disimpan lokal untuk demo."
        action={<Settings size={18} className="text-verdant-400" />}
      />
      <CardContent className="space-y-4">
        <Input
          label="Nama Koperasi"
          name="koop-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
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
          />
          <Input
            label="Kabupaten"
            name="koop-kabupaten"
            value={kabupaten}
            onChange={(e) => {
              setKabupaten(e.target.value);
              setSaved(false);
            }}
          />
          <Input
            label="Provinsi"
            name="koop-provinsi"
            value={provinsi}
            onChange={(e) => {
              setProvinsi(e.target.value);
              setSaved(false);
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="md" onClick={handleSave}>
            Simpan Profil
          </Button>
          {saved && (
            <Alert tone="success" className="py-1.5 px-3 text-sm">
              Tersimpan (lokal, demo)
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section 2: Dompet dan Jaringan ─────────────────────────────────────────

function DompetSection() {
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
    <Card>
      <CardHeader
        title="Dompet dan Jaringan"
        description="Dompet Freighter yang terhubung ke sesi ini."
        action={<Wallet size={18} className="text-aqua-400" />}
      />
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Alamat Dompet</p>
            <p
              className="mt-0.5 font-mono text-sm text-foreground"
              title={MOCK_COOP.walletAddress}
            >
              {MOCK_COOP.walletAddress}
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              ({shortAddr(MOCK_COOP.walletAddress)})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="aqua">Stellar Testnet</Badge>
            <Lock size={14} className="text-muted-foreground" />
          </div>
        </div>

        {disconnected ? (
          <Alert tone="warning">
            Dompet telah diputus (simulasi). Muat ulang halaman untuk menghubungkan kembali.
          </Alert>
        ) : disconnecting ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
            <p className="text-sm font-medium text-red-700">
              Yakin ingin memutus dompet dari sesi ini?
            </p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={handleDisconnect}>
                Ya, Putuskan
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDisconnecting(false)}
              >
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="md" onClick={handleDisconnect}>
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
    <Card>
      <CardHeader
        title="Preferensi Perjanjian"
        description="Nilai awal saat membuat perjanjian baru. Bisa diubah per perjanjian."
        action={<Shield size={18} className="text-verdant-400" />}
      />
      <CardContent className="space-y-4">
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
            hint="Default: 20%"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Nilai ini hanya digunakan sebagai nilai awal saat membuat perjanjian baru, tetap bisa
          diubah per perjanjian.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="md" onClick={handleSave}>
            Simpan Preferensi
          </Button>
          {saved && (
            <Alert tone="success" className="py-1.5 px-3 text-sm">
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
    <Card>
      <CardHeader
        title="Bahasa dan Tampilan"
        description="Preferensi antarmuka. Bahasa Inggris tersedia via next-intl."
        action={<Globe size={18} className="text-aqua-400" />}
      />
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="select-lang" className="mb-1.5 block text-sm font-medium text-foreground">
              Bahasa
            </label>
            <select
              id="select-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
            {language === "en" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Terjemahan penuh segera tersedia lewat next-intl.
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <label htmlFor="select-theme" className="text-sm font-medium text-foreground">
                Tema
              </label>
              <Badge tone="neutral">Segera</Badge>
            </div>
            <select
              id="select-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none disabled:opacity-50"
            >
              <option value="light">Terang</option>
              <option value="dark">Gelap</option>
              <option value="system">Sistem</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
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
    <Card>
      <CardHeader
        title="Notifikasi"
        description="Pilih jenis notifikasi yang ingin diterima (lokal, demo)."
        action={<Bell size={18} className="text-verdant-400" />}
      />
      <CardContent className="space-y-3">
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
            hint: "Residu pokok Agrinas belum diremitkan lebih dari 14 hari",
            checked: notifResidu,
            onChange: () => setNotifResidu((v) => !v),
          },
        ].map(({ id, label, hint, checked, onChange }) => (
          <label
            key={id}
            htmlFor={id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-surface-muted transition-colors"
          >
            <input
              id={id}
              type="checkbox"
              checked={checked}
              onChange={onChange}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-primary"
            />
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
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
    <Card>
      <CardHeader
        title="Tim Pengurus"
        description="Daftar pengurus yang memiliki akses ke dasbor KMP ini."
        action={<Users size={18} className="text-muted-foreground" />}
      />
      <CardContent className="space-y-3">
        {TEAM.map((member) => (
          <div
            key={member.name}
            className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-verdant-100 text-sm font-bold text-verdant-800">
              {member.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
            </div>
            <Badge tone="verdant">{member.role}</Badge>
          </div>
        ))}

        <div className="pt-1">
          <Button variant="outline" size="sm" disabled leftIcon={<Monitor size={14} />}>
            Undang Pengurus
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Manajemen tim pengurus akan segera tersedia.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PengaturanPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Konfigurasi koperasi, dompet, preferensi, dan tim pengurus."
      />

      <ProfilSection />
      <DompetSection />
      <PreferensiSection />
      <BahasaSection />
      <NotifikasiSection />
      <TimSection />
    </div>
  );
}
