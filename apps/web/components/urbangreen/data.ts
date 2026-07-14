/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TeamMember, RoadmapItem, LiveTelemetryCity } from "./types";

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "tm-1",
    name: "Suhardi",
    role: "Chairman of KUD Cianjur Jaya",
    bio: "Mr. Suhardi has led the Cianjur Jaya cooperative since 2012, focusing on digitalizing local agricultural ecosystems and adopting transparent financing models.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
  },
  {
    id: "tm-2",
    name: "Sri Ningsih",
    role: "Treasurer of KUD Malang Makmur",
    bio: "Mrs. Sri Ningsih manages financial accounts and agricultural input credit distribution with absolute transparency for hundreds of farmers in Malang.",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop"
  },
  {
    id: "tm-3",
    name: "Ahmad Kusuma",
    role: "Agricultural Sector Advisor",
    bio: "Dr. Ahmad Kusuma oversees IoT sensor implementation and crop yield mapping under the Merah Putih Cooperative.",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop"
  },
  {
    id: "tm-4",
    name: "Budi Santoso",
    role: "Independent Auditor",
    bio: "Mr. Budi Santoso serves as an external auditor to ensure fairness and cryptographic integrity of netting settlements on the Stellar blockchain.",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop"
  }
];

export const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    title: "Q1 2026: dIDR & Stellar Node Integration",
    description: "Initial testing of Digital Rupiah (dIDR) and Stellar blockchain node setup.",
    details: [
      "Deploy local Stellar validator node infrastructure",
      "Develop Soroban smart contracts for automated netting settlements",
      "Launch restricted pilot project in Cianjur with 50 local farmers"
    ]
  },
  {
    title: "Q2 2026: Decentralized ID (DID) Registration",
    description: "Enrolling encrypted digital identities for partner farmers.",
    details: [
      "Train cooperative admins on secure private key management",
      "Issue 200+ verified farmer DIDs on the Stellar ledger",
      "Integrate IoT digital weighing scale telemetry at cooperative warehouses"
    ]
  },
  {
    title: "Q3 2026: Automated Offtake Settlement Netting",
    description: "Executing automated debt-to-yield netting settlements upon harvest delivery.",
    details: [
      "Implement rule-based automatic crop quality grading (Grade A/B/C)",
      "Settle net profits instantly to farmers' digital wallets",
      "Publish encrypted, auditable transaction ledgers"
    ]
  },
  {
    title: "Q4 2026: Nationwide Expansion",
    description: "Scaling the settlement protocol to agricultural cooperatives across Indonesia.",
    details: [
      "Acquire regulatory sandbox clearance with financial and agricultural authorities",
      "Expand dIDR liquidity pools for larger cooperative volumes",
      "Integrate government-subsidized fertilizer tracking programs"
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
