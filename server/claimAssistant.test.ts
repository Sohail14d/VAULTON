import { describe, expect, it } from "vitest";
import { composeWarrantyClaim } from "../shared/claimText";

describe("warranty claim text", () => {
  it("includes relevant purchase references and the reported problem", () => {
    const claim = composeWarrantyClaim({
      productName: "Studio Headphones",
      brand: "Acme Audio",
      modelNumber: "SA-10",
      serialNumber: "SN-42",
      purchaseDate: "Jan 3, 2026",
      invoiceNumber: "INV-100",
      warrantyExpiryDate: "Jan 3, 2028",
      problem: "The left channel no longer produces sound.",
    });

    expect(claim).toContain("Subject: Warranty service request — Studio Headphones");
    expect(claim).toContain("model SA-10");
    expect(claim).toContain("serial number is SN-42");
    expect(claim).toContain("Invoice/order reference: INV-100");
    expect(claim).toContain("The left channel no longer produces sound.");
  });

  it("uses appropriate fallbacks for incomplete records", () => {
    const claim = composeWarrantyClaim({ productName: "Kettle", purchaseDate: "Jan 3, 2026", warrantyExpiryDate: "Jan 3, 2027" });

    expect(claim).toContain("Hello Support Team");
    expect(claim).toContain("Please describe the issue.");
  });
});
