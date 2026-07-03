# DESIGN GUIDE — Annona Protocol

> The single source of truth for how Annona looks, feels, and reads. Derived directly from the brand mark in `assets/logo-color-reference.svg`. Every color, font, and component decision traces back to it. Tokens are implemented in `packages/ui/src/styles/tokens.css`; the living reference renders at `/design` in the web app.

---

## 0. Brand essence

Annona is a **settlement rail for village cooperatives**. It must feel two things at once:

1. **Trustworthy financial infrastructure** (banks, auditors, Agrinas look at it) — calm, precise, legible, never flashy.
2. **Warm and human** (village officers and farmers use it) — approachable, big, plainly Bahasa, not "crypto."

The mark says this perfectly: a **chain link** (settlement, the bond between farmer and cooperative) rendered in a **soft sage-to-aqua gradient** (agriculture meets finance), with a **rounded, friendly wordmark** in warm charcoal.

**Design north star:** *Premium fintech clarity (Ramp, Mercury, Stripe) with Indonesian super-app accessibility (GoPay, DANA, BRImo).* Dense and exact where auditors work; big and forgiving where farmers and officers work.

**One-line voice:** clear, honest, calm. We state facts and amounts. We never hype. (And per `CLAUDE.md`: **no em dashes in any UI string.**)

---

## 1. Color

### 1.1 Source colors (sampled from the logo)

| Role | Hex | Where in the mark |
|---|---|---|
| Sage green | `#C4D4A5` | top-left of gradient |
| Soft mint | `#CCE7DE` | center |
| Aqua | `#ABDCE0` | mid-right |
| Deep cyan | `#7AC8D2` | bottom-right (most saturated) |
| Cream white | `#F2F9F2` | top-right bloom |
| Ink (wordmark) | `#212320` | the "Annona" letters |

The brand lives on one axis: **warm sage-green (growth, crops, agreement)** on the left, flowing to **cool aqua-teal (trust, settlement, on-chain)** on the right. We keep that axis everywhere.

### 1.2 Semantic mapping (important — this drives the whole UI)

Because the gradient runs green to teal, we assign meaning along it:

- **Verdant green = the agricultural / credit side.** Agreements, input debt, expected harvest, the cooperative's book.
- **Aqua teal = the settlement / on-chain side.** Transactions, tx hashes, settled payments, anything that touched Soroban.

So when a user sees **teal**, it means "this is on-chain / settled / verifiable." When they see **green**, it means "this is the farming / credit relationship." This is a learnable, honest visual language. Use it consistently.

### 1.3 Palette scales

Two brand hues plus a warm neutral. Background tints come straight from the logo; mid and dark steps are tuned for **WCAG AA** text/control contrast (pastels are background-only, never text on white).

> **v2 color note (vivid, not olive).** The first pass used a desaturated yellow-green (olive `#5F8130`) and a dark dull teal. It read flat and "normie." v2 shifts the hue to a **vivid emerald** and a **luminous teal**, and makes the **brand gradient the hero primitive**. The pastel logo is bright and airy; the brand colors now match that energy while staying AA-safe via a two-tone system.

**Two-tone system (important).** Each brand hue ships two working tones:
- a **VIVID** tone (the 400–500 step) for fills, badges, gradients, large text, icons (needs ≥ 3:1),
- an **AA-safe TEXT** tone (the 700 step) for small text and solid buttons (≥ 4.5:1).
Lead visuals with the **brand gradient**; use the AA-safe tone for solid buttons; use vivid for everything large/decorative. Never lead with a flat mid-green fill.

**Verdant (vivid emerald) — primary / agriculture**
```
50  #ECFDF1   100 #D2F9DE   200 #A8F0C2   300 #70E2A0   400 #2FD07E
500 #14B866   600 #0E9456   700 #0C7A48   800 #0C6038   900 #0B4D2E   950 #03281A
```
- 400/500 = vivid (fills, badges, gradient). 700 `#0C7A48` = AA-safe primary (buttons, text on white).

**Aqua (luminous teal) — accent / settlement**
```
50  #E7FAFC   100 #C3F2F6   200 #8FE6EC   300 #4FD5E0   400 #20BCCB
500 #10B3C4   600 #0A8D9C   700 #0C6A78   800 #0D555F   900 #0C454D   950 #022A30
```
- 400/500 = vivid (on-chain emphasis, gradient end). 700 `#0C6A78` = AA-safe accent (tx links, settle buttons).

