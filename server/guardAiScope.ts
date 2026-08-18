export type GuardPurchaseContext = {
  product: string;
  brand: string | null;
};

const allowedTerms = ["purchase", "purchased", "buy", "bought", "product", "item", "receipt", "invoice", "bill", "order", "merchant", "return", "refund", "warranty", "coverage", "claim", "repair", "deadline", "spending", "spent", "cost", "price", "budget"];

export function isSupportedGuardTask(message: string, purchases: GuardPurchaseContext[]) {
  const normalized = message.toLowerCase();
  if (allowedTerms.some(term => normalized.includes(term))) return true;
  return purchases.some(purchase => [purchase.product, purchase.brand ?? ""].filter(Boolean).some(value => normalized.includes(value.toLowerCase())));
}

export const guardAiScopeMessage = "GUARD AI is limited to your saved purchases, receipts, returns, warranties, claims, reminders, and spending. Ask a purchase-management question about your workspace.";
