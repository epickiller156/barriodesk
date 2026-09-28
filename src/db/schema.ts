import {
  pgTable,
  text,
  varchar,
  boolean,
  integer,
  decimal,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  serial,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["OWNER", "EMPLOYEE", "ADMIN"]);
export const planTypeEnum = pgEnum("plan_type", ["FREE", "VECINO", "MAXIKIOSCO"]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH", "MERCADOPAGO_QR", "TRANSFER", "DEBIT_CARD", "CREDIT_CARD", "FIADO", "MIXED"
]);
export const paymentStatusEnum = pgEnum("payment_status", ["PAID", "PENDING", "PARTIAL", "CANCELLED"]);
export const fiadoStatusEnum = pgEnum("fiado_status", ["PENDING", "PARTIAL", "PAID", "OVERDUE", "WRITTEN_OFF"]);
export const riskLevelEnum = pgEnum("risk_level", ["GREEN", "YELLOW", "RED"]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "SALE", "PURCHASE", "ADJUSTMENT", "RETURN", "LOSS", "INITIAL"
]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["PENDING", "SENT", "REJECTED", "CONTINGENCY"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "LOW_STOCK", "EXPIRATION_ALERT", "FIADO_OVERDUE", "PLAN_EXPIRING", "SYSTEM"
]);
export const orderStatusEnum = pgEnum("order_status", ["NEW", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]);

// ─── USERS ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").default("OWNER").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── STORES ───────────────────────────────────────────────────────────────────