**Ink (warm neutral) — text, borders, surfaces**
```
50  #F5F7F3   100 #E9EDE5   200 #DDE3D6   300 #BCC4B3   400 #939E8A
500 #6B7464   600 #545D4E   700 #424A3D   800 #333A30   900 #232820   950 #141811
```
- Slight green warmth so neutrals never feel cold next to the brand. Body text = `#1B1F1A` (foreground).

### 1.3b The brand gradient (the signature)
The single most important primitive. It is the literal logo axis (emerald to teal to cyan). Use on the hero, the primary CTA, key stat figures, the reputation ring, and gradient text. This is what removes the "pale / dull / AI-slop" feel.
```css
--brand-gradient: linear-gradient(100deg, #14B866 0%, #0FA68F 48%, #10B3C4 100%);
/* utilities: .annona-gradient (bg), .annona-gradient-text (clip to text) */
```
Button variant `gradient` uses it with a soft aqua glow shadow. Do not overuse on dense data screens; it is a hero/emphasis device.

### 1.4 Semantic tokens (light)

| Token | Value | Use |
|---|---|---|
| `--background` | `#F7FAF3` | app background (warm cream from logo) |
| `--surface` | `#FFFFFF` | cards, panels |
| `--surface-muted` | `ink-50 #F6F7F4` | subtle fills, table headers |
| `--foreground` | `#212320` | primary text (the mark ink) |
| `--muted-foreground` | `ink-500 #737C6A` | secondary text, hints |
| `--border` | `ink-200 #D7DBD2` | hairlines, dividers |
| `--primary` | `verdant-700 #0C7A48` | primary buttons, agri text (AA-safe) |
| `--primary-vivid` | `verdant-500 #14B866` | fills, badges, large emphasis |
| `--primary-foreground` | `#FFFFFF` | text on primary |
| `--accent` | `aqua-700 #0C6A78` | on-chain links, settle (AA-safe) |
| `--accent-vivid` | `aqua-500 #10B3C4` | on-chain fills, emphasis |
| `--accent-foreground` | `#FFFFFF` | text on accent |
| `--ring` | `aqua-400 #20B8C6` | focus ring |
| `--brand-gradient` | emerald→teal→cyan | hero, CTA, key figures |

### 1.5 Status colors (align with contract lifecycle)

Map 1:1 to `Status` / `FlagReason` in `@annona/core` so the same meaning shows everywhere.

| State | Token | Color | Meaning |
|---|---|---|---|
| Created (Draft/Pesanan) | `slate` | ink-100 / ink-700 | agreement drafted = collective Surat Pesanan; debt not yet active |
| SupplyDispatched | `indigo` | indigo-100 / indigo-700 | Agrinas released logistics; goods in transit, price frozen |
| Active (Disbursed) | `aqua-strong` | aqua-200 / aqua-800 | KMP accepted supply; input_debt now a live liability |
| PartiallyDelivered | `aqua` | aqua-100 / aqua-700 | some harvest in |
| Delivered | `verdant` | verdant-100 / verdant-700 | full harvest in |
| **Settled (Lunas)** | `success` | `#10B981` emerald-500 / emerald-700 | paid + debt cleared, split allocated (the happy state) |
| Flagged (Warning) | `warning` | `#D97706` amber-600 | under expectation, review |
| Flagged (Suspected) | `danger` | `#DC2626` red-600 | far under, possible side-selling (review only) |
| ForceMajeure | `danger-soft` | red-100 / red-700 | crop failure, no penalty |

**Residu status** (own badge set, on Agrinas Screen I): `Pending` `slate` · `Remitted` `aqua` (bank proof in, awaiting Agrinas) · `Cleared` `success` (verified) · `Disputed` `danger` (coop reputation frozen, review only). Map 1:1 to `ResiduStatus` in `@annona/core`.

> Settled is intentionally a clean **emerald** (slightly cooler than brand verdant) so "Lunas" pops as the success moment without being confused with the agri-green of an active agreement.

### 1.6 Dark mode (auditor power-users work long hours)

Invert onto a warm-charcoal base, keep the same hues.

| Token | Value |
|---|---|
| `--background` | `#15171300`→ use `#141611` |
| `--surface` | `#1C1F19` |
| `--surface-muted` | `#23271F` |
| `--foreground` | `#ECEEE9` (ink-100) |
| `--muted-foreground` | `#939C8A` (ink-400) |
| `--border` | `#2E332899`→ `#313629` |
| `--primary` | `verdant-400 #95BA56` |
| `--accent` | `aqua-300 #74CDD5` |
| `--ring` | `aqua-400` |

Brand steps shift one to two stops lighter in dark so they stay legible on charcoal.

