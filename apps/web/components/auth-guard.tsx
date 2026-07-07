"use client";

/**
 * Client-side route guard (MVP). Redirects to /auth when signed out, or to
 * the user's own dashboard when the role does not match this subtree.
 * Server-side enforcement arrives with the real API; data here is mock.
 */

import { type AppRole, ROLE_HOME, resolveRole } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

export function AuthGuard({
  requiredRole,
  children,
}: {
  requiredRole: AppRole;
  children: ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const role = await resolveRole();
      if (cancelled) return;
      if (!role) {
        router.replace("/auth");
        return;
      }
      if (role !== requiredRole) {
        router.replace(ROLE_HOME[role]);
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [requiredRole, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-verdant-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memeriksa sesi masuk...</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
