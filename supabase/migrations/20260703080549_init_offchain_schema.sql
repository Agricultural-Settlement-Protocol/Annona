CREATE TYPE "public"."agreement_status" AS ENUM('Created', 'SupplyDispatched', 'Active', 'PartiallyDelivered', 'Delivered', 'Settled', 'Flagged', 'ForceMajeure');
CREATE TYPE "public"."flag_reason" AS ENUM('None', 'Warning', 'PartialDelivery', 'Suspected');
CREATE TYPE "public"."residu_status" AS ENUM('Pending', 'Remitted', 'Cleared', 'Disputed');
CREATE TABLE "agreement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"onchain_id" bigint,
	"coop_id" uuid NOT NULL,
	"farmer_id" uuid NOT NULL,
	"agrinas_id" uuid NOT NULL,
	"commodity_code" text NOT NULL,
	"grade" text NOT NULL,
	"moisture_bps" integer NOT NULL,
	"base_price_agrinas" bigint NOT NULL,
	"saprotan_markup_bps" integer NOT NULL,
	"input_debt" bigint NOT NULL,
	"hpp_handling_fee_bps" integer NOT NULL,
	"expected_vol_g" bigint NOT NULL,
	"hpp_per_kg" bigint NOT NULL,
	"hpp_version" integer NOT NULL,
	"tolerance_bps" integer NOT NULL,
	"status" "agreement_status" DEFAULT 'Created' NOT NULL,
	"flag" "flag_reason" DEFAULT 'None' NOT NULL,
	"residu_status" "residu_status" DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agreement_onchain_id_unique" UNIQUE("onchain_id")
);

CREATE TABLE "agreement_input" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agreement_id" uuid NOT NULL,
	"catalog_id" uuid NOT NULL,
	"qty" numeric(12, 2) NOT NULL,
	"base_price_agrinas" bigint NOT NULL,
	"line_total_principal" bigint NOT NULL
);

CREATE TABLE "agrinas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"wallet_address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agrinas_wallet_address_unique" UNIQUE("wallet_address")
);

CREATE TABLE "commodity" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text DEFAULT 'kg' NOT NULL,
	"hpp_version" integer NOT NULL
);

CREATE TABLE "coop" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agrinas_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kecamatan" text NOT NULL,
	"kabupaten" text NOT NULL,
	"provinsi" text NOT NULL,
	"wallet_address" text NOT NULL,
	"prefunded_cash_balance" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coop_wallet_address_unique" UNIQUE("wallet_address")
);

CREATE TABLE "coop_reputation_cache" (
	"coop_id" uuid PRIMARY KEY NOT NULL,
	"agreements" integer DEFAULT 0 NOT NULL,
	"settlements" integer DEFAULT 0 NOT NULL,
	"total_residu_principal" bigint DEFAULT 0 NOT NULL,
	"total_residu_cleared" bigint DEFAULT 0 NOT NULL,
	"disputes" integer DEFAULT 0 NOT NULL,
	"frozen" boolean DEFAULT false NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agreement_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"volume_g" bigint NOT NULL,
	"grade" text NOT NULL,
	"moisture_bps" integer,
	"receipt_onchain_ref" text,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"flag" "flag_reason" DEFAULT 'None' NOT NULL
);

CREATE TABLE "event_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tx_hash" text NOT NULL,
	"event_index" integer NOT NULL,
	"type" text NOT NULL,
	"ledger" integer NOT NULL,
	"ledger_timestamp" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "farmer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"ktp_raw" text NOT NULL,
	"ktp_hash" text NOT NULL,
	"wallet_address" text NOT NULL,
	"plot_area_ha" numeric(8, 2) NOT NULL,
	"default_commodity_code" text,
	"kecamatan" text NOT NULL,
	"kabupaten" text NOT NULL,
	"geo" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "farmer_wallet_address_unique" UNIQUE("wallet_address")
);

