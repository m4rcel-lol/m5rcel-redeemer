import { describe, expect, it } from "vitest";
import {
  normalizeRedeemCode,
  parseAdminGenerateBody,
  parseRedeemBody
} from "../src/server/validation.js";

describe("redeem validation", () => {
  it("normalizes whitespace and casing server-side", () => {
    expect(normalizeRedeemCode("  m5r-8f3k - q2lx - z9pa  ")).toBe(
      "M5R-8F3K-Q2LX-Z9PA"
    );
  });

  it("accepts normalized valid codes", () => {
    expect(parseRedeemBody({ code: " m5r-8f3k-q2lx-z9pa " })).toEqual({
      ok: true,
      value: { code: "M5R-8F3K-Q2LX-Z9PA" }
    });
  });

  it("rejects malformed codes", () => {
    expect(parseRedeemBody({ code: "M5R-TOO-SHORT" }).ok).toBe(false);
  });
});

describe("admin generation validation", () => {
  it("defaults amount to one", () => {
    expect(parseAdminGenerateBody({})).toEqual({
      ok: true,
      value: { amount: 1 }
    });
  });

  it("rejects unsafe amount values", () => {
    expect(parseAdminGenerateBody({ amount: 101 }).ok).toBe(false);
    expect(parseAdminGenerateBody({ amount: 0 }).ok).toBe(false);
    expect(parseAdminGenerateBody({ amount: 1.5 }).ok).toBe(false);
  });

  it("rejects non-object request bodies", () => {
    expect(parseAdminGenerateBody(null).ok).toBe(false);
    expect(parseAdminGenerateBody([]).ok).toBe(false);
  });

  it("trims optional notes", () => {
    expect(parseAdminGenerateBody({ amount: 2, note: " test drop " })).toEqual({
      ok: true,
      value: { amount: 2, note: "test drop" }
    });
  });
});
