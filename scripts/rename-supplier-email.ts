/**
 * One-shot: rename the Supplier operator login email
 * agrinas@annona.id -> pupukindonesia@annona.id on the live Supabase project.
 * Role lookup is by auth uid (app_user.id), so only the auth email needs to
 * change; password + uid + app_user row are untouched. Updates auth.users and
 * the email-provider auth.identities row (provider_id + email + identity_data).
 *
 * Run: DATABASE_URL=... pnpm tsx scripts/rename-supplier-email.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../apps/api/src/db/client.js";

const OLD = "agrinas@annona.id";
const NEW = "pupukindonesia@annona.id";

async function main(): Promise<void> {
  const db = getDb();

  const before = await db.execute(sql`
    select id, email, email_confirmed_at is not null as confirmed
    from auth.users where email in (${OLD}, ${NEW})
  `);
  console.log("[before]", JSON.stringify(before));

  await db.execute(sql`
    update auth.users set email = ${NEW}::text, updated_at = now()
    where email = ${OLD}::text
  `);
  await db.execute(sql`
    update auth.identities
    set provider_id = ${NEW}::text,
        identity_data = jsonb_set(identity_data, '{email}', to_jsonb(${NEW}::text)),
        updated_at = now()
    where provider = 'email'
      and user_id in (select id from auth.users where email = ${NEW}::text)
  `);

  const after = await db.execute(sql`
    select u.id, u.email, i.provider_id, i.identity_data->>'email' as ident_email
    from auth.users u
    left join auth.identities i on i.user_id = u.id and i.provider = 'email'
    where u.email = ${NEW}::text
  `);
  console.log("[after]", JSON.stringify(after));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
