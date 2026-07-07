"use client";

/**
 * /auth — single sign-in page for all three roles (MVP: Supabase email +
 * password, seeded demo accounts). Role is looked up in app_user and routes
 * to /kmp, /oversight/agrinas, or /oversight/pemerintah.
 */

import { DEMO_ACCOUNTS } from "@/lib/mock-data";
import { ROLE_HOME, getSupabase, resolveRole } from "@/lib/supabase";
import { Alert, Button, Input, Logo } from "@annona/ui";
import { Building2, Landmark, LogIn, ShieldCheck, Wheat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ROLE_ICON = {
  kmp: Wheat,
  agrinas: Building2,
  pemerintah: Landmark,
} as const;

const DEMO_PASSWORDS: Record<string, string> = {
  "kmp@annona.id": "AnnonaKMP2026!",
  "agrinas@annona.id": "AnnonaAgrinas2026!",
  "pemerintah@annona.id": "AnnonaGov2026!",
};

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Already signed in? Straight to the dashboard.
  useEffect(() => {
    (async () => {
      const role = await resolveRole();
      if (role) router.replace(ROLE_HOME[role]);
    })();
  }, [router]);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) {
      setError("Email atau kata sandi salah. Periksa kembali kredensial Anda.");
      setLoading(false);
      return;
    }
    const role = await resolveRole();
    if (!role) {
      setError("Akun ini belum memiliki peran. Hubungi administrator.");
      setLoading(false);
      return;
    }
    router.replace(ROLE_HOME[role]);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="h-9 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Masuk ke Annona</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Satu pintu untuk KMP, Agrinas, dan Pemerintah. Peran Anda menentukan dasbor yang
              terbuka.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
        >
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="nama@annona.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <Input
            label="Kata Sandi"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            leftIcon={<LogIn size={16} />}
            disabled={loading || !email.trim() || !password}
          >
            {loading ? "Memeriksa..." : "Masuk"}
          </Button>
        </form>

        <div className="rounded-xl border border-border bg-surface-muted/60 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ShieldCheck size={13} />
            Akun demo (testnet). Klik untuk mengisi otomatis:
          </p>
          <div className="space-y-1.5">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = ROLE_ICON[acc.role];
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(DEMO_PASSWORDS[acc.email] ?? "");
                    setError(null);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-verdant-300 hover:bg-verdant-50/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Icon size={15} className="shrink-0 text-verdant-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {acc.displayName}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {acc.email}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
