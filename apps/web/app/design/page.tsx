import type { Status } from "@annona/core";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  EmptyState,
  Input,
  Logo,
  LogoMark,
  MeshBackground,
  ProgressBar,
  ReputationBadge,
  RupiahAmount,
  Section,
  Skeleton,
  StatCard,
  StatusBadge,
  TxHashLink,
} from "@annona/ui";
import { Sprout, Wheat } from "lucide-react";

export const metadata = { title: "Design System, Annona" };

// Hex maps mirror packages/ui/src/styles/tokens.css. Inline style avoids
// Tailwind's static-class scanner missing dynamically-built class names.
const VERDANT: [string, string][] = [
  ["50", "#f3f8ec"],
  ["100", "#e3f0d2"],
  ["200", "#cce0a9"],
  ["300", "#b0cd7e"],
  ["400", "#95ba56"],
  ["500", "#79a23b"],
  ["600", "#5f8130"],
  ["700", "#4a6528"],
  ["800", "#3b4f24"],
  ["900", "#2f4020"],
  ["950", "#18230f"],
];
const AQUA: [string, string][] = [
  ["50", "#eafafb"],
  ["100", "#cdf0f2"],
  ["200", "#a7e2e7"],
  ["300", "#74cdd5"],
  ["400", "#45b2bd"],
  ["500", "#2898a5"],
  ["600", "#1f7a86"],
  ["700", "#1f626c"],
  ["800", "#204e56"],
  ["900", "#1e4149"],
  ["950", "#0e2a30"],
];
const INK: [string, string][] = [
  ["50", "#f6f7f4"],
  ["100", "#eceee9"],
  ["200", "#d7dbd2"],
  ["300", "#b8bfb0"],
  ["400", "#939c8a"],
  ["500", "#737c6a"],
  ["600", "#5a6253"],
  ["700", "#474e42"],
  ["800", "#353a31"],
  ["900", "#262b22"],
  ["950", "#181b15"],
];
const STATUSES: Status[] = [
  "Created",
  "PartiallyDelivered",
  "Delivered",
  "Settled",
  "Flagged",
  "ForceMajeure",
];

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="space-y-1">
      <div className="h-14 rounded-md border border-border" style={{ backgroundColor: hex }} />
      <p className="text-xs text-muted-foreground">{name}</p>
      <p className="font-mono text-[10px] text-ink-400">{hex}</p>
    </div>
  );
}

