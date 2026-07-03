import type { ResiduStatus, Status } from "@annona/core";
import { computeSplitSettlement, deriveInputDebt, rupiah } from "@annona/core";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  EmptyState,
  Eyebrow,
  GradientText,
  Highlight,
  Input,
  Logo,
  LogoMark,
  MeshBackground,
  ProgressBar,
  ReputationBadge,
  ResiduStatusBadge,
  RupiahAmount,
  SealEmblem,
  Section,
  Skeleton,
  SplitSettlementCard,
  StatCard,
  StatusBadge,
  TxHashLink,
  WheatDivider,
  WheatMark,
} from "@annona/ui";
import { Sprout, Wheat } from "lucide-react";

export const metadata = { title: "Design System, Annona" };

// Hex maps mirror packages/ui/src/styles/tokens.css. Inline style avoids
// Tailwind's static-class scanner missing dynamically-built class names.
const VERDANT: [string, string][] = [
  ["50", "#ecfdf1"],
  ["100", "#d2f9de"],
  ["200", "#a8f0c2"],
  ["300", "#70e2a0"],
  ["400", "#2fd07e"],
  ["500", "#14b866"],
  ["600", "#0e9456"],
  ["700", "#0c7a48"],
  ["800", "#0c6038"],
  ["900", "#0b4d2e"],
  ["950", "#03281a"],
];
const AQUA: [string, string][] = [
  ["50", "#e7fafc"],
  ["100", "#c3f2f6"],
  ["200", "#8fe6ec"],
  ["300", "#4fd5e0"],
  ["400", "#20bccb"],
  ["500", "#10b3c4"],
  ["600", "#0a8d9c"],
  ["700", "#0c6a78"],
  ["800", "#0d555f"],
  ["900", "#0c454d"],
  ["950", "#022a30"],
];
const INK: [string, string][] = [
  ["50", "#f5f7f3"],
  ["100", "#e9ede5"],
  ["200", "#dde3d6"],
  ["300", "#bcc4b3"],
  ["400", "#939e8a"],
  ["500", "#6b7464"],
  ["600", "#545d4e"],
  ["700", "#424a3d"],
  ["800", "#333a30"],
  ["900", "#232820"],
  ["950", "#141811"],
];
const STATUSES: Status[] = [
  "Created",
  "SupplyDispatched",
  "Active",
  "PartiallyDelivered",
  "Delivered",
  "Settled",
  "Flagged",
  "ForceMajeure",
];
const RESIDU_STATUSES: ResiduStatus[] = ["Pending", "Remitted", "Cleared", "Disputed"];

