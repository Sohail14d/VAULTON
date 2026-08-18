import { describe, expect, it } from "vitest";
import { validatePurchaseEdit } from "../shared/purchaseFormRules";

describe("purchase editor validation", () => {
  it("requires a product name", () => {
    expect(validatePurchaseEdit("   ", "29.99")).toBe("A product name is required.");
  });

  it("rejects missing, non-numeric, and negative prices", () => {
    expect(validatePurchaseEdit("Headphones", "")).toBe("Enter a valid purchase price.");
    expect(validatePurchaseEdit("Headphones", "free")).toBe("Enter a valid purchase price.");
    expect(validatePurchaseEdit("Headphones", "-1")).toBe("Enter a valid purchase price.");
  });

  it("allows a valid purchase record", () => {
    expect(validatePurchaseEdit("Headphones", "29.99")).toBeNull();
  });
});
