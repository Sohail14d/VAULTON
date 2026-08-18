import { describe, expect, it } from "vitest";
import { isOwnedReceiptKey } from "./ai";

describe("GUARD receipt data isolation", () => {
  it("accepts only receipt keys owned by the signed-in user", () => {
    expect(isOwnedReceiptKey(42, "users/42/receipts/invoice_ab12cd34.pdf")).toBe(true);
    expect(isOwnedReceiptKey(42, "users/41/receipts/invoice_ab12cd34.pdf")).toBe(false);
    expect(isOwnedReceiptKey(42, "generated/receipt.pdf")).toBe(false);
  });
});
