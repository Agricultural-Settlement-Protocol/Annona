"use client";

/**
 * Real Freighter write hook for the KMP-signed contract fns. Drop-in successor
 * to useMockTx: identical `{ state, txHash, run, reset }` surface plus `error`
 * and `demoMode`, so call sites only change `run()` -> `run(invocation)`.
 *
 * `run` takes a BUILDER `(signer) => Invocation`, not a bare invocation: every
 * KMP fn's first arg is the coop/caller Address == the connected Freighter key,
 * which is only known after `connectWallet()`. The builder closes over the rest
 * (id, volume, ...) and receives the signer.
 *
 * When the registry contract id is unset (`!isChainConfigured()`), `run` falls
 * back to simulated timing + a fabricated hash so the dashboard is fully
 * walkable pre-deploy (the builder is not invoked). `demoMode` lets the UI
 * label that state so a misconfigured env after deploy cannot silently look
 * live.
 */
import { isChainConfigured } from "@/lib/stellar";
import { invoke } from "@/lib/tx";
import type { Invocation } from "@/lib/tx";
import { connectWallet } from "@/lib/wallet";
import { useCallback, useEffect, useRef, useState } from "react";

export type TxState = "idle" | "signing" | "submitting" | "success";

function randomHash(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useTx() {
  const [state, setState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const demoMode = !isChainConfigured();

  // Guard against setState after unmount (real path awaits the network).
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Run one or more invocations SEQUENTIALLY under one signing session (e.g. a
   *  dispatch request covering several agreements = one dispatch_supply each).
   *  The reported txHash is the LAST submitted tx; an error midway stops the
   *  remainder and surfaces which step failed. */
  const runAll = useCallback(
    async (builds: ReadonlyArray<(signer: string) => Invocation | Promise<Invocation>>) => {
      if (builds.length === 0) return;
      setError(null);
      setState("signing");

      // Demo mode: no chain wired yet. Simulate the sign+submit cadence and
      // skip the builders (they need a real strkey signer address).
      if (!isChainConfigured()) {
        await new Promise((r) => setTimeout(r, 700));
        if (!alive.current) return;
        setState("submitting");
        await new Promise((r) => setTimeout(r, 900));
        if (!alive.current) return;
        setTxHash(randomHash());
        setState("success");
        return;
      }

      try {
        const source = await connectWallet();
        let lastHash: string | null = null;
        for (const [i, build] of builds.entries()) {
          if (!alive.current) return;
          setState("signing");
          const invocation = await build(source);
          try {
            const { hash } = await invoke(source, invocation, () => {
              if (alive.current) setState("submitting");
            });
            lastHash = hash;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(builds.length > 1 ? `Langkah ${i + 1}/${builds.length}: ${msg}` : msg);
          }
        }
        if (!alive.current) return;
        setTxHash(lastHash);
        setState("success");
      } catch (e) {
        if (!alive.current) return;
        setError(e instanceof Error ? e.message : String(e));
        setState("idle");
      }
    },
    [],
  );

  const run = useCallback(
    (build: (signer: string) => Invocation | Promise<Invocation>) => runAll([build]),
    [runAll],
  );

  const reset = useCallback(() => {
    setState("idle");
    setTxHash(null);
    setError(null);
  }, []);

  return { state, txHash, error, demoMode, run, runAll, reset };
}
