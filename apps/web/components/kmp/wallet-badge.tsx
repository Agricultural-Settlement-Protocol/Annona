"use client";

/**
 * Sidebar footer widget for the signing identity. States:
 *   - DEMO MODE (no NEXT_PUBLIC_CONTRACT_ID): an amber "Mode Demo" pill so a
 *     misconfigured env after deploy cannot silently look live. Writes here are
 *     simulated (see components/kmp/use-tx.ts).
 *   - SERVER mode (default once configured): a green pill with the server
 *     signer's address for this role, or an amber "belum diatur" pill when the
 *     role's service secret is missing from the API env. No Freighter.
 *   - WALLET mode (NEXT_PUBLIC_TX_MODE=wallet): the original Freighter connect
 *     button / connected-address pill.
 */
import { connectWallet, getConnectedAddress } from "@/lib/wallet";
import { getTxMode, isChainConfigured } from "@/lib/stellar";
import { fetchServerSigner } from "@/lib/tx";
import { getSupabase } from "@/lib/supabase";
import { ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

function short(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function WalletBadge() {
  const demoMode = !isChainConfigured();
  const serverMode = !demoMode && getTxMode() === "server";
  const [address, setAddress] = useState<string | null>(null);
  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) return;
    if (serverMode) {
      (async () => {
        try {
          const {
            data: { session },
          } = await getSupabase().auth.getSession();
          if (!session) return;
          const signer = await fetchServerSigner(session.access_token);
          setServerConfigured(signer.configured);
          setAddress(signer.address);
        } catch {
          setServerConfigured(false);
        }
      })();
      return;
    }
    getConnectedAddress().then(setAddress).catch(() => {});
  }, [demoMode, serverMode]);

  if (serverMode) {
    if (serverConfigured === false) {
      return (
        <div
          title="Key penandatangan server untuk peran ini belum diisi di env API."
          className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700"
        >
          <ShieldCheck size={13} className="shrink-0" />
          Penandatangan server belum diatur
        </div>
      );
    }
    return (
      <div
        title="Mode seamless: transaksi ditandatangani otomatis oleh server dengan key peran ini. Tanpa Freighter."
        className="mt-3 flex items-center gap-2 rounded-md border border-verdant-200 bg-verdant-50 px-3 py-2 text-xs font-medium text-verdant-800"
      >
        <ShieldCheck size={13} className="shrink-0" />
        {address ? (
          <span className="font-mono">{short(address)}</span>
        ) : (
          "Tanda tangan otomatis"
        )}
      </div>
    );
  }

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
