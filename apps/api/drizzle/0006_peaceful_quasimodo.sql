CREATE TABLE "warehouse_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coop_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"category" text NOT NULL,
	"in_qty" text DEFAULT '' NOT NULL,
	"out_qty" text DEFAULT '' NOT NULL,
	"balance" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_coop_id_coop_id_fk" FOREIGN KEY ("coop_id") REFERENCES "public"."coop"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "warehouse_stock_coop_id_idx" ON "warehouse_stock" USING btree ("coop_id");