/** Seeded demo accounts (Supabase Auth + app_user role links). Mirrors
 *  apps/web/app/auth/page.tsx DEMO_PASSWORDS and scripts/seed.ts seedAppUsers. */
export type Role = "kmp" | "supplier" | "pemerintah" | "financier";

export interface DemoAccount {
  email: string;
  password: string;
  role: Role;
  home: string;
}

export const ACCOUNTS: Record<Role, DemoAccount> = {
  kmp: {
    email: "kmp@annona.id",
    password: "AnnonaKMP2026!",
    role: "kmp",
    home: "/kmp",
  },
  supplier: {
    email: "pupukindonesia@annona.id",
    password: "AnnonaSupplier2026!",
    role: "supplier",
    home: "/oversight/supplier",
  },
  pemerintah: {
    email: "pemerintah@annona.id",
    password: "AnnonaGov2026!",
    role: "pemerintah",
    home: "/oversight/pemerintah",
  },
  financier: {
    email: "financier@annona.id",
    password: "AnnonaFinancier2026!",
    role: "financier",
    home: "/financier",
  },
};
