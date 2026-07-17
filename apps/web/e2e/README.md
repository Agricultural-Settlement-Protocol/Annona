# E2E — Playwright (Phase 9)

End-to-end coverage of the three core journeys plus auth/role-routing.

## Design

- **Web runs in DEMO MODE.** `playwright.config.ts` forces
  `NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID=""`, so `useTx` self-simulates every
  write (sign + submit cadence + a fabricated tx hash). No chain, no Freighter,
  no RPC — deterministic and secret-free for the write path.
- **Reads are real.** The API (Hono) + live Supabase serve the seeded read-model.
  A broken read fails the run (the Phase 9 gate). Two `webServer`s boot: the API
  on `8787` and the web app on `3100` (both reused if already running locally).
- **Auth is real** Supabase email+password against the seeded demo accounts
  (`e2e/support/accounts.ts`).
- **The Groq AI call is route-mocked** per test (external + nondeterministic).

## Specs

| File | Journey |
|---|---|
| `auth.spec.ts` | Sign-in for all 4 roles routes to the correct dashboard; bad password rejected |
| `kmp-settlement.spec.ts` | Live dashboard/agreements read → e-RDKK subsidy column → settle (demo) surfaces a tx hash |
| `funding.spec.ts` | KMP Ajukan Dana → financier approve + disburse from the live queue |
| `oversight-ai.spec.ts` | Government AI answers a grounded query (Groq mocked) |
| `smoke.spec.ts` | Real-mode wallet smoke (skipped unless `E2E_SMOKE=1`) |
| `real-mode.spec.ts` | REAL testnet write: create_agreement signed by the coop key through the wallet mock, tx verified via RPC. Excluded from the CI suite; runs only via `playwright.real.config.ts` |

## Run

```bash
pnpm --filter @annona/web test:e2e          # headless, all specs
pnpm --filter @annona/web test:e2e:ui       # interactive UI mode
pnpm --filter @annona/web test:e2e:report   # open the last HTML report

# REAL-MODE (chain-mutating, manual only): web boots with the real contract id,
# the Freighter mock signs with SETTLEMENT_SERVICE_SECRET (apps/api/.env).
pnpm --filter @annona/web exec playwright test --config playwright.real.config.ts
```

## Freighter mock (v4)

`@stellar/freighter-api` v4 does NOT read a `window.freighterApi` object — it
talks to the extension over `window.postMessage`
(`FREIGHTER_EXTERNAL_MSG_REQUEST` / `..._RESPONSE`, matched on the library's
own `messagedId` typo), and only the connection-status/public-key requests have
a timeout: an unanswered `requestAccess`/`signTransaction` hangs the UI
forever. `e2e/support/freighter.ts` therefore answers the postMessage protocol
directly and (when given a secret) signs the XDR Node-side with a real Keypair,
so submits reach testnet for real.

First time, install the browser:

```bash
pnpm --filter @annona/web exec playwright install chromium   # add --with-deps for OS libs (needs sudo)
```

If Chromium fails to launch with `libnspr4.so: cannot open shared object file`
(no sudo to `install --with-deps`), install the OS libraries system-wide
(`libnspr4 libnss3 libasound2t64`), or extract them to a prefix and export
`LD_LIBRARY_PATH` before running.

## Real-mode smoke

Runs the write path with a real contract id (live testnet). Use the real
Freighter extension, or the wallet-less provider stub in `support/freighter.ts`:

```bash
NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID=<id> E2E_SMOKE=1 \
  pnpm --filter @annona/web test:e2e:smoke
```

## CI

`.github/workflows/ci.yml` runs the suite in the `e2e` job (live-Supabase reads
via repo secrets: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). The `db-diff` job
guards schema drift.
