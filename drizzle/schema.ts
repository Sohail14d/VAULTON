import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core identity table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const purchases = mysqlTable(
  "purchases",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    productName: varchar("productName", { length: 255 }).notNull(),
    productImageUrl: text("productImageUrl"),
    brand: varchar("brand", { length: 160 }),
    category: varchar("category", { length: 100 }),
    description: text("description"),
    purchaseDate: timestamp("purchaseDate").notNull(),
    priceCents: int("priceCents").notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    quantity: int("quantity").notNull().default(1),
    merchant: varchar("merchant", { length: 255 }),
    store: varchar("store", { length: 255 }),
    orderId: varchar("orderId", { length: 255 }),
    invoiceNumber: varchar("invoiceNumber", { length: 255 }),
    serialNumber: varchar("serialNumber", { length: 255 }),
    modelNumber: varchar("modelNumber", { length: 255 }),
    paymentMethod: varchar("paymentMethod", { length: 100 }),
    warrantyMonths: int("warrantyMonths"),
    warrantyStartDate: timestamp("warrantyStartDate"),
    warrantyExpiryDate: timestamp("warrantyExpiryDate"),
    returnPeriodDays: int("returnPeriodDays"),
    returnDeadline: timestamp("returnDeadline"),
    status: mysqlEnum("status", ["active", "archived", "returned", "claimed"]).notNull().default("active"),
    receiptUrl: text("receiptUrl"),
    receiptKey: text("receiptKey"),
    receiptFileName: varchar("receiptFileName", { length: 255 }),
    notes: text("notes"),
    tags: json("tags").$type<string[]>().notNull(),
    extractionConfidence: json("extractionConfidence").$type<Record<string, number> | null>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("purchases_user_status_idx").on(table.userId, table.status), index("purchases_deadline_idx").on(table.returnDeadline), index("purchases_warranty_idx").on(table.warrantyExpiryDate)],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    purchaseId: int("purchaseId"),
    type: mysqlEnum("type", ["return_deadline", "warranty_expiry", "missing_information", "duplicate"]).notNull(),
    severity: mysqlEnum("severity", ["critical", "urgent", "reminder", "safe"]).notNull().default("reminder"),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    isRead: int("isRead").notNull().default(0),
    eventAt: timestamp("eventAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("notifications_user_read_idx").on(table.userId, table.isRead), index("notifications_purchase_idx").on(table.purchaseId)],
);

export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  reminderDays: json("reminderDays").$type<number[]>().notNull(),
  notificationsEnabled: int("notificationsEnabled").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
