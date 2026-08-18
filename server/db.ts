import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertPurchase,
  InsertUser,
  notifications,
  purchases,
  userPreferences,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { alertSeverity, shouldCreateDeadlineAlert } from "./guardRules";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function listPurchasesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchases).where(eq(purchases.userId, userId)).orderBy(desc(purchases.purchaseDate));
}

export async function getPurchaseForUser(userId: number, purchaseId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(purchases).where(and(eq(purchases.id, purchaseId), eq(purchases.userId, userId))).limit(1))[0];
}

export async function createPurchaseForUser(userId: number, values: Omit<InsertPurchase, "userId">) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.insert(purchases).values({ ...values, userId });
  return getPurchaseForUser(userId, Number(result[0].insertId));
}

export async function updatePurchaseForUser(userId: number, purchaseId: number, values: Partial<Omit<InsertPurchase, "id" | "userId" | "createdAt" | "updatedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(purchases).set(values).where(and(eq(purchases.id, purchaseId), eq(purchases.userId, userId)));
  return getPurchaseForUser(userId, purchaseId);
}

export async function deletePurchaseForUser(userId: number, purchaseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.delete(notifications).where(and(eq(notifications.userId, userId), eq(notifications.purchaseId, purchaseId)));
  await db.delete(purchases).where(and(eq(purchases.id, purchaseId), eq(purchases.userId, userId)));
}

export async function listNotificationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}

export async function generateNotificationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const preferences = await getPreferencesForUser(userId);
  if (preferences && !preferences.notificationsEnabled) return [];
  const reminderDays = preferences?.reminderDays ?? [30, 14, 7, 3, 1];
  const rows = (await listPurchasesForUser(userId)).filter(row => row.status === "active");
  const existing = await listNotificationsForUser(userId);
  const hasAlert = (type: "return_deadline" | "warranty_expiry" | "missing_information", purchaseId: number, eventAt: Date | null) => existing.some(alert => alert.type === type && alert.purchaseId === purchaseId && (eventAt ? alert.eventAt?.getTime() === eventAt.getTime() : alert.eventAt === null));
  const now = Date.now();
  const created: Array<{ type: "return_deadline" | "warranty_expiry" | "missing_information"; purchaseId: number; severity: "critical" | "urgent" | "reminder"; title: string; body: string; eventAt: Date | null }> = [];
  for (const row of rows) {
    const missing = [!row.merchant && "merchant", !row.invoiceNumber && "invoice/order number", !row.serialNumber && "serial number"].filter(Boolean) as string[];
    if (missing.length && !hasAlert("missing_information", row.id, null)) created.push({ type: "missing_information", purchaseId: row.id, severity: "reminder", title: `${row.productName} needs a few details`, body: `Add ${missing.join(", ")} to make future return or warranty claims easier.`, eventAt: null });
    for (const event of [{ type: "return_deadline" as const, eventAt: row.returnDeadline, label: "return window" }, { type: "warranty_expiry" as const, eventAt: row.warrantyExpiryDate, label: "warranty" }]) {
      if (!event.eventAt || hasAlert(event.type, row.id, event.eventAt)) continue;
      const days = Math.ceil((event.eventAt.getTime() - now) / 86_400_000);
      if (!shouldCreateDeadlineAlert(days, reminderDays)) continue;
      const severity = alertSeverity(days);
      created.push({ type: event.type, purchaseId: row.id, severity, title: `${row.productName} ${event.label} ${days === 0 ? "ends today" : `ends in ${days} day${days === 1 ? "" : "s"}`}`, body: `Review the saved details and any proof of purchase before this ${event.label} closes.`, eventAt: event.eventAt });
    }
  }
  if (created.length) await db.insert(notifications).values(created.map(alert => ({ userId, ...alert })));
  return created;
}

export async function markNotificationReadForUser(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(notifications).set({ isRead: 1 }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function getPreferencesForUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1))[0];
}

export async function updatePreferencesForUser(userId: number, values: { reminderDays: number[]; notificationsEnabled: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(userPreferences).values({ userId, ...values }).onDuplicateKeyUpdate({ set: values });
  return getPreferencesForUser(userId);
}
