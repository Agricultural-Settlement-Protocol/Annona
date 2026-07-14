-- Phase 4b: rename the input-principal party "agrinas" -> "supplier" across the
-- off-chain schema. Data-preserving (ALTER ... RENAME). Applied to Supabase via
-- supabase/migrations/20260712140000_v40_supplier_rename.sql; this drizzle copy
-- keeps ./drizzle history + the meta snapshot in sync with src/db/schema.ts.
UPDATE "app_user" SET "role" = 'supplier' WHERE "role" = 'agrinas';--> statement-breakpoint
UPDATE "app_user" SET "supplier_id" = "agrinas_id" WHERE "supplier_id" IS NULL AND "agrinas_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" DROP COLUMN "agrinas_id";--> statement-breakpoint
ALTER TYPE "app_role" RENAME TO "app_role_old";--> statement-breakpoint
CREATE TYPE "app_role" AS ENUM('kmp', 'pemerintah', 'supplier', 'financier');--> statement-breakpoint
ALTER TABLE "app_user" ALTER COLUMN "role" TYPE "app_role" USING "role"::text::"app_role";--> statement-breakpoint
DROP TYPE "app_role_old";--> statement-breakpoint
ALTER TABLE "coop" RENAME COLUMN "agrinas_id" TO "supplier_id";--> statement-breakpoint
ALTER TABLE "saprotan_catalog" RENAME COLUMN "agrinas_id" TO "supplier_id";--> statement-breakpoint
ALTER TABLE "saprotan_catalog" RENAME COLUMN "base_price_agrinas" TO "base_price_supplier";--> statement-breakpoint
ALTER TABLE "agreement" RENAME COLUMN "agrinas_id" TO "supplier_id";--> statement-breakpoint
ALTER TABLE "agreement" RENAME COLUMN "base_price_agrinas" TO "base_price_supplier";--> statement-breakpoint
ALTER TABLE "agreement_input" RENAME COLUMN "base_price_agrinas" TO "base_price_supplier";--> statement-breakpoint
ALTER TABLE "residu_remittance" RENAME COLUMN "agrinas_id" TO "supplier_id";--> statement-breakpoint
ALTER TABLE "harvest_shipment" RENAME COLUMN "agrinas_id" TO "supplier_id";--> statement-breakpoint
ALTER TABLE "settlement" RENAME COLUMN "principal_to_agrinas" TO "principal_to_supplier";--> statement-breakpoint
ALTER INDEX "coop_agrinas_id_idx" RENAME TO "coop_supplier_id_idx";--> statement-breakpoint
ALTER INDEX "saprotan_catalog_agrinas_id_idx" RENAME TO "saprotan_catalog_supplier_id_idx";--> statement-breakpoint
ALTER INDEX "agreement_agrinas_id_idx" RENAME TO "agreement_supplier_id_idx";--> statement-breakpoint
ALTER INDEX "residu_remittance_agrinas_id_idx" RENAME TO "residu_remittance_supplier_id_idx";--> statement-breakpoint
ALTER INDEX "harvest_shipment_agrinas_idx" RENAME TO "harvest_shipment_supplier_idx";--> statement-breakpoint
ALTER TABLE "agrinas" RENAME TO "supplier";
