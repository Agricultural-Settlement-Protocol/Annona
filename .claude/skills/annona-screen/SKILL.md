---
name: annona-screen
description: Build a complete Annona dashboard screen. Use when asked to build, scaffold, or fix any of the 12 screens (A-L) across the 3 dashboards (coop/auditor/farmer). Args: screen letter (A-L) or screen name. Spawns annona-frontend agent for full implementation.
---

# /annona-screen — Dashboard Screen Builder

Invoke as `/annona-screen [A|B|C|D|E|F|G|H|I|J|K|L]` or `/annona-screen [name]`.

Screen map:
- A = Coop Home/Overview (`/coop`)
- B = Farmer Registry (`/coop/farmers`)
- C = Create Agreement (`/coop/agreements/new`)
- D = Record Delivery + Settle (`/coop/agreements/[id]/deliver`)
- E = Agreement Detail (`/coop/agreements/[id]`)
- F = Inventory (`/coop/inventory`)
- G = Auditor Overview (`/auditor`)
- H = AI Assistant (`/auditor/ai`)
- I = Audit Trail (`/auditor/trail`)
- J = Farmer Agreements (`/farmer`)
- K = Farmer Harvest + Payment (`/farmer/harvest`)
- L = Farmer Reputation (`/farmer/reputation`)

## Step 1: Check what exists

```bash
find apps/web/app -name "page.tsx" | sort
ls apps/web/components/ 2>/dev/null
ls packages/ui/src/ 2>/dev/null
```

## Step 2: Confirm screen from user

If no arg given, ask: "Which screen? (A-L) or describe what you need."
If given, confirm: "Building Screen [X] — [name]. Correct?"

## Step 3: Spawn annona-frontend agent

Use the `annona-frontend` agent (Agent tool, subagent_type=annona-frontend) with a self-contained prompt including:
- Exact screen letter + route path
- The precise spec from PRD §8 (listed in the agent)
- Current state of the file if it exists (read it first)
- Any specific requirements from the user

The annona-frontend agent has the complete design system, all screen specs, and component library knowledge.

## Step 4: After agent completes

### Validate these rules for EVERY screen

```bash
# No em dashes in any string
grep -r "—\|–" apps/web/app --include="*.tsx" --include="*.ts" --include="*.json"
# If any found: MUST fix. Use comma, period, parentheses, or "to".

# RupiahAmount used for all money
grep -r "toLocaleString\|\.toFixed\|Rp[0-9]" apps/web/app --include="*.tsx"
# If raw formatting found: replace with <RupiahAmount value={n} />

# TxHashLink used for tx hashes  
grep -r "tx_hash\|txHash" apps/web/app --include="*.tsx" | grep -v TxHashLink
# If raw hash display found: wrap with <TxHashLink hash={h} />

# StatusBadge for status display
grep -r "status.*==\|status.*===\|\"Created\"\|\"Settled\"" apps/web/app --include="*.tsx" | grep -v StatusBadge | grep -v "from\|import\|type\|schema"
# If color-only status: replace with <StatusBadge status={s} />
```

### Screen-specific checks

**Screens A, G (dashboards):** 4 hero StatCards present? Live data from indexer API? Loading skeletons?
**Screen C (create agreement):** Estimate formula shown with BPS/KATAM source label? Preview in Bahasa before signing?
**Screen D (deliver/settle):** Live gross/net/flag preview updates as volume is typed? Freighter sign flow?
**Screens J, K, L (farmer):** body-lg default? Min 44px touch targets? `<RupiahAmount>` for all numbers?
**Screen H (AI):** Demo prompts pre-loaded? Every AI answer citation visible? Clearly labeled as AI?

## Screen priority order (sacred first)

1. **A** — Coop Home (overview stats, the first thing judges see)
2. **G** — Auditor Overview (protocol health, leaderboard)
3. **C** — Create Agreement (the core write interaction)
4. **D** — Record Delivery / Settle (the settlement flow)
5. **E** — Agreement Detail
6. **J, K, L** — Farmer View (mobile-first)
7. **B** — Farmer Registry
8. **H** — AI Assistant (first to cut)
9. **I** — Audit Trail
10. **F** — Inventory (off-chain, clearly labeled)

## File output locations

```
Screen A → apps/web/app/(coop)/page.tsx
Screen B → apps/web/app/(coop)/farmers/page.tsx
Screen C → apps/web/app/(coop)/agreements/new/page.tsx
Screen D → apps/web/app/(coop)/agreements/[id]/deliver/page.tsx
Screen E → apps/web/app/(coop)/agreements/[id]/page.tsx
Screen F → apps/web/app/(coop)/inventory/page.tsx
Screen G → apps/web/app/(auditor)/page.tsx
Screen H → apps/web/app/(auditor)/ai/page.tsx
Screen I → apps/web/app/(auditor)/trail/page.tsx
Screen J → apps/web/app/(farmer)/page.tsx
Screen K → apps/web/app/(farmer)/harvest/page.tsx
Screen L → apps/web/app/(farmer)/reputation/page.tsx
```
