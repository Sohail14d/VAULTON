export function validatePurchaseEdit(productName: string, price: string): string | null {
  if (!productName.trim()) return "A product name is required.";
  const amount = Number(price);
  if (!price.trim() || !Number.isFinite(amount) || amount < 0) return "Enter a valid purchase price.";
  return null;
}
