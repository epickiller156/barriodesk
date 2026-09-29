ALTER TABLE "orders" ADD COLUMN "delivery_cost" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "delivery_cost" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "delivery_message" text;