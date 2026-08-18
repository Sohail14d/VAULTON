import { describe, expect, it } from "vitest";
import { POST_LOGIN_REDIRECT } from "./oauth";

describe("OAuth success routing", () => {
  it("lands signed-in users in the protected GUARD workspace", () => {
    expect(POST_LOGIN_REDIRECT).toBe("/app");
  });
});
