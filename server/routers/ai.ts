import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { storageGetSignedUrl } from "../storage";
import { listPurchasesForUser } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

const nullableString = { type: ["string", "null"] } as const;
const nullableNumber = { type: ["number", "null"] } as const;
const receiptSchema = z.object({
  merchant: z.string().nullable(), productName: z.string().nullable(), brand: z.string().nullable(), category: z.string().nullable(), modelNumber: z.string().nullable(), serialNumber: z.string().nullable(), purchaseDate: z.string().nullable(), priceCents: z.number().int().nonnegative().nullable(), currency: z.string().nullable(), quantity: z.number().int().positive().nullable(), invoiceNumber: z.string().nullable(), orderId: z.string().nullable(), warrantyMonths: z.number().int().nonnegative().nullable(), returnPeriodDays: z.number().int().nonnegative().nullable(), paymentMethod: z.string().nullable(), confidence: z.record(z.string(), z.number().min(0).max(100)),
});

const receiptJsonSchema = {
  name: "receipt_extraction", strict: true, schema: {
    type: "object", additionalProperties: false,
    properties: {
      merchant: nullableString, productName: nullableString, brand: nullableString, category: nullableString, modelNumber: nullableString, serialNumber: nullableString, purchaseDate: nullableString, priceCents: nullableNumber, currency: nullableString, quantity: nullableNumber, invoiceNumber: nullableString, orderId: nullableString, warrantyMonths: nullableNumber, returnPeriodDays: nullableNumber, paymentMethod: nullableString,
      confidence: { type: "object", additionalProperties: { type: "number", minimum: 0, maximum: 100 }, required: [] },
    },
    required: ["merchant", "productName", "brand", "category", "modelNumber", "serialNumber", "purchaseDate", "priceCents", "currency", "quantity", "invoiceNumber", "orderId", "warrantyMonths", "returnPeriodDays", "paymentMethod", "confidence"],
  },
};

function content(response: Awaited<ReturnType<typeof invokeLLM>>) {
  const value = response.choices[0]?.message?.content;
  if (typeof value !== "string") throw new Error("GUARD AI returned an empty response.");
  return value;
}

function purchaseContext(rows: Awaited<ReturnType<typeof listPurchasesForUser>>) {
  return rows.slice(0, 100).map(row => ({ product: row.productName, brand: row.brand, merchant: row.merchant, category: row.category, price: `${row.currency} ${(row.priceCents * row.quantity / 100).toFixed(2)}`, purchased: row.purchaseDate.toISOString().slice(0, 10), warrantyExpiry: row.warrantyExpiryDate?.toISOString().slice(0, 10) ?? null, returnDeadline: row.returnDeadline?.toISOString().slice(0, 10) ?? null, serial: row.serialNumber ?? null, invoice: row.invoiceNumber ?? null, status: row.status })).filter(row => row.status !== "archived");
}

export function isOwnedReceiptKey(userId: number, fileKey: string) {
  return fileKey.startsWith(`users/${userId}/receipts/`);
}

export const aiRouter = router({
  chat: protectedProcedure.input(z.object({ message: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => {
    const purchases = purchaseContext(await listPurchasesForUser(ctx.user.id));
    if (purchases.length === 0) return { answer: "You do not have any saved purchases yet. Add a purchase or upload a receipt, then I can help you check return windows, warranty coverage, and spending." };
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are GUARD AI, a careful personal purchase-management assistant. Answer only from the purchase records supplied below. Never invent a product, date, warranty rule, return policy, or receipt detail. If the record is incomplete or a determination requires a seller/manufacturer policy, clearly say it needs verification. You may summarize personal spending but must not give investment, legal, insurance, or unrelated financial advice. Use concise Markdown.\n\nPURCHASE RECORDS:\n" + JSON.stringify(purchases) },
        { role: "user", content: input.message },
      ],
    });
    return { answer: content(response) };
  }),
  extractReceipt: protectedProcedure.input(z.object({ fileKey: z.string().min(1).max(1000), mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]) })).mutation(async ({ ctx, input }) => {
    if (!isOwnedReceiptKey(ctx.user.id, input.fileKey)) throw new TRPCError({ code: "FORBIDDEN", message: "Receipt access is limited to your workspace." });
    const signedUrl = await storageGetSignedUrl(input.fileKey);
    const documentContent: { type: "file_url"; file_url: { url: string; mime_type: "application/pdf" } } | { type: "image_url"; image_url: { url: string; detail: "high" } } = input.mimeType === "application/pdf" ? { type: "file_url", file_url: { url: signedUrl, mime_type: "application/pdf" } } : { type: "image_url", image_url: { url: signedUrl, detail: "high" } };
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You extract purchase details from one receipt, bill, or invoice. Use only visible/documented information. Do not guess missing values: return null and omit the field from confidence if not found. Interpret monetary totals as the final purchase total in smallest currency units (for example $12.34 becomes 1234; INR 79990 becomes 7999000). Use ISO date YYYY-MM-DD when a date is explicit. Warranty and return periods must be explicitly written; never infer store policy. Confidence is an integer 0-100 only for values you found." },
        { role: "user", content: [{ type: "text", text: "Extract this purchase document into the requested schema." }, documentContent] },
      ],
      response_format: { type: "json_schema", json_schema: receiptJsonSchema },
    });
    return receiptSchema.parse(JSON.parse(content(response)));
  }),
});
