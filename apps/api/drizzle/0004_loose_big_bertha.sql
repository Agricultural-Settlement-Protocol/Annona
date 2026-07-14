CREATE TYPE "public"."funding_status" AS ENUM('Requested', 'Approved', 'Rejected', 'Disbursed', 'Reconciled');--> statement-breakpoint
CREATE TYPE "public"."payable_status" AS ENUM('Outstanding', 'Partial', 'Cleared');--> statement-breakpoint
CREATE TYPE "public"."subsidy_status" AS ENUM('Terverifikasi', 'Belum', 'NonSubsidi');--> statement-breakpoint
CREATE TYPE "public"."subsidy_tier" AS ENUM('Subsidized', 'Commercial');--> statement-breakpoint
ALTER TYPE "public"."app_role" ADD VALUE 'supplier';--> statement-breakpoint
ALTER TYPE "public"."app_role" ADD VALUE 'financier';--> statement-breakpoint
CREATE TABLE "financier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"wallet_address" text NOT NULL,
	"pool_balance" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financier_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "funding_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"onchain_id" bigint,
	"coop_id" uuid NOT NULL,
	"financier_id" uuid NOT NULL,
	"backing_hash" text,
	"projected_settlement" bigint DEFAULT 0 NOT NULL,
	"amount_requested" bigint DEFAULT 0 NOT NULL,
	"amount_approved" bigint DEFAULT 0 NOT NULL,
	"amount_disbursed" bigint DEFAULT 0 NOT NULL,
	"amount_reconciled" bigint DEFAULT 0 NOT NULL,
	"coverage_ratio_bps" integer,
	"risk_badge" text,
	"status" "funding_status" DEFAULT 'Requested' NOT NULL,
	"proof_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funding_request_onchain_id_unique" UNIQUE("onchain_id")
);
--> statement-breakpoint
CREATE TABLE "funding_request_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funding_request_id" uuid NOT NULL,
	"agreement_id" uuid NOT NULL,
	"backing_value" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_payable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coop_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"agreement_onchain_id" bigint,
	"principal_accrued" bigint DEFAULT 0 NOT NULL,
	"principal_settled" bigint DEFAULT 0 NOT NULL,
	"status" "payable_status" DEFAULT 'Outstanding' NOT NULL,
	"accrued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cleared_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "warehouse_operator" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kabupaten" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agreement" ADD COLUMN "subsidy_tier" "subsidy_tier" DEFAULT 'Commercial' NOT NULL;--> statement-breakpoint
ALTER TABLE "agreement" ADD COLUMN "financier_id" uuid;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "financier_id" uuid;--> statement-breakpoint
ALTER TABLE "farmer" ADD COLUMN "subsidy_status" "subsidy_status" DEFAULT 'NonSubsidi' NOT NULL;--> statement-breakpoint
ALTER TABLE "saprotan_catalog" ADD COLUMN "price_tier" text DEFAULT 'non_subsidi' NOT NULL;--> statement-breakpoint
ALTER TABLE "saprotan_catalog" ADD COLUMN "het_price" bigint;--> statement-breakpoint
ALTER TABLE "saprotan_catalog" ADD COLUMN "erdkk_gated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "funding_request" ADD CONSTRAINT "funding_request_coop_id_coop_id_fk" FOREIGN KEY ("coop_id") REFERENCES "public"."coop"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_request" ADD CONSTRAINT "funding_request_financier_id_financier_id_fk" FOREIGN KEY ("financier_id") REFERENCES "public"."financier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_request_line" ADD CONSTRAINT "funding_request_line_funding_request_id_funding_request_id_fk" FOREIGN KEY ("funding_request_id") REFERENCES "public"."funding_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_request_line" ADD CONSTRAINT "funding_request_line_agreement_id_agreement_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payable" ADD CONSTRAINT "supplier_payable_coop_id_coop_id_fk" FOREIGN KEY ("coop_id") REFERENCES "public"."coop"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payable" ADD CONSTRAINT "supplier_payable_supplier_id_agrinas_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."agrinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "funding_request_coop_idx" ON "funding_request" USING btree ("coop_id");--> statement-breakpoint
CREATE INDEX "funding_request_financier_idx" ON "funding_request" USING btree ("financier_id");--> statement-breakpoint
CREATE INDEX "funding_request_status_idx" ON "funding_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "funding_request_line_request_idx" ON "funding_request_line" USING btree ("funding_request_id");--> statement-breakpoint
CREATE INDEX "supplier_payable_coop_idx" ON "supplier_payable" USING btree ("coop_id");--> statement-breakpoint
CREATE INDEX "supplier_payable_supplier_idx" ON "supplier_payable" USING btree ("supplier_id");--> statement-breakpoint
ALTER TABLE "agreement" ADD CONSTRAINT "agreement_financier_id_financier_id_fk" FOREIGN KEY ("financier_id") REFERENCES "public"."financier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_supplier_id_agrinas_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."agrinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_financier_id_financier_id_fk" FOREIGN KEY ("financier_id") REFERENCES "public"."financier"("id") ON DELETE no action ON UPDATE no action;