### 1.7 Contrast rules
- Body text ≥ 4.5:1, large text/icons ≥ 3:1. Never put pastels (50–300) as text on white.
- Primary/accent buttons use the 600 step on white for AA.
- Always pair color with a label or icon (status is never color-only) for accessibility + low-literacy users.

---

## 2. Gradients, mesh & scanlines (the signature texture)

The logo background is a **diagonal mesh gradient with horizontal scanlines**. This is the hero treatment. Use it **sparingly and large**: landing hero, auth screens, empty states, the success/"Lunas" celebration, section dividers. **Never** behind dense data (it hurts legibility).

### 2.1 Brand mesh (the hero)
Diagonal sage → mint → aqua, blooming white at corners, matching the mark:
```css
.annona-mesh {
  background-color: #eaf4ef;
  background-image:
    radial-gradient(at 8% 6%,   #c4d4a5 0px, transparent 55%),  /* sage TL */
    radial-gradient(at 95% 92%, #7ac8d2 0px, transparent 55%),  /* cyan BR */
    radial-gradient(at 92% 8%,  #f2f9f2 0px, transparent 45%),  /* cream TR */
    radial-gradient(at 6% 94%,  #edf7f6 0px, transparent 45%),  /* mist BL */
    radial-gradient(at 50% 50%, #cce7de 0px, transparent 60%);  /* mint center */
}
```

### 2.2 Scanlines (subtle, optional overlay)
Faint horizontal lines, very low opacity, like the reference:
```css
.annona-scanlines {
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(33, 35, 32, 0.035) 0px,
    rgba(33, 35, 32, 0.035) 1px,
    transparent 1px,
    transparent 4px
  );
}
```
Layer scanlines over the mesh on the landing page only. Keep opacity ≤ 0.04 so it reads as texture, not noise. Respect `prefers-reduced-motion` (the mesh is static; no animation required, but any drift animation must be disabled).

### 2.3 Functional gradients (small)
- Primary button hover: `verdant-600 → verdant-500`.
- On-chain chip / tx badge: subtle `aqua-50 → aqua-100`.
- Reputation tier ring: `verdant-400 → aqua-400` (growth to trust).

---

## 3. Typography

### 3.1 Font stack

| Role | Font | Why |
|---|---|---|
| **Display / editorial** | **Fraunces** (serif) | High-contrast "old style" serif with classical gravitas. Carries the *Annona* Roman-grain-goddess story on the landing + big numbers. Use for hero headlines, the loop step numerals (I-IV), pull quotes (italic), marketing only. Free on Google Fonts. |
| **UI + Body** | **Plus Jakarta Sans** | Geometric, rounded, friendly. Indonesian foundry (Tokotype), made for Jakarta's city brand. Perfect Bahasa, matches the rounded wordmark. All dashboards + product UI. |
| **Mono / data** | **JetBrains Mono** | Tx hashes, Stellar addresses, contract ids. Clear `0/O`, `1/l`. |
| **Numbers** | Jakarta (UI) / Fraunces (hero) with `tnum` (tabular) | Rupiah + volumes align in columns. Hero figures may use Fraunces for impact. |

**Pairing rule:** serif Fraunces is the *editorial accent* (landing, marketing, hero figures). Product dashboards stay all-sans (Jakarta) for clarity and speed. Never set body paragraphs or dense tables in the serif. Wired as `--font-display` / `--font-sans` / `--font-mono` via `next/font`.

Fallbacks: `"Plus Jakarta Sans", ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif` and `"JetBrains Mono", ui-monospace, "SF Mono", monospace`.

Wired via `next/font` in `apps/web/app/layout.tsx` as CSS vars `--font-sans` / `--font-mono`, consumed by the tokens.

### 3.2 Type scale (1.250 major-third, rem)

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `display` | 3.05rem / 1.1 | 700 | landing hero |
| `h1` | 2.44rem / 1.15 | 700 | page title |
| `h2` | 1.95rem / 1.2 | 600 | section |
| `h3` | 1.56rem / 1.25 | 600 | card title |
| `h4` | 1.25rem / 1.3 | 600 | sub-section |
| `body-lg` | 1.125rem / 1.6 | 400 | farmer-facing primary copy |
| `body` | 1rem / 1.6 | 400 | default |
| `small` | 0.875rem / 1.5 | 400/500 | labels, hints |
| `caption` | 0.75rem / 1.4 | 500 | badges, table meta |
| `stat` | 2.25rem / 1.1 | 700, tnum | hero stat numbers |
| `mono` | 0.875rem / 1.5 | 400 | tx hashes, addresses |