export default function DesignSystem() {
  return (
    <div className="min-h-screen">
      {/* Hero shows the signature treatment */}
      <MeshBackground scanlines>
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Logo size={32} />
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-foreground">Design System</h1>
          <p className="mt-2 max-w-2xl text-ink-700">
            Living reference for Annona. Warna, font, dan komponen. Diturunkan dari logo. Lihat
            docs/DESIGN_GUIDE.md.
          </p>
        </div>
      </MeshBackground>

      <div className="mx-auto max-w-6xl space-y-16 px-6 py-16">
        {/* BRAND */}
        <Section
          title="Brand mark"
          description="Chain link = the settlement bond. Aqua to verdant."
        >
          <div className="flex flex-wrap items-center gap-8">
            <LogoMark size={56} className="text-foreground" />
            <Logo size={32} />
            <div className="text-accent">
              <LogoMark size={56} />
            </div>
            <div className="text-primary">
              <LogoMark size={56} />
            </div>
          </div>
        </Section>

        {/* COLOR */}
        <Section title="Verdant (agriculture / credit)" description="Primary. 200 ≈ logo sage.">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-11">
            {VERDANT.map(([s, hex]) => (
              <Swatch key={s} name={`verdant-${s}`} hex={hex} />
            ))}
          </div>
        </Section>
        <Section title="Aqua (settlement / on-chain)" description="Accent. 300 ≈ logo deep cyan.">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-11">
            {AQUA.map(([s, hex]) => (
              <Swatch key={s} name={`aqua-${s}`} hex={hex} />
            ))}
          </div>
        </Section>
        <Section title="Ink (warm neutral)" description="Text, borders, surfaces.">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-11">
            {INK.map(([s, hex]) => (
              <Swatch key={s} name={`ink-${s}`} hex={hex} />
            ))}
          </div>
        </Section>
        <Section title="Semantic" description="Theme tokens (switch in dark mode).">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <Swatch name="background" hex="#f7faf3" />
            <Swatch name="surface" hex="#ffffff" />
            <Swatch name="primary" hex="#5f8130" />
            <Swatch name="accent" hex="#1f7a86" />
            <Swatch name="success" hex="#10b981" />
            <Swatch name="warning" hex="#d97706" />
            <Swatch name="danger" hex="#dc2626" />
            <Swatch name="border" hex="#d7dbd2" />
          </div>
        </Section>

        {/* TYPOGRAPHY */}
        <Section
          title="Typography"
          description="Plus Jakarta Sans (brand) + JetBrains Mono (data)."
        >
          <div className="space-y-3">
            <p className="text-5xl font-bold tracking-tight">Display 700</p>
            <p className="text-4xl font-bold tracking-tight">Heading 1</p>
            <p className="text-2xl font-semibold">Heading 2</p>
            <p className="text-lg">Body large, untuk tampilan petani.</p>
            <p className="text-base">Body default untuk pengurus dan auditor.</p>
            <p className="text-sm text-muted-foreground">Small, label dan keterangan.</p>
            <p className="font-mono text-sm">GABC...TX9 mono untuk hash dan alamat</p>
            <p className="text-3xl font-bold tabular-nums">1.234.567 (tabular-nums)</p>
          </div>
        </Section>

        {/* COMPONENTS */}
        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button leftIcon={<Sprout size={16} />}>Primary</Button>
            <Button variant="accent">Accent (on-chain)</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Stat cards">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard
              label="Utang Berjalan"
              value={<RupiahAmount smallest={240_000_000n} />}
              icon={<Wheat size={18} />}
            />
            <StatCard label="Perjanjian Aktif" value="128" />
            <StatCard label="Tingkat Pelunasan" value="92%" tone="good" />
            <StatCard label="Perlu Ditinjau" value="3" tone="warn" />
          </div>
        </Section>

        <Section
          title="Status badges"
          description="Map 1:1 to contract lifecycle. Color + icon + Bahasa."
        >
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="verdant">verdant</Badge>
            <Badge tone="aqua">aqua</Badge>
            <Badge tone="success">success</Badge>
            <Badge tone="warning">warning</Badge>
            <Badge tone="danger">danger</Badge>
            <ReputationBadge tier="baru" />
            <ReputationBadge tier="andal" />
            <ReputationBadge tier="tepercaya" />
          </div>
        </Section>

        <Section title="Money + on-chain">
          <div className="flex flex-wrap items-center gap-6">
            <RupiahAmount smallest={1_490_000_000n} className="text-2xl" tone="positive" />
            <RupiahAmount smallest={200_000_000n} tone="negative" />
            <TxHashLink hash="a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4" />
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader
                title="Perjanjian #1024"
                description="Budi Santoso, Gabah"
                action={<StatusBadge status="Delivered" />}
              />
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Utang input</span>
                  <RupiahAmount smallest={200_000_000n} />
                </div>
                <ProgressBar className="mt-3" label="Progres setor" value={2600} max={2750} />
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="accent">
                  Selesaikan Pembayaran
                </Button>
                <TxHashLink hash="9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c" />
              </CardFooter>
            </Card>

            <div className="space-y-4">
              <Alert tone="success" title="Lunas">
                Pembayaran tercatat di chain.
              </Alert>
              <Alert tone="warning" title="Di bawah perkiraan">
                Setoran 80 persen dari estimasi. Perlu ditinjau petugas.
              </Alert>
              <Input label="Volume disetor (kg)" placeholder="2600" leading={<Wheat size={14} />} />
            </div>
          </div>
        </Section>

        <Section title="Progress, skeleton, empty">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="space-y-4 pt-5">
                <ProgressBar label="Verdant" value={70} tone="verdant" />
                <ProgressBar label="Aqua" value={45} tone="aqua" />
                <ProgressBar label="Reputasi (gradient)" value={60} tone="gradient" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 pt-5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
            <EmptyState
              icon={<Sprout size={28} />}
              title="Belum ada petani"
              description="Daftarkan petani pertama untuk memulai."
              action={<Button size="sm">Daftarkan Petani</Button>}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
