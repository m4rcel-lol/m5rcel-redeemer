import { describe, expect, it } from "vitest";
import { generateRedeemCode } from "../src/server/code.js";
import { REDEEM_CODE_PATTERN } from "../src/server/validation.js";

describe("generateRedeemCode", () => {
  it("generates readable M5R codes in the expected format", () => {
    const code = generateRedeemCode();

    expect(code).toMatch(REDEEM_CODE_PATTERN);
  });

  it("uses enough randomness to avoid collisions in a normal batch", () => {
    const codes = Array.from({ length: 1000 }, () => generateRedeemCode());

    expect(new Set(codes).size).toBe(codes.length);
  });
});
