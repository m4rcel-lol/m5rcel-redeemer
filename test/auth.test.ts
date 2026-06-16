import { describe, expect, it } from "vitest";
import { isAuthorizedAdmin } from "../src/server/auth.js";

describe("isAuthorizedAdmin", () => {
  it("accepts an exact bearer token match", () => {
    expect(isAuthorizedAdmin("Bearer secret-value", "secret-value")).toBe(true);
  });

  it("rejects missing, malformed, or incorrect authorization", () => {
    expect(isAuthorizedAdmin(undefined, "secret-value")).toBe(false);
    expect(isAuthorizedAdmin("Basic secret-value", "secret-value")).toBe(false);
    expect(isAuthorizedAdmin("Bearer wrong", "secret-value")).toBe(false);
    expect(isAuthorizedAdmin("Bearer secret-value", undefined)).toBe(false);
  });
});