### 3.3 Rules
- **Weights:** 400 body, 500 labels, 600 headings/subheads, 700 display + stats. Avoid 300 (too thin for low-literacy + outdoor phone screens).
- Farmer view uses `body-lg` as its default size. Officers/auditors use `body`.
- Numbers always tabular. Currency via the `RupiahAmount` component (never hand-format).
- Line length 60–75 chars for prose; never full-width paragraphs.
- Headings sentence case in Bahasa. No ALL-CAPS except tiny `caption` labels with letter-spacing.

---

## 4. Spacing, radius, elevation

### 4.1 Spacing
8px base grid: `2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`. Card padding 20–24. Page gutters 24 (mobile) to 48 (desktop). Generous whitespace = the calm/premium feel.

### 4.2 Radius (rounded, matching the wordmark)
```
sm 6px · md 10px · lg 14px · xl 20px · 2xl 28px · full 9999px
```
Default card = `lg (14)`. Buttons = `md (10)`. Pills/badges = `full`. The roundness echoes the logo's rounded terminals; do not use sharp 0–2px corners.

### 4.3 Elevation (soft, low, tinted)
Shadows are soft and slightly green-tinted, never harsh black.
```
shadow-sm   0 1px 2px rgba(33,35,32,0.06)
shadow-md   0 4px 12px rgba(33,35,32,0.08)
shadow-lg   0 12px 32px rgba(33,35,32,0.10)
shadow-glow 0 0 0 4px rgba(69,178,189,0.15)   /* aqua focus / on-chain emphasis */
```
Prefer borders + `shadow-sm` for most cards; reserve `lg` for modals/popovers.

---

## 5. Iconography & imagery
- **Icons:** Lucide (rounded, consistent stroke 1.75–2px). Matches the geometric-rounded brand. Pair every status with an icon.
- **The mark:** chain link = settlement. Reuse the link motif for "on-chain / verified" affordances. Wordmark assets in `apps/web/public/brand/`.
- **Photography:** if used, warm natural light, real Indonesian farmers/fields, never stock-crypto (no glowing coins). Keep it human.
- **Illustration:** minimal line art in verdant/aqua for empty states.

---

## 6. Motion
- Calm and quick. Durations 150ms (micro) to 300ms (panels). Easing `cubic-bezier(0.22, 1, 0.36, 1)` (gentle ease-out).
- Page entrances: subtle staggered fade-up (see `page-load-animations` patterns), max 8px travel.
- On-chain success ("Lunas"): a brief mesh bloom + checkmark, then settle. Celebrate the one happy moment.
- Numbers can roll on first paint (tabular). Respect `prefers-reduced-motion` everywhere.

---

## 7. Component standards (implemented in `@annona/ui`)

Core library (see `/design`): `Logo`, `Button` (incl. `gradient`), `Card`, `StatCard`, `Badge`, `StatusBadge`, `RupiahAmount`, `TxHashLink`, `ReputationBadge`, `ProgressBar`, `Alert`, `Input`, `Skeleton`, `EmptyState`, `MeshBackground`, `Scanlines`, `Section`, `Highlight`, plus classical: `Eyebrow`, `WheatMark`, `WheatDivider`, `SealEmblem`, `GradientText`.

App-level (landing, `apps/web/components`): `FloatingNav`, `CustomCursor`, `Reveal`/`RevealGroup`/`RevealItem` (scroll reveals), `CountUp`, `SettlementChart` (dependency-free SVG chart).

**Emphasis, two ways (do not be monotone):** use the **brand gradient** for the single hero moment, and the **`Highlight` marker** (verdant / aqua / amber) for inline emphasis in body copy. Do not gradient every heading; alternate with marker + plain weight.

**Motion + cursor:** landing uses `motion` (Framer) reveals (once, in-view, 8-16px travel, ease `[0.22,1,0.36,1]`) wrapped in `MotionConfig reducedMotion="user"`. The `CustomCursor` (dot + trailing ring) runs on fine-pointer desktop only, single rAF, transform-only; auto-skips on touch + reduced-motion. Floating navbar detaches + blurs on scroll.

Cross-cutting rules:
- Every on-chain action surfaces a **tx hash + explorer link** via `TxHashLink` (teal).
- Money only via `RupiahAmount` (formats `Rp14.900.000`, tabular, no em dash).
- Status only via `StatusBadge` (color + icon + Bahasa label).
- Focus-visible ring on every interactive element (`--ring`, aqua-400).
- Min touch target 44px (farmers on phones, outdoors).
- All components are theme-token driven (no hard-coded hex in components).