// Worked example mirrors SMART-CONTRACT.md §5: base Rp2.000.000 + 10% markup,
// 5% handling, 2.600 kg gabah @ Rp6.500/kg.
const inputDebt = deriveInputDebt(rupiah(2_000_000), 1000);
const splitExample = computeSplitSettlement({
  deliveredVolG: 2_600_000n,
  settledVolG: 0n,
  hppPerKg: rupiah(6_500),
  remainingDebt: inputDebt,
  hppHandlingFeeBps: 500,
  basePriceAgrinas: rupiah(2_000_000),
  inputDebt,
});

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

        {/* CLASSICAL / GRECO-ROMAN */}
        <Section
          title="Klasik (Greco-Roman)"
          description="Annona = dewi gandum Romawi. Lapisan editorial untuk landing: serif display, gandum, segel koin, gradient."
        >
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="relative annona-mesh px-8 py-12">
              <div className="annona-scanlines pointer-events-none absolute inset-0" aria-hidden />
              <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <Eyebrow lines={false}>Lapisan editorial</Eyebrow>
                  <h2 className="mt-4 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground">
                    Panen yang <GradientText>adil</GradientText>, tercatat abadi.
                  </h2>
                  <p className="mt-4 max-w-md text-ink-700">
                    Serif Fraunces untuk gravitas klasik, dipadu Plus Jakarta Sans untuk UI. Motif
                    gandum dan segel koin sebagai aksen, bukan tempelan.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button variant="gradient" size="lg">
                      Tombol gradient
                    </Button>
                    <Button variant="outline" size="lg">
                      Sekunder
                    </Button>
                  </div>
                </div>
                <div className="flex justify-center">
                  <SealEmblem size={168} />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-2 text-verdant-600">
              <WheatMark size={28} />
              <WheatMark size={22} />
              <WheatMark size={18} />
            </div>
            <p className="font-display text-2xl italic text-foreground">
              Fraunces italic, untuk kutipan dan aksen editorial.
            </p>
          </div>
          <WheatDivider className="mt-6" />
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
            <Swatch name="primary" hex="#0c7a48" />
            <Swatch name="accent" hex="#0c6a78" />
            <Swatch name="success" hex="#10b981" />
            <Swatch name="warning" hex="#e08600" />
            <Swatch name="danger" hex="#e23b3b" />
            <Swatch name="border" hex="#dde3d6" />
          </div>
        </Section>

        {/* TYPOGRAPHY */}
        <Section
          title="Typography"
          description="Plus Jakarta Sans (brand) + JetBrains Mono (data)."
        >
          <div className="space-y-3">
            <p className="font-display text-5xl font-semibold tracking-tight">
              Fraunces display, untuk hero
            </p>
            <p className="font-display text-3xl italic text-ink-700">Fraunces italic, editorial</p>
            <p className="text-5xl font-bold tracking-tight">Jakarta Sans 700</p>
            <p className="text-4xl font-bold tracking-tight">Heading 1</p>
            <p className="text-2xl font-semibold">Heading 2</p>
            <p className="text-lg">Body large, untuk tampilan petani.</p>
            <p className="text-base">Body default untuk pengurus dan auditor.</p>
            <p className="text-sm text-muted-foreground">Small, label dan keterangan.</p>
            <p className="font-mono text-sm">GABC...TX9 mono untuk hash dan alamat</p>
            <p className="text-3xl font-bold tabular-nums">1.234.567 (tabular-nums)</p>
          </div>
        </Section>

        {/* HIGHLIGHT */}
        <Section
          title="Highlight (marker)"
          description="Penekanan alternatif selain gradient, supaya teks tidak monoton."
        >
          <p className="max-w-2xl font-display text-2xl leading-relaxed text-foreground">
            Pupuk sekarang, bayarnya pas panen. Semuanya <Highlight>tercatat rapi</Highlight>, tanpa
            ada yang <Highlight color="aqua">dirugikan</Highlight> atau{" "}
            <Highlight color="amber">terlewat</Highlight>.
          </p>
        </Section>

        {/* COMPONENTS */}
        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="gradient" leftIcon={<Sprout size={16} />}>
              Gradient (hero)
            </Button>
            <Button>Primary</Button>
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
              value={<RupiahAmount smallest={rupiah(2_400_000)} />}
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

        <Section
          title="Residu reconciliation"
          description="Agrinas <-> KMP principal remittance. Map 1:1 to ResiduStatus. Disputed freezes coop reputation, review only, never an automatic accusation."
        >
          <div className="flex flex-wrap gap-2">
            {RESIDU_STATUSES.map((s) => (
              <ResiduStatusBadge key={s} status={s} />
            ))}
          </div>
        </Section>

        <Section
          title="Automated Cash-Split Settlement Card"
          description="PRD Screen D. One settle() produces three allocations: farmer net, Agrinas principal residu, KMP margin + handling. Worked example: base Rp2.000.000, markup 10%, handling 5%, 2.600 kg gabah @ Rp6.500/kg."
        >
          <div className="max-w-md">
            <SplitSettlementCard
              gross={splitExample.grossSmallest}
              handlingCut={splitExample.handlingCut}
              netToFarmer={splitExample.netToFarmer}
              residuPrincipal={splitExample.principalToAgrinas}
              coopMargin={splitExample.coopMargin}
            />
          </div>
        </Section>

        <Section title="Money + on-chain">
          <div className="flex flex-wrap items-center gap-6">
            <RupiahAmount smallest={rupiah(13_855_000)} className="text-2xl" tone="positive" />
            <RupiahAmount smallest={rupiah(2_200_000)} tone="negative" />
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
                  <RupiahAmount smallest={rupiah(2_200_000)} />
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
