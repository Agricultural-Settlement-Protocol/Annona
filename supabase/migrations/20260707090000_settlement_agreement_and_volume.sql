ALTER TABLE "settlement" ALTER COLUMN "delivery_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement" ADD COLUMN "agreement_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement" ADD COLUMN "settled_vol_g" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_agreement_id_agreement_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "settlement_agreement_id_idx" ON "settlement" USING btree ("agreement_id");