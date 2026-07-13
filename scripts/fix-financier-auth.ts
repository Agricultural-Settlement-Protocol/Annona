/**
 * One-shot repair: rebuild the financier@annona.id Supabase auth user cleanly.
 * The earlier ad-hoc creation left NULL token columns, which makes GoTrue fail
 * password login with 500 "Database error querying schema" (Go cannot scan NULL
 * into its string token fields). This deletes + recreates the row with every
 * token column = '' and a well-formed identity, then re-links app_user.
 *
 * Run: DATABASE_URL=... pnpm tsx scripts/fix-financier-auth.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../apps/api/src/db/client.js";

const EMAIL = "financier@annona.id";
const PASSWORD = "AnnonaFinancier2026!";

async function main(): Promise<void> {
  const db = getDb();

  console.log("[fix] removing any existing financier auth rows...");
  await db.execute(sql`
    delete from auth.identities
    where user_id in (select id from auth.users where email = ${EMAIL})
  `);
  await db.execute(sql`delete from auth.users where email = ${EMAIL}`);

  console.log("[fix] inserting clean auth.users + auth.identities...");
  await db.execute(sql`
    with new_user as (
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        email_change_token_current, phone_change, phone_change_token, reauthentication_token
      ) values (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated', 'authenticated',
        ${EMAIL}::text,
        extensions.crypt(${PASSWORD}::text, extensions.gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(), now(),
        '', '', '', '', '', '', '', ''
      )
      returning id
    )
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    select
      id::text, id,
      jsonb_build_object('sub', id::text, 'email', ${EMAIL}::text),
      'email', now(), now(), now()
    from new_user
  `);

  console.log("[fix] re-linking app_user role...");
  const finRows = (await db.execute(
    sql`select id from financier limit 1`,
  )) as unknown as { id: string }[];
  const financierId = finRows[0]?.id ?? null;
  await db.execute(sql`
    insert into app_user (id, email, role, display_name, financier_id)
    select u.id, ${EMAIL}::text, 'financier'::app_role, 'Pemodal (LPDB Koperasi)', ${financierId}::uuid
    from auth.users u
    where u.email = ${EMAIL}::text
    on conflict (id) do update set
      role = excluded.role, display_name = excluded.display_name,
      financier_id = excluded.financier_id
  `);

  console.log(`[fix] done. financier_id=${financierId}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
