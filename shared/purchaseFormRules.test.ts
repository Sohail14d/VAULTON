import { describe, expect, it } from "vitest";
import { validatePurchaseEdit } from "./purchaseFormRules";

describe("validatePurchaseEdit", () => {
  it("requires an identifiable product name", () => {
    expect(validatePurchaseEdit("   ", "29.99")).toBe("A product name is required.");
  });

  it("rejects missing, non-numeric, and negative prices", () => {
    expect(validatePurchaseEdit("Headphones", "")).toBe("Enter a valid purchase price.");
    expect(validatePurchaseEdit("Headphones", "free")).toBe("Enter a valid purchase price.");
    expect(validatePurchaseEdit("Headphones", "-1")).toBe("Enter a valid purchase price.");
  });

  it("accepts a normal purchasable record", () => {
    expect(validatePurchaseEdit("Headphones", "29.99")).toBeNull();
  });
});
