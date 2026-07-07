"use client";

/**
 * Browser Supabase client (singleton). Auth is email + password (MVP).
 * Role lookup comes from the app_user table (RLS: select own row only).
 */

import { createBrowserClient } from "@supabase/ssr";

export type AppRole = "kmp" | "agrinas" | "pemerintah";

export const ROLE_HOME: Record<AppRole, string> = {
  kmp: "/kmp",
  agrinas: "/oversight/agrinas",
  pemerintah: "/oversight/pemerintah",
};

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    );
  }
  return client;
}

const ROLE_CACHE_KEY = "annona.auth.role";

/** Resolve the signed-in user's app role, with a localStorage fast path. */
export async function resolveRole(): Promise<AppRole | null> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    localStorage.removeItem(ROLE_CACHE_KEY);
    return null;
  }
  const cached = localStorage.getItem(ROLE_CACHE_KEY);
  if (cached === "kmp" || cached === "agrinas" || cached === "pemerintah") return cached;

  const { data } = await supabase.from("app_user").select("role").eq("id", user.id).maybeSingle();
  const role = (data?.role as AppRole | undefined) ?? null;
  if (role) localStorage.setItem(ROLE_CACHE_KEY, role);
  return role;
}

export async function signOutToAuth(): Promise<void> {
  const supabase = getSupabase();
  localStorage.removeItem(ROLE_CACHE_KEY);
  await supabase.auth.signOut();
  window.location.href = "/auth";
}
