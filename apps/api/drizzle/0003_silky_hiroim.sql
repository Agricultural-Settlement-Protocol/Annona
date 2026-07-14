CREATE TYPE "public"."app_role" AS ENUM('kmp', 'agrinas', 'pemerintah');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('Draft', 'Dikirim', 'Diterima', 'Selisih');--> statement-breakpoint
CREATE TYPE "public"."stock_status" AS ENUM('Tersedia', 'Menipis', 'Habis');--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "app_role" NOT NULL,
	"display_name" text NOT NULL,
	"coop_id" uuid,
	"agrinas_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "harvest_shipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coop_id" uuid NOT NULL,
	"agrinas_id" uuid NOT NULL,
	"commodity_code" text NOT NULL,
	"status" "shipment_status" DEFAULT 'Draft' NOT NULL,
	"total_volume_g" bigint DEFAULT 0 NOT NULL,
	"received_volume_g" bigint,
	"discrepancy_note" text,
	"sent_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "harvest_shipment_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"delivery_id" uuid,
	"agreement_id" uuid NOT NULL,
	"farmer_id" uuid NOT NULL,
	"volume_g" bigint NOT NULL,
	"grade" text NOT NULL,
	"moisture_bps" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saprotan_catalog" ADD COLUMN "stock_status" "stock_status" DEFAULT 'Tersedia' NOT NULL;--> statement-breakpoint
ALTER TABLE "saprotan_catalog" ADD COLUMN "unit_label" text DEFAULT 'unit' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_coop_id_coop_id_fk" FOREIGN KEY ("coop_id") REFERENCES "public"."coop"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_agrinas_id_agrinas_id_fk" FOREIGN KEY ("agrinas_id") REFERENCES "public"."agrinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_shipment" ADD CONSTRAINT "harvest_shipment_coop_id_coop_id_fk" FOREIGN KEY ("coop_id") REFERENCES "public"."coop"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_shipment" ADD CONSTRAINT "harvest_shipment_agrinas_id_agrinas_id_fk" FOREIGN KEY ("agrinas_id") REFERENCES "public"."agrinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_shipment" ADD CONSTRAINT "harvest_shipment_commodity_code_commodity_code_fk" FOREIGN KEY ("commodity_code") REFERENCES "public"."commodity"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_shipment_line" ADD CONSTRAINT "harvest_shipment_line_shipment_id_harvest_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."harvest_shipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_shipment_line" ADD CONSTRAINT "harvest_shipment_line_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_shipment_line" ADD CONSTRAINT "harvest_shipment_line_agreement_id_agreement_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_shipment_line" ADD CONSTRAINT "harvest_shipment_line_farmer_id_farmer_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "harvest_shipment_coop_idx" ON "harvest_shipment" USING btree ("coop_id");--> statement-breakpoint
CREATE INDEX "harvest_shipment_agrinas_idx" ON "harvest_shipment" USING btree ("agrinas_id");--> statement-breakpoint
CREATE INDEX "harvest_shipment_status_idx" ON "harvest_shipment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "harvest_shipment_line_shipment_idx" ON "harvest_shipment_line" USING btree ("shipment_id");