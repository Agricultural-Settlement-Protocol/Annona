"use client";

/**
 * Sidebar footer widget for the KMP officer's signing wallet. Three states:
 *   - DEMO MODE (no NEXT_PUBLIC_CONTRACT_ID): an amber "Mode Demo" pill so a
 *     misconfigured env after deploy cannot silently look live. Writes here are
 *     simulated (see components/kmp/use-tx.ts).
 *   - configured + not connected: a "Hubungkan Freighter" button.
 *   - connected: a green pill with the short coop address.
 */
import { connectWallet, getConnectedAddress } from "@/lib/wallet";
import { isChainConfigured } from "@/lib/stellar";
import { Wallet } from "lucide-react";
import { useEffect, useState } from "react";

function short(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function WalletBadge() {
  const demoMode = !isChainConfigured();
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) return;
    getConnectedAddress().then(setAddress).catch(() => {});
  }, [demoMode]);

  if (demoMode) {
    return (
      <div
        title="Kontrak belum dikonfigurasi. Tanda tangan disimulasikan (mode demo)."
        className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700"
      >
        <Wallet size={13} className="shrink-0" />
        Mode Demo (tanpa rantai)
      </div>
    );
  }

  if (address) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md border border-verdant-200 bg-verdant-50 px-3 py-2 text-xs font-medium text-verdant-800">
        <Wallet size={13} className="shrink-0" />
        <span className="font-mono">{short(address)}</span>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            setAddress(await connectWallet());
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        }}
        className="flex w-full min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Wallet size={15} />
        {busy ? "Menghubungkan..." : "Hubungkan Freighter"}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
