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

**Verdant (green) — primary / agriculture**
```
50  #F3F8EC   100 #E3F0D2   200 #CCE0A9   300 #B0CD7E   400 #95BA56
500 #79A23B   600 #5F8130   700 #4A6528   800 #3B4F24   900 #2F4020   950 #18230F
```
- 200 ≈ the logo sage. Use 50/100 for fills, 600/700 for text + primary buttons on light.

**Aqua (teal) — accent / settlement**
```
50  #EAFAFB   100 #CDF0F2   200 #A7E2E7   300 #74CDD5   400 #45B2BD
500 #2898A5   600 #1F7A86   700 #1F626C   800 #204E56   900 #1E4149   950 #0E2A30
```
- 200 ≈ logo aqua, 300 ≈ logo deep cyan. Use 600/700 for on-chain links, tx chips, settle actions.

**Ink (warm neutral) — text, borders, surfaces**
```
50  #F6F7F4   100 #ECEEE9   200 #D7DBD2   300 #B8BFB0   400 #939C8A
500 #737C6A   600 #5A6253   700 #474E42   800 #353A31   900 #262B22   950 #181B15
```
- Slight green warmth so neutrals never feel cold next to the brand. Body text = ink-900 / the literal mark ink `#212320`.

### 1.4 Semantic tokens (light)

| Token | Value | Use |
|---|---|---|
| `--background` | `#F7FAF3` | app background (warm cream from logo) |
| `--surface` | `#FFFFFF` | cards, panels |
| `--surface-muted` | `ink-50 #F6F7F4` | subtle fills, table headers |
| `--foreground` | `#212320` | primary text (the mark ink) |
| `--muted-foreground` | `ink-500 #737C6A` | secondary text, hints |
| `--border` | `ink-200 #D7DBD2` | hairlines, dividers |
| `--primary` | `verdant-600 #5F8130` | primary buttons, agri emphasis |
| `--primary-foreground` | `#FFFFFF` | text on primary |
| `--accent` | `aqua-600 #1F7A86` | on-chain actions, links, tx |
| `--accent-foreground` | `#FFFFFF` | text on accent |
| `--ring` | `aqua-400 #45B2BD` | focus ring |

### 1.5 Status colors (align with contract lifecycle)

Map 1:1 to `Status` / `FlagReason` in `@annona/core` so the same meaning shows everywhere.

| State | Token | Color | Meaning |
|---|---|---|---|
| Created | `slate` | ink-100 / ink-700 | agreement made, nothing delivered |
| PartiallyDelivered | `aqua` | aqua-100 / aqua-700 | some harvest in |
| Delivered | `verdant` | verdant-100 / verdant-700 | full harvest in |
| **Settled (Lunas)** | `success` | `#10B981` emerald-500 / emerald-700 | paid + debt cleared (the happy state) |
| Flagged (Warning) | `warning` | `#D97706` amber-600 | under expectation, review |
| Flagged (Suspected) | `danger` | `#DC2626` red-600 | far under, possible side-selling (review only) |
| ForceMajeure | `danger-soft` | red-100 / red-700 | crop failure, no penalty |

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
| **Display + Body** | **Plus Jakarta Sans** | Geometric, rounded, friendly. Designed by an Indonesian foundry (Tokotype) for Jakarta's city brand. Perfect Bahasa support, matches the rounded wordmark, reads as modern-trustworthy. Free on Google Fonts. |
| **Mono / data** | **JetBrains Mono** | Tx hashes, Stellar addresses, contract ids, code. Clear `0/O`, `1/l` distinction. |
| **Numbers** | Plus Jakarta Sans with `font-feature-settings: "tnum"` (tabular-nums) | Rupiah amounts and volumes align in columns. No separate font. |

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

Core library (see `/design`): `Logo`, `Button`, `Card`, `StatCard`, `Badge`, `StatusBadge`, `RupiahAmount`, `TxHashLink`, `ReputationBadge`, `ProgressBar`, `Alert`, `Input`, `Skeleton`, `EmptyState`, `MeshBackground`, `Scanlines`, `Section`.

Cross-cutting rules:
- Every on-chain action surfaces a **tx hash + explorer link** via `TxHashLink` (teal).
- Money only via `RupiahAmount` (formats `Rp14.900.000`, tabular, no em dash).
- Status only via `StatusBadge` (color + icon + Bahasa label).
- Focus-visible ring on every interactive element (`--ring`, aqua-400).
- Min touch target 44px (farmers on phones, outdoors).
- All components are theme-token driven (no hard-coded hex in components).

---

## 8. Page archetypes
- **Landing:** full mesh + scanlines hero, big display type, the protocol story. The only place with the loud treatment.
- **Coop dashboard:** calm cream background, white cards, dense-but-friendly, big hero stats, green/teal accents. No mesh behind data.
- **Auditor dashboard:** densest; tables, leaderboard, can use dark mode. Teal for on-chain columns.
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
PRIMARY (agri)     verdant-600 #5F8130   on light text/buttons
ACCENT (on-chain)  aqua-600    #1F7A86   tx, settle, links
INK (text)         #212320
BACKGROUND         #F7FAF3
SUCCESS (Lunas)    #10B981
WARNING            #D97706
DANGER             #DC2626
FONT sans          Plus Jakarta Sans
FONT mono          JetBrains Mono
RADIUS card        14px   BUTTON 10px   PILL full
```

*Living, code-backed version renders at `/design`. Tokens: `packages/ui/src/styles/tokens.css`.*