export const stores = pgTable("stores", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  address: text("address").notNull(),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").default("San Miguel de Tucumán").notNull(),
  province: text("province").default("Tucumán").notNull(),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  cuit: text("cuit"),
  ingresosBrutos: text("ingresos_brutos"),
  logoUrl: text("logo_url"),
  plan: planTypeEnum("plan").default("FREE").notNull(),
  planExpiresAt: timestamp("plan_expires_at"),
  ownerId: text("owner_id").notNull().references(() => users.id),
  storeType: text("store_type").default("kiosco").notNull(),
  isStorefrontActive: boolean("is_storefront_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const storeSettings = pgTable("store_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id").notNull().references(() => stores.id).unique(),
  currency: text("currency").default("ARS").notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("21.00").notNull(),
  lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
  expirationAlertDays: integer("expiration_alert_days").default(15).notNull(),
  allowNegativeStock: boolean("allow_negative_stock").default(false).notNull(),
  requireCustomerForSale: boolean("require_customer_for_sale").default(false).notNull(),
  printTicketDefault: boolean("print_ticket_default").default(true).notNull(),
  whatsappAlertsEnabled: boolean("whatsapp_alerts_enabled").default(true).notNull(),
  cbuAlias: text("cbu_alias"),
  acceptCash: boolean("accept_cash").default(true).notNull(),
  acceptMercadoPago: boolean("accept_mercado_pago").default(true).notNull(),
  acceptTransfer: boolean("accept_transfer").default(true).notNull(),
  acceptCard: boolean("accept_card").default(false).notNull(),
  acceptDelivery: boolean("accept_delivery").default(false).notNull(),
  acceptPickup: boolean("accept_pickup").default(true).notNull(),
  deliveryRadiusMeters: integer("delivery_radius_meters").default(500),
  minOrderAmount: decimal("min_order_amount", { precision: 12, scale: 2 }).default("0"),
  estimatedPickupMinutes: integer("estimated_pickup_minutes").default(15),
  welcomeMessage: text("welcome_message"),
  debtReminderTemplate: text("debt_reminder_template"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  cuit: text("cuit"),
  category: text("category"),
  storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  barcode: text("barcode"),
  sku: text("sku"),
  imageUrl: text("image_url"),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull(),
  salePrice: decimal("sale_price", { precision: 12, scale: 2 }).notNull(),
  wholesalePrice: decimal("wholesale_price", { precision: 12, scale: 2 }),
  stock: integer("stock").default(0).notNull(),
  minStock: integer("min_stock").default(5).notNull(),
  unit: text("unit").default("unidad").notNull(),
  allowFraction: boolean("allow_fraction").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expirationDate: timestamp("expiration_date"),
  batchNumber: text("batch_number"),
  storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id),
  supplierId: text("supplier_id").references(() => suppliers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("products_barcode_idx").on(table.barcode),
  index("products_store_idx").on(table.storeId),
]);

export const priceHistory = pgTable("price_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  oldPrice: decimal("old_price", { precision: 12, scale: 2 }).notNull(),
  newPrice: decimal("new_price", { precision: 12, scale: 2 }).notNull(),
  changedById: text("changed_by_id").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockMovements = pgTable("stock_movements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  type: stockMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  reason: text("reason"),
  saleId: text("sale_id"),
  purchaseId: text("purchase_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  nickname: text("nickname"),
  phone: text("phone"),
  photoUrl: text("photo_url"),
  address: text("address"),
  neighborhood: text("neighborhood"),
  cbuAlias: text("cbu_alias"),
  dni: text("dni"),
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),
  totalDebt: decimal("total_debt", { precision: 12, scale: 2 }).default("0").notNull(),
  riskLevel: riskLevelEnum("risk_level").default("GREEN").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── SALES ────────────────────────────────────────────────────────────────────

export const sales = pgTable("sales", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  saleNumber: serial("sale_number"),
  storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  customerId: text("customer_id").references(() => customers.id),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("PAID").notNull(),
  isFiado: boolean("is_fiado").default(false).notNull(),
  notes: text("notes"),
  cashierId: text("cashier_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("sales_store_created_idx").on(table.storeId, table.createdAt),
]);

export const saleItems = pgTable("sale_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  saleId: text("sale_id").notNull().references(() => sales.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── FIADO ────────────────────────────────────────────────────────────────────

export const fiadoRecords = pgTable("fiado_records", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id),
  saleId: text("sale_id").notNull().references(() => sales.id).unique(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  remainingAmount: decimal("remaining_amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  status: fiadoStatusEnum("status").default("PENDING").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fiadoPayments = pgTable("fiado_payments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fiadoRecordId: text("fiado_record_id").notNull().references(() => fiadoRecords.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  notes: text("notes"),
  registeredById: text("registered_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── CASH CLOSINGS ────────────────────────────────────────────────────────────

export const cashClosings = pgTable("cash_closings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  openedAt: timestamp("opened_at").notNull(),
  closedAt: timestamp("closed_at").notNull(),
  openingCash: decimal("opening_cash", { precision: 12, scale: 2 }).notNull(),
  totalCashSales: decimal("total_cash_sales", { precision: 12, scale: 2 }).notNull(),
  totalMpSales: decimal("total_mp_sales", { precision: 12, scale: 2 }).notNull(),
  totalTransferSales: decimal("total_transfer_sales", { precision: 12, scale: 2 }).notNull(),
  totalCardSales: decimal("total_card_sales", { precision: 12, scale: 2 }).notNull(),
  totalFiadoSales: decimal("total_fiado_sales", { precision: 12, scale: 2 }).notNull(),
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).notNull(),
  totalRefunds: decimal("total_refunds", { precision: 12, scale: 2 }).default("0").notNull(),
  theoreticalCash: decimal("theoretical_cash", { precision: 12, scale: 2 }).notNull(),
  actualCash: decimal("actual_cash", { precision: 12, scale: 2 }).notNull(),
  difference: decimal("difference", { precision: 12, scale: 2 }).notNull(),
  totalTransactions: integer("total_transactions").notNull(),
  notes: text("notes"),
  closedById: text("closed_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── PURCHASES ────────────────────────────────────────────────────────────────

export const purchases = pgTable("purchases", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseNumber: serial("purchase_number"),
  storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  supplierId: text("supplier_id").references(() => suppliers.id),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("PAID").notNull(),
  invoiceNumber: text("invoice_number"),
  notes: text("notes"),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseId: text("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── PUSH SUBSCRIPTIONS ───────────────────────────────────────────────────────

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── ORDERS (Storefront) ──────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  orderType: text("order_type").default("pickup").notNull(),
  deliveryAddress: text("delivery_address"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default("NEW").notNull(),
  notes: text("notes"),
  items: jsonb("items").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  store: one(stores, { fields: [users.id], references: [stores.ownerId] }),
  refreshTokens: many(refreshTokens),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  owner: one(users, { fields: [stores.ownerId], references: [users.id] }),
  settings: one(storeSettings, { fields: [stores.id], references: [storeSettings.storeId] }),
  products: many(products),
  categories: many(categories),
  customers: many(customers),
  sales: many(sales),
  cashClosings: many(cashClosings),
  suppliers: many(suppliers),
  purchases: many(purchases),
  notifications: many(notifications),
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, { fields: [products.storeId], references: [stores.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  saleItems: many(saleItems),
  purchaseItems: many(purchaseItems),
  priceHistory: many(priceHistory),
  stockMovements: many(stockMovements),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  store: one(stores, { fields: [sales.storeId], references: [stores.id] }),
  customer: one(customers, { fields: [sales.customerId], references: [customers.id] }),
  items: many(saleItems),
  fiadoRecord: one(fiadoRecords, { fields: [sales.id], references: [fiadoRecords.saleId] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  store: one(stores, { fields: [customers.storeId], references: [stores.id] }),
  sales: many(sales),
  fiadoRecords: many(fiadoRecords),
  fiadoPayments: many(fiadoPayments),
}));

export const fiadoRecordsRelations = relations(fiadoRecords, ({ one, many }) => ({
  customer: one(customers, { fields: [fiadoRecords.customerId], references: [customers.id] }),
  sale: one(sales, { fields: [fiadoRecords.saleId], references: [sales.id] }),
  payments: many(fiadoPayments),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  store: one(stores, { fields: [suppliers.storeId], references: [stores.id] }),
  products: many(products),
  purchases: many(purchases),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  store: one(stores, { fields: [purchases.storeId], references: [stores.id] }),
  supplier: one(suppliers, { fields: [purchases.supplierId], references: [suppliers.id] }),
  items: many(purchaseItems),
}));