CREATE TABLE "indexer_cursor" (
	"contract_id" text PRIMARY KEY NOT NULL,
	"last_ledger" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "price_ref" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commodity_code" text NOT NULL,
	"hpp" bigint NOT NULL,
	"hpp_source" text NOT NULL,
	"market_price_kabupaten" bigint,
	"pihps_source" text,
	"as_of" date NOT NULL
);

CREATE TABLE "reputation_cache" (
	"farmer_id" uuid PRIMARY KEY NOT NULL,
	"deliveries" integer DEFAULT 0 NOT NULL,
	"on_time" integer DEFAULT 0 NOT NULL,
	"total_settled_g" bigint DEFAULT 0 NOT NULL,
	"flags" integer DEFAULT 0 NOT NULL,
	"force_majeure_events" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "residu_remittance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coop_id" uuid NOT NULL,
	"agrinas_id" uuid NOT NULL,
	"agreement_onchain_id" bigint NOT NULL,
	"principal_amount" bigint NOT NULL,
	"bank_ref" text,
	"proof_url" text,
	"status" "residu_status" DEFAULT 'Pending' NOT NULL,
	"dispute_reason" text,
	"remittance_tx_hash" text,
	"remitted_at" timestamp with time zone,
	"cleared_at" timestamp with time zone
);

CREATE TABLE "saprotan_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agrinas_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"region" text NOT NULL,
	"base_price_agrinas" bigint NOT NULL,
	"subsidi_flag" boolean DEFAULT false NOT NULL,
	"source" text,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "settlement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"gross" bigint NOT NULL,
	"handling_cut" bigint NOT NULL,
	"debt_netted" bigint NOT NULL,
	"principal_to_agrinas" bigint NOT NULL,
	"coop_margin" bigint NOT NULL,
	"net_paid" bigint NOT NULL,
	"rupiah_ref" text,
	"settlement_tx_hash" text,
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "yield_table" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commodity_code" text NOT NULL,
	"kabupaten" text NOT NULL,
	"avg_yield_t_per_ha" numeric(6, 2) NOT NULL,
	"source" text NOT NULL,
	"year" integer NOT NULL
);

