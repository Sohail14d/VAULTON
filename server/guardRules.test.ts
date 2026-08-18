import { describe, expect, it } from "vitest";
import { alertSeverity, separateDecisionTags, shouldCreateDeadlineAlert } from "./guardRules";

describe("GUARD notification rules", () => {
  it("uses only configured reminder days while preserving final-day alerts", () => {
    expect(shouldCreateDeadlineAlert(14, [30, 14, 7, 3, 1])).toBe(true);
    expect(shouldCreateDeadlineAlert(10, [30, 14, 7, 3, 1])).toBe(false);
    expect(shouldCreateDeadlineAlert(0, [])).toBe(true);
    expect(shouldCreateDeadlineAlert(-1, [1])).toBe(false);
  });

  it("maps deadline urgency consistently", () => {
    expect(alertSeverity(0)).toBe("critical");
    expect(alertSeverity(3)).toBe("urgent");
    expect(alertSeverity(14)).toBe("reminder");
  });
});

describe("GUARD duplicate decisions", () => {
  it("creates reciprocal Keep Separate tags", () => {
    expect(separateDecisionTags(14, 27)).toEqual({ first: "guard:separate:27", second: "guard:separate:14" });
  });

  it("rejects a self-comparison", () => {
    expect(() => separateDecisionTags(5, 5)).toThrow("two different purchases");
  });
});
