"use client";

import { useCallback, useRef, useState } from "react";

export type MockTxState = "idle" | "signing" | "submitting" | "success";

/** Simulates a Freighter sign + Soroban submit for demo screens. Real wiring
 *  replaces `run` with @stellar/freighter-api signing later; the state machine
 *  and returned tx hash contract stay identical. */
export function useMockTx() {
  const [state, setState] = useState<MockTxState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const run = useCallback(() => {
    if (timers.current.length) return;
    setState("signing");
    timers.current.push(
      setTimeout(() => setState("submitting"), 900),
      setTimeout(() => {
        const hash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        setTxHash(hash);
        setState("success");
        timers.current = [];
      }, 2100),
    );
  }, []);

  const reset = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
    setState("idle");
    setTxHash(null);
  }, []);

  return { state, txHash, run, reset };
}
