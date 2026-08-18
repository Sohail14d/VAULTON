import { describe, expect, it } from "vitest";
import { isSupportedGuardTask } from "./guardAiScope";

describe("GUARD AI task scope", () => {
  const purchases = [{ product: "Noise-cancelling headphones", brand: "AudioLab" }];

  it("allows supported purchase-management questions", () => {
    expect(isSupportedGuardTask("Can I still return my headphones?", purchases)).toBe(true);
    expect(isSupportedGuardTask("What did I spend at this merchant?", purchases)).toBe(true);
  });

  it("rejects unrelated requests", () => {
    expect(isSupportedGuardTask("Write a marketing plan for my startup", purchases)).toBe(false);
  });
});
