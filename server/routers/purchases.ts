import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createPurchaseForUser,
  deletePurchaseForUser,
  generateNotificationsForUser,
  getPreferencesForUser,
  getPurchaseForUser,
  listNotificationsForUser,
  listPurchasesForUser,
  markNotificationReadForUser,
  updatePreferencesForUser,
  updatePurchaseForUser,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { separateDecisionTags } from "../guardRules";

const optionalText = z.string().trim().max(10000).nullable().optional();
const timestampInput = z.number().int().nonnegative().nullable().optional();
const purchaseInput = z.object({
  productName: z.string().trim().min(1).max(255),
  productImageUrl: optionalText,
  brand: z.string().trim().max(160).nullable().optional(),
  category: z.string().trim().max(100).nullable().optional(),
  description: optionalText,
  purchaseDate: z.number().int().nonnegative(),
  priceCents: z.number().int().min(0),
  currency: z.string().trim().toUpperCase().min(3).max(8).default("USD"),
  quantity: z.number().int().min(1).max(10000).default(1),
  merchant: z.string().trim().max(255).nullable().optional(),
  store: z.string().trim().max(255).nullable().optional(),
  orderId: z.string().trim().max(255).nullable().optional(),
  invoiceNumber: z.string().trim().max(255).nullable().optional(),
  serialNumber: z.string().trim().max(255).nullable().optional(),
  modelNumber: z.string().trim().max(255).nullable().optional(),
  paymentMethod: z.string().trim().max(100).nullable().optional(),
  warrantyMonths: z.number().int().min(0).max(240).nullable().optional(),
  warrantyStartDate: timestampInput,
  warrantyExpiryDate: timestampInput,
  returnPeriodDays: z.number().int().min(0).max(730).nullable().optional(),
  returnDeadline: timestampInput,
  status: z.enum(["active", "archived", "returned", "claimed"]).default("active"),
  receiptUrl: optionalText,
  receiptKey: optionalText,
  receiptFileName: z.string().trim().max(255).nullable().optional(),
  notes: optionalText,
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  extractionConfidence: z.record(z.string(), z.number().min(0).max(100)).nullable().optional(),
});

type PurchaseLike = {
  id: number;
  productName: string;
  brand: string | null;
  category: string | null;
  merchant: string | null;
  priceCents: number;
  purchaseDate: Date;
  warrantyExpiryDate: Date | null;
  returnDeadline: Date | null;
  status: "active" | "archived" | "returned" | "claimed";
  serialNumber: string | null;
  invoiceNumber: string | null;
  receiptUrl: string | null;
  warrantyMonths: number | null;
  returnPeriodDays: number | null;
};

const MS_PER_DAY = 86_400_000;
const daysUntil = (date: Date, now = new Date()) => Math.ceil((date.getTime() - now.getTime()) / MS_PER_DAY);

function needsConfirmation(purchase: PurchaseLike) {
  return !purchase.serialNumber || !purchase.invoiceNumber || !purchase.receiptUrl || (!purchase.warrantyMonths && !purchase.returnPeriodDays);
}

function buildAttention(purchases: PurchaseLike[]) {
  const now = new Date();
  return purchases
    .filter(purchase => purchase.status === "active")
    .flatMap(purchase => {
      const items: Array<{ purchaseId: number; productName: string; kind: "return" | "warranty" | "missing"; severity: "critical" | "urgent" | "reminder" | "safe"; daysRemaining: number | null; title: string; action: string }> = [];
      if (purchase.returnDeadline) {
        const remaining = daysUntil(purchase.returnDeadline, now);
        if (remaining >= 0 && remaining <= 3) {
          items.push({ purchaseId: purchase.id, productName: purchase.productName, kind: "return", severity: remaining <= 1 ? "critical" : "urgent", daysRemaining: remaining, title: remaining === 0 ? "Return deadline is today" : `Return window closes in ${remaining} day${remaining === 1 ? "" : "s"}`, action: "Review return" });
        }
      }
      if (purchase.warrantyExpiryDate) {
        const remaining = daysUntil(purchase.warrantyExpiryDate, now);
        if (remaining >= 0 && remaining <= 30) {
          items.push({ purchaseId: purchase.id, productName: purchase.productName, kind: "warranty", severity: remaining <= 7 ? "urgent" : "reminder", daysRemaining: remaining, title: `Warranty expires in ${remaining} day${remaining === 1 ? "" : "s"}`, action: "Review warranty" });
        }
      }
      if (needsConfirmation(purchase)) {
        items.push({ purchaseId: purchase.id, productName: purchase.productName, kind: "missing", severity: "reminder", daysRemaining: null, title: "Purchase information needs confirmation", action: "Complete record" });
      }
      if (items.length === 0) {
        items.push({ purchaseId: purchase.id, productName: purchase.productName, kind: "warranty", severity: "safe", daysRemaining: null, title: "No action required right now", action: "Open purchase" });
      }
      return items;
    })
    .sort((a, b) => ({ critical: 0, urgent: 1, reminder: 2, safe: 3 }[a.severity] - { critical: 0, urgent: 1, reminder: 2, safe: 3 }[b.severity]));
}

