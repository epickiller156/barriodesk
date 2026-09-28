CREATE TYPE "public"."fiado_status" AS ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WRITTEN_OFF');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('PENDING', 'SENT', 'REJECTED', 'CONTINGENCY');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('LOW_STOCK', 'EXPIRATION_ALERT', 'FIADO_OVERDUE', 'PLAN_EXPIRING', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('NEW', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'MERCADOPAGO_QR', 'TRANSFER', 'DEBIT_CARD', 'CREDIT_CARD', 'FIADO', 'MIXED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PAID', 'PENDING', 'PARTIAL', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('FREE', 'VECINO', 'MAXIKIOSCO');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('GREEN', 'YELLOW', 'RED');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'LOSS', 'INITIAL');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'EMPLOYEE', 'ADMIN');--> statement-breakpoint
CREATE TABLE "cash_closings" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"opened_at" timestamp NOT NULL,
	"closed_at" timestamp NOT NULL,
	"opening_cash" numeric(12, 2) NOT NULL,
	"total_cash_sales" numeric(12, 2) NOT NULL,
	"total_mp_sales" numeric(12, 2) NOT NULL,
	"total_transfer_sales" numeric(12, 2) NOT NULL,
	"total_card_sales" numeric(12, 2) NOT NULL,
	"total_fiado_sales" numeric(12, 2) NOT NULL,
	"total_sales" numeric(12, 2) NOT NULL,
	"total_refunds" numeric(12, 2) DEFAULT '0' NOT NULL,
	"theoretical_cash" numeric(12, 2) NOT NULL,
	"actual_cash" numeric(12, 2) NOT NULL,
	"difference" numeric(12, 2) NOT NULL,
	"total_transactions" integer NOT NULL,
	"notes" text,
	"closed_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"color" text,
	"store_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nickname" text,
	"phone" text,
	"photo_url" text,
	"address" text,
	"neighborhood" text,
	"cbu_alias" text,
	"dni" text,
	"credit_limit" numeric(12, 2),
	"total_debt" numeric(12, 2) DEFAULT '0' NOT NULL,
	"risk_level" "risk_level" DEFAULT 'GREEN' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"store_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiado_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"fiado_record_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"notes" text,
	"registered_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiado_records" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"sale_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"remaining_amount" numeric(12, 2) NOT NULL,
	"due_date" timestamp,
	"status" "fiado_status" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fiado_records_sale_id_unique" UNIQUE("sale_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"order_type" text DEFAULT 'pickup' NOT NULL,
	"delivery_address" text,
	"payment_method" "payment_method" NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"status" "order_status" DEFAULT 'NEW' NOT NULL,
	"notes" text,
	"items" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"old_price" numeric(12, 2) NOT NULL,
	"new_price" numeric(12, 2) NOT NULL,
	"changed_by_id" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"barcode" text,
	"sku" text,
	"image_url" text,
	"cost_price" numeric(12, 2) NOT NULL,
	"sale_price" numeric(12, 2) NOT NULL,
	"wholesale_price" numeric(12, 2),
	"stock" integer DEFAULT 0 NOT NULL,
	"min_stock" integer DEFAULT 5 NOT NULL,
	"unit" text DEFAULT 'unidad' NOT NULL,
	"allow_fraction" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expiration_date" timestamp,
	"batch_number" text,
	"store_id" text NOT NULL,
	"category_id" text,
	"supplier_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_number" serial NOT NULL,
	"store_id" text NOT NULL,
	"supplier_id" text,
	"subtotal" numeric(12, 2) NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PAID' NOT NULL,
	"invoice_number" text,
	"notes" text,
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"cost_price" numeric(12, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_number" serial NOT NULL,
	"store_id" text NOT NULL,
	"customer_id" text,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PAID' NOT NULL,
	"is_fiado" boolean DEFAULT false NOT NULL,
	"notes" text,
	"cashier_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"previous_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"reason" text,
	"sale_id" text,
	"purchase_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"currency" text DEFAULT 'ARS' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '21.00' NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"expiration_alert_days" integer DEFAULT 15 NOT NULL,
	"allow_negative_stock" boolean DEFAULT false NOT NULL,
	"require_customer_for_sale" boolean DEFAULT false NOT NULL,
	"print_ticket_default" boolean DEFAULT true NOT NULL,
	"whatsapp_alerts_enabled" boolean DEFAULT true NOT NULL,
	"cbu_alias" text,
	"accept_cash" boolean DEFAULT true NOT NULL,
	"accept_mercado_pago" boolean DEFAULT true NOT NULL,
	"accept_transfer" boolean DEFAULT true NOT NULL,
	"accept_card" boolean DEFAULT false NOT NULL,
	"accept_delivery" boolean DEFAULT false NOT NULL,
	"accept_pickup" boolean DEFAULT true NOT NULL,
	"delivery_radius_meters" integer DEFAULT 500,
	"min_order_amount" numeric(12, 2) DEFAULT '0',
	"estimated_pickup_minutes" integer DEFAULT 15,
	"welcome_message" text,
	"debt_reminder_template" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_settings_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text NOT NULL,
	"neighborhood" text NOT NULL,
	"city" text DEFAULT 'San Miguel de Tucumán' NOT NULL,
	"province" text DEFAULT 'Tucumán' NOT NULL,
	"phone" text,
	"whatsapp_number" text,
	"cuit" text,
	"ingresos_brutos" text,
	"logo_url" text,
	"plan" "plan_type" DEFAULT 'FREE' NOT NULL,
	"plan_expires_at" timestamp,
	"owner_id" text NOT NULL,
	"store_type" text DEFAULT 'kiosco' NOT NULL,
	"is_storefront_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stores_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"address" text,
	"cuit" text,
	"category" text,
	"store_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"role" "user_role" DEFAULT 'OWNER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cash_closings" ADD CONSTRAINT "cash_closings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiado_payments" ADD CONSTRAINT "fiado_payments_fiado_record_id_fiado_records_id_fk" FOREIGN KEY ("fiado_record_id") REFERENCES "public"."fiado_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiado_payments" ADD CONSTRAINT "fiado_payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiado_records" ADD CONSTRAINT "fiado_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiado_records" ADD CONSTRAINT "fiado_records_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_barcode_idx" ON "products" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "products_store_idx" ON "products" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "sales_store_created_idx" ON "sales" USING btree ("store_id","created_at");