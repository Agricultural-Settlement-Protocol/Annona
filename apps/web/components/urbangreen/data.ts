/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TeamMember, RoadmapItem, LiveTelemetryCity } from "./types";

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "tm-1",
    name: "Suhardi",
    role: "Ketua KUD Cianjur Jaya",
    bio: "Bapak Suhardi memimpin KUD Cianjur Jaya sejak 2012, berfokus pada digitalisasi ekosistem pertanian desa dan adopsi pembiayaan transparan.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
  },
  {
    id: "tm-2",
    name: "Sri Ningsih",
    role: "Bendahara KUD Malang Makmur",
    bio: "Ibu Sri Ningsih mengelola keuangan dan penyaluran kredit saprotan dengan transparansi penuh untuk ratusan petani di wilayah Malang.",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop"
  },
  {
    id: "tm-3",
    name: "Ahmad Kusuma",
    role: "Penasihat Sektor Pertanian",
    bio: "Dr. Ahmad Kusuma mendampingi implementasi sensor IoT dan pemetaan produktivitas lahan padi di bawah naungan Koperasi Desa Merah Putih.",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop"
  },
  {
    id: "tm-4",
    name: "Budi Santoso",
    role: "Pengawas Independen",
    bio: "Bapak Budi Santoso bertindak sebagai auditor eksternal untuk memastikan keadilan bagi hasil netting pelunasan di Stellar blockchain.",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop"
  }
];

export const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    title: "Q1 2026: Integrasi dIDR & Stellar Node",
    description: "Uji coba awal dIDR dan integrasi Stellar blockchain.",
    details: [
      "Setup Node Validator Stellar lokal",
      "Pengembangan smart contract Soroban untuk netting otomatis",
      "Pilot project terbatas di Cianjur dengan 50 petani"
    ]
  },
  {
    title: "Q2 2026: Pendaftaran DID Petani",
    description: "Registrasi identitas digital terenkripsi untuk petani mitra.",
    details: [
      "Edukasi KUD tentang penyimpanan kunci privat aman",
      "Penerbitan 200+ DID petani terverifikasi",
      "Integrasi sensor timbangan IoT di gudang KUD"
    ]
  },
  {
    title: "Q3 2026: Netting Otomatis Saprotan",
    description: "Eksekusi pemotongan utang otomatis saat panen.",
    details: [
      "Penerapan audit kualitas (Grade A/B/C) otomatis",
      "Penyelesaian pembayaran instan ke wallet petani",
      "Laporan ledger terenkripsi untuk transparansi audit"
    ]
  },
  {
    title: "Q4 2026: Ekspansi Nasional",
    description: "Skalabilitas ke koperasi di seluruh wilayah Indonesia.",
    details: [
      "Sertifikasi kepatuhan dengan regulator & Bapanas",
      "Penyediaan pool likuiditas dIDR lebih besar",
      "Integrasi program pupuk bersubsidi dengan pemerintah"
    ]
  }
];

export const TELEMETRY_CITIES: LiveTelemetryCity[] = [
  {
    id: "cianjur",
    name: "Cianjur",
    country: "Indonesia",
    imageUrl: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800",
    plantHealth: 96,
    temperature: 26.5,
    humidity: 82,
    activeSensors: 142,
    co2Offset: 12.5
  },
  {
    id: "malang",
    name: "Malang",
    country: "Indonesia",
    imageUrl: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800",
    plantHealth: 98,
    temperature: 21.2,
    humidity: 78,
    activeSensors: 182,
    co2Offset: 24.3
  },
  {
    id: "subang",
    name: "Subang",
    country: "Indonesia",
    imageUrl: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800",
    plantHealth: 94,
    temperature: 28.0,
    humidity: 85,
    activeSensors: 115,
    co2Offset: 18.9
  },
  {
    id: "gayo",
    name: "Gayo",
    country: "Indonesia",
    imageUrl: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800",
    plantHealth: 95,
    temperature: 19.8,
    humidity: 90,
    activeSensors: 94,
    co2Offset: 9.4
  }
];