function toStoredValues(input: z.infer<typeof purchaseInput>) {
  return {
    ...input,
    purchaseDate: new Date(input.purchaseDate),
    warrantyStartDate: input.warrantyStartDate ? new Date(input.warrantyStartDate) : null,
    warrantyExpiryDate: input.warrantyExpiryDate ? new Date(input.warrantyExpiryDate) : null,
    returnDeadline: input.returnDeadline ? new Date(input.returnDeadline) : null,
  };
}

export const purchasesRouter = router({
  list: protectedProcedure
    .input(z.object({ query: z.string().trim().max(200).optional(), filter: z.enum(["all", "active_warranty", "warranty_soon", "warranty_expired", "returnable", "return_expired", "missing_info", "archived"]).default("all") }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const query = input.query?.toLowerCase();
      return (await listPurchasesForUser(ctx.user.id)).filter(purchase => {
        const matchesQuery = !query || [purchase.productName, purchase.brand, purchase.merchant, purchase.category, purchase.serialNumber, purchase.orderId].filter(Boolean).some(value => value!.toLowerCase().includes(query));
        if (!matchesQuery) return false;
        const active = purchase.status === "active";
        switch (input.filter) {
          case "active_warranty": return active && !!purchase.warrantyExpiryDate && purchase.warrantyExpiryDate >= now;
          case "warranty_soon": return active && !!purchase.warrantyExpiryDate && daysUntil(purchase.warrantyExpiryDate, now) >= 0 && daysUntil(purchase.warrantyExpiryDate, now) <= 30;
          case "warranty_expired": return !!purchase.warrantyExpiryDate && purchase.warrantyExpiryDate < now;
          case "returnable": return active && !!purchase.returnDeadline && purchase.returnDeadline >= now;
          case "return_expired": return !!purchase.returnDeadline && purchase.returnDeadline < now;
          case "missing_info": return needsConfirmation(purchase as PurchaseLike);
          case "archived": return purchase.status === "archived";
          default: return purchase.status !== "archived";
        }
      });
    }),
  get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const purchase = await getPurchaseForUser(ctx.user.id, input.id);
    if (!purchase) throw new TRPCError({ code: "NOT_FOUND", message: "Purchase not found." });
    return purchase;
  }),
  create: protectedProcedure.input(purchaseInput).mutation(({ ctx, input }) => createPurchaseForUser(ctx.user.id, toStoredValues(input))),
  update: protectedProcedure.input(z.object({ id: z.number().int().positive(), purchase: purchaseInput })).mutation(async ({ ctx, input }) => {
    const saved = await updatePurchaseForUser(ctx.user.id, input.id, toStoredValues(input.purchase));
    if (!saved) throw new TRPCError({ code: "NOT_FOUND", message: "Purchase not found." });
    return saved;
  }),
  archive: protectedProcedure.input(z.object({ id: z.number().int().positive(), archived: z.boolean() })).mutation(async ({ ctx, input }) => {
    const saved = await updatePurchaseForUser(ctx.user.id, input.id, { status: input.archived ? "archived" : "active" });
    if (!saved) throw new TRPCError({ code: "NOT_FOUND", message: "Purchase not found." });
    return saved;
  }),
  remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const purchase = await getPurchaseForUser(ctx.user.id, input.id);
    if (!purchase) throw new TRPCError({ code: "NOT_FOUND", message: "Purchase not found." });
    await deletePurchaseForUser(ctx.user.id, input.id);
    return { success: true };
  }),
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const rows = await listPurchasesForUser(ctx.user.id);
    const now = new Date();
    const activeRows = rows.filter(row => row.status === "active");
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalSpendingCents = activeRows.reduce((sum, row) => sum + row.priceCents * row.quantity, 0);
    const monthSpendingCents = activeRows.filter(row => row.purchaseDate >= monthStart).reduce((sum, row) => sum + row.priceCents * row.quantity, 0);
    const activeWarranties = activeRows.filter(row => row.warrantyExpiryDate && row.warrantyExpiryDate >= now).length;
    const deadlines = activeRows.filter(row => (row.returnDeadline && daysUntil(row.returnDeadline, now) >= 0 && daysUntil(row.returnDeadline, now) <= 14) || (row.warrantyExpiryDate && daysUntil(row.warrantyExpiryDate, now) >= 0 && daysUntil(row.warrantyExpiryDate, now) <= 30)).length;
    return { totalPurchases: activeRows.length, totalSpendingCents, monthSpendingCents, activeWarranties, deadlines, attention: buildAttention(activeRows as PurchaseLike[]).slice(0, 6) };
  }),
  duplicates: protectedProcedure.query(async ({ ctx }) => {
    const rows = (await listPurchasesForUser(ctx.user.id)).filter(row => row.status !== "archived");
    const matches: Array<{ first: typeof rows[number]; second: typeof rows[number]; reason: string }> = [];
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        const first = rows[i];
        const second = rows[j];
        const sameName = first.productName.trim().toLowerCase() === second.productName.trim().toLowerCase();
        const isReviewedSeparate = (first.tags ?? []).includes(`guard:separate:${second.id}`) || (second.tags ?? []).includes(`guard:separate:${first.id}`);
        const sameMerchant = !!first.merchant && first.merchant.toLowerCase() === second.merchant?.toLowerCase();
        const similarPrice = Math.abs(first.priceCents - second.priceCents) <= 100;
        const dateDistance = Math.abs(first.purchaseDate.getTime() - second.purchaseDate.getTime()) / MS_PER_DAY;
        if (!isReviewedSeparate && sameName && (sameMerchant || similarPrice) && dateDistance <= 14) matches.push({ first, second, reason: "Same product within 14 days with matching merchant or amount." });
      }
    }
    return matches;
  }),
  mergeDuplicate: protectedProcedure.input(z.object({ keepId: z.number().int().positive(), removeId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (input.keepId === input.removeId) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose two different records." });
    const [keep, remove] = await Promise.all([getPurchaseForUser(ctx.user.id, input.keepId), getPurchaseForUser(ctx.user.id, input.removeId)]);
    if (!keep || !remove) throw new TRPCError({ code: "NOT_FOUND", message: "One of the purchase records was not found." });
    const mergedTags = Array.from(new Set([...(keep.tags ?? []), ...(remove.tags ?? [])]));
    const mergedNotes = [keep.notes, remove.notes].filter(Boolean).join("\n\n");
    await updatePurchaseForUser(ctx.user.id, keep.id, { tags: mergedTags, notes: mergedNotes || null, receiptUrl: keep.receiptUrl ?? remove.receiptUrl, receiptKey: keep.receiptKey ?? remove.receiptKey, receiptFileName: keep.receiptFileName ?? remove.receiptFileName, serialNumber: keep.serialNumber ?? remove.serialNumber, invoiceNumber: keep.invoiceNumber ?? remove.invoiceNumber });
    await deletePurchaseForUser(ctx.user.id, remove.id);
    return { success: true, keptId: keep.id };
  }),
  keepSeparate: protectedProcedure.input(z.object({ firstId: z.number().int().positive(), secondId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (input.firstId === input.secondId) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose two different records." });
    const [first, second] = await Promise.all([getPurchaseForUser(ctx.user.id, input.firstId), getPurchaseForUser(ctx.user.id, input.secondId)]);
    if (!first || !second) throw new TRPCError({ code: "NOT_FOUND", message: "One of the purchase records was not found." });
    const { first: firstDecision, second: secondDecision } = separateDecisionTags(first.id, second.id);
    await Promise.all([
      updatePurchaseForUser(ctx.user.id, first.id, { tags: Array.from(new Set([...(first.tags ?? []), firstDecision])) }),
      updatePurchaseForUser(ctx.user.id, second.id, { tags: Array.from(new Set([...(second.tags ?? []), secondDecision])) }),
    ]);
    return { success: true };
  }),
  spending: protectedProcedure.query(async ({ ctx }) => {
    const rows = (await listPurchasesForUser(ctx.user.id)).filter(row => row.status !== "archived");
    const byCategory = new Map<string, number>();
    const byMerchant = new Map<string, number>();
    const byMonth = new Map<string, number>();
    for (const row of rows) {
      const amount = row.priceCents * row.quantity;
      const month = row.purchaseDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      byCategory.set(row.category || "Uncategorized", (byCategory.get(row.category || "Uncategorized") ?? 0) + amount);
      byMerchant.set(row.merchant || "Unknown merchant", (byMerchant.get(row.merchant || "Unknown merchant") ?? 0) + amount);
      byMonth.set(month, (byMonth.get(month) ?? 0) + amount);
    }
    const total = rows.reduce((sum, row) => sum + row.priceCents * row.quantity, 0);
    return { totalCents: total, averageCents: rows.length ? Math.round(total / rows.length) : 0, purchaseCount: rows.length, byCategory: Array.from(byCategory.entries()).map(([name, value]) => ({ name, value })), byMerchant: Array.from(byMerchant.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value })), byMonth: Array.from(byMonth.entries()).map(([name, value]) => ({ name, value })), topPurchases: [...rows].sort((a, b) => b.priceCents * b.quantity - a.priceCents * a.quantity).slice(0, 5) };
  }),
});

export const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    await generateNotificationsForUser(ctx.user.id);
    return listNotificationsForUser(ctx.user.id);
  }),
  markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await markNotificationReadForUser(ctx.user.id, input.id);
    return { success: true };
  }),
  preferences: protectedProcedure.query(async ({ ctx }) => (await getPreferencesForUser(ctx.user.id)) ?? { reminderDays: [30, 14, 7, 3, 1], notificationsEnabled: 1 }),
  updatePreferences: protectedProcedure.input(z.object({ reminderDays: z.array(z.number().int()).refine(days => days.every(day => [30, 14, 7, 3, 1].includes(day)), "Use supported reminder days."), notificationsEnabled: z.boolean() })).mutation(({ ctx, input }) => updatePreferencesForUser(ctx.user.id, { reminderDays: input.reminderDays, notificationsEnabled: input.notificationsEnabled ? 1 : 0 })),
});