---

## 7b. The classical (Greco-Roman) layer

*Annona* is the Roman goddess of the grain supply (depicted with a grain measure + cornucopia, overseeing fair distribution). We lean into that for brand depth, but **editorially, never as costume.** No marble textures, no fake columns, no toga clip-art. Instead: refined line motifs + a serif voice in the brand colors.

Components in `@annona/ui` (landing + marketing only):
- **`Eyebrow`** — inscription-style label: small-caps, wide tracking (`0.22em`), optional flanking hairlines. Like a carved Roman label.
- **`WheatMark`** / **`WheatDivider`** — wheat sprig line glyph + fluted section divider. Echoes the grain supply.
- **`SealEmblem`** — a coin/seal: the chain mark inside a ring with curved inscription (`ANNONA PROTOCOL` + `MMXXVI`). Echoes Annona on Roman *aes* coinage.
- **`GradientText`** — brand-gradient clipped to text, for hero key words.
- Display set in **Fraunces** (serif) with the gradient on emphasis words.

Rule: these live on the landing and marketing surfaces. Dashboards stay clean sans + tokens. See the dedicated "Klasik (Greco-Roman)" block on `/design`.

## 7c. Anti-slop principles (do not skip)

The first pass "screamed AI slop." What fixes that, concretely:
- **A real opinion, not defaults.** A specific palette (vivid emerald + luminous teal), a specific type pairing (Fraunces + Jakarta), a specific motif system (chain + wheat + seal). Generic = slop.
- **Asymmetry + editorial rhythm.** The landing hero is two-column, off-balance, with an inscription eyebrow and a live settlement card, not a centered headline over three identical cards.
- **One signature primitive.** The brand gradient, used deliberately. It ties every surface together.
- **Brand-specific iconography.** The chain mark traces the real logo; wheat + seal come from the Annona story. No stock crypto icons.
- **Restraint.** Two brand hues + status colors. Generous whitespace. Soft tinted shadows. No neon, no glassmorphism, no drop-shadow soup.

## 8. Page archetypes
- **Landing:** full mesh + scanlines hero, big display type, the protocol story. The only place with the loud treatment.
- **Coop dashboard:** calm cream background, white cards, dense-but-friendly, big hero stats, green/teal accents. No mesh behind data.
- **Oversight dashboard (RBAC Agrinas + Government):** densest; tables, residu ledger, leaderboard, can use dark mode. Teal for on-chain columns.
- **Farmer view:** mobile-first, `body-lg`, huge numbers, one action per screen, lots of whitespace, occasional mesh on success.

---

## 9. Accessibility & i18n
- WCAG AA minimum; AAA for farmer-facing primary numbers where feasible.
- Color never the only signal (icon + label always).
- Bahasa Indonesia default; copy stays short and concrete. English toggle must not break layouts (test longer strings).
- Hit targets ≥ 44px; visible focus; logical tab order; semantic HTML.
- **No em dashes** in any rendered string (commas, periods, parentheses, or "to" for ranges).

---

## 10. Don'ts
- No mesh/scanlines behind tables or forms.
- No pure black (`#000`) and no cold gray; use ink (warm) tokens.
- No more than the two brand hues + status colors on one screen.
- No hand-formatted money or raw smallest-unit integers in UI.
- No "crypto" visual clichés (neon, coins, 3D glass). Annona is agri-fintech infrastructure.
- No thin (300) weights for data or anything farmers read.
- No hard-coded colors in components; use tokens so dark mode + rebrand stay free.

---

## 11. Quick reference (copy-paste)

```
PRIMARY (agri, AA)    verdant-700 #0C7A48   solid buttons, small text
PRIMARY vivid         verdant-500 #14B866   fills, badges, large
ACCENT (on-chain, AA) aqua-700    #0C6A78   tx links, settle
ACCENT vivid          aqua-500    #10B3C4   on-chain emphasis
BRAND GRADIENT        #14B866 -> #0FA68F -> #10B3C4   (hero, CTA, figures)
INK (text)            #1B1F1A
BACKGROUND            #F7FAF3
SUCCESS (Lunas)       #10B981   WARNING #E08600   DANGER #E23B3B
FONT display          Fraunces (serif, landing only)
FONT sans             Plus Jakarta Sans (UI)
FONT mono             JetBrains Mono
RADIUS card 14px  BUTTON 10px  PILL full
```

*Living, code-backed version renders at `/design`. Tokens: `packages/ui/src/styles/tokens.css`.*