ALTER TABLE "agreement" ADD CONSTRAINT "agreement_coop_id_coop_id_fk" FOREIGN KEY ("coop_id") REFERENCES "public"."coop"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "agreement" ADD CONSTRAINT "agreement_farmer_id_farmer_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "agreement" ADD CONSTRAINT "agreement_agrinas_id_agrinas_id_fk" FOREIGN KEY ("agrinas_id") REFERENCES "public"."agrinas"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "agreement" ADD CONSTRAINT "agreement_commodity_code_commodity_code_fk" FOREIGN KEY ("commodity_code") REFERENCES "public"."commodity"("code") ON DELETE no action ON UPDATE no action;
ALTER TABLE "agreement_input" ADD CONSTRAINT "agreement_input_agreement_id_agreement_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreement"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "agreement_input" ADD CONSTRAINT "agreement_input_catalog_id_saprotan_catalog_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."saprotan_catalog"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "coop" ADD CONSTRAINT "coop_agrinas_id_agrinas_id_fk" FOREIGN KEY ("agrinas_id") REFERENCES "public"."agrinas"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "coop_reputation_cache" ADD CONSTRAINT "coop_reputation_cache_coop_id_coop_id_fk" FOREIGN KEY ("coop_id") REFERENCES "public"."coop"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_agreement_id_agreement_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreement"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "farmer" ADD CONSTRAINT "farmer_coop_id_coop_id_fk" FOREIGN KEY ("coop_id") REFERENCES "public"."coop"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "farmer" ADD CONSTRAINT "farmer_default_commodity_code_commodity_code_fk" FOREIGN KEY ("default_commodity_code") REFERENCES "public"."commodity"("code") ON DELETE no action ON UPDATE no action;
ALTER TABLE "price_ref" ADD CONSTRAINT "price_ref_commodity_code_commodity_code_fk" FOREIGN KEY ("commodity_code") REFERENCES "public"."commodity"("code") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reputation_cache" ADD CONSTRAINT "reputation_cache_farmer_id_farmer_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "residu_remittance" ADD CONSTRAINT "residu_remittance_coop_id_coop_id_fk" FOREIGN KEY ("coop_id") REFERENCES "public"."coop"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "residu_remittance" ADD CONSTRAINT "residu_remittance_agrinas_id_agrinas_id_fk" FOREIGN KEY ("agrinas_id") REFERENCES "public"."agrinas"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "saprotan_catalog" ADD CONSTRAINT "saprotan_catalog_agrinas_id_agrinas_id_fk" FOREIGN KEY ("agrinas_id") REFERENCES "public"."agrinas"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "yield_table" ADD CONSTRAINT "yield_table_commodity_code_commodity_code_fk" FOREIGN KEY ("commodity_code") REFERENCES "public"."commodity"("code") ON DELETE no action ON UPDATE no action;
CREATE INDEX "agreement_coop_id_idx" ON "agreement" USING btree ("coop_id");
CREATE INDEX "agreement_farmer_id_idx" ON "agreement" USING btree ("farmer_id");
CREATE INDEX "agreement_agrinas_id_idx" ON "agreement" USING btree ("agrinas_id");
CREATE INDEX "agreement_status_idx" ON "agreement" USING btree ("status");
CREATE INDEX "agreement_input_agreement_id_idx" ON "agreement_input" USING btree ("agreement_id");
CREATE INDEX "coop_agrinas_id_idx" ON "coop" USING btree ("agrinas_id");
CREATE UNIQUE INDEX "delivery_agreement_seq_idx" ON "delivery" USING btree ("agreement_id","seq");
CREATE UNIQUE INDEX "event_log_tx_hash_event_index_idx" ON "event_log" USING btree ("tx_hash","event_index");
CREATE INDEX "event_log_type_idx" ON "event_log" USING btree ("type");
CREATE INDEX "event_log_ledger_idx" ON "event_log" USING btree ("ledger");
CREATE INDEX "farmer_coop_id_idx" ON "farmer" USING btree ("coop_id");
CREATE INDEX "farmer_ktp_hash_idx" ON "farmer" USING btree ("ktp_hash");
CREATE INDEX "price_ref_commodity_code_idx" ON "price_ref" USING btree ("commodity_code");
CREATE INDEX "residu_remittance_coop_id_idx" ON "residu_remittance" USING btree ("coop_id");
CREATE INDEX "residu_remittance_agrinas_id_idx" ON "residu_remittance" USING btree ("agrinas_id");
CREATE INDEX "residu_remittance_status_idx" ON "residu_remittance" USING btree ("status");
CREATE INDEX "residu_remittance_agreement_onchain_id_idx" ON "residu_remittance" USING btree ("agreement_onchain_id");
CREATE UNIQUE INDEX "saprotan_catalog_code_region_idx" ON "saprotan_catalog" USING btree ("code","region");
CREATE INDEX "saprotan_catalog_agrinas_id_idx" ON "saprotan_catalog" USING btree ("agrinas_id");
CREATE INDEX "settlement_delivery_id_idx" ON "settlement" USING btree ("delivery_id");
CREATE UNIQUE INDEX "yield_table_commodity_kabupaten_year_idx" ON "yield_table" USING btree ("commodity_code","kabupaten","year");
-- ── Row Level Security ────────────────────────────────────────────────────
-- Every table gets RLS enabled with NO policies = deny-all for anon /
-- authenticated (Data API). The Hono API connects as the table owner via the
-- pooler and is not subject to RLS; the browser never talks to this schema
-- directly. Add scoped policies later if/when the Data API is used.
ALTER TABLE "agreement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agreement_input" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agrinas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commodity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coop_reputation_cache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farmer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "indexer_cursor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "price_ref" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reputation_cache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "residu_remittance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saprotan_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "yield_table" ENABLE ROW LEVEL SECURITY;
