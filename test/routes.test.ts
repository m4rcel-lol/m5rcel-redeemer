import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/server/index.js";

let tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs) {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
  tempDirs = [];
});

describe("HTTP routes", () => {
  it("serves health checks", async () => {
    const app = await createTestServer();
    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    await app.close();
  });

  it("protects admin generation and redeems valid codes once", async () => {
    const app = await createTestServer();

    const unauthorized = await app.inject({
      method: "POST",
      url: "/api/admin/generate",
      payload: { amount: 1 }
    });
    expect(unauthorized.statusCode).toBe(401);

    const generated = await app.inject({
      method: "POST",
      url: "/api/admin/generate",
      headers: {
        authorization: "Bearer test-secret"
      },
      payload: { amount: 1, expiresInHours: 1, note: "route test" }
    });
    expect(generated.statusCode).toBe(200);

    const { codes } = generated.json<{ codes: string[] }>();
    expect(codes).toHaveLength(1);

    const redeemed = await app.inject({
      method: "POST",
      url: "/api/redeem",
      payload: { code: codes[0].toLowerCase() }
    });
    expect(redeemed.statusCode).toBe(200);
    expect(redeemed.json()).toEqual({
      ok: true,
      message: "Code redeemed successfully."
    });

    const repeated = await app.inject({
      method: "POST",
      url: "/api/redeem",
      payload: { code: codes[0] }
    });
    expect(repeated.statusCode).toBe(409);
    expect(repeated.json()).toMatchObject({
      ok: false,
      error: "ALREADY_REDEEMED"
    });

    await app.close();
  });

  it("returns API errors with the expected status codes", async () => {
    const app = await createTestServer();

    const malformed = await app.inject({
      method: "POST",
      url: "/api/redeem",
      payload: { code: "bad" }
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toMatchObject({ error: "MALFORMED_CODE" });

    const invalid = await app.inject({
      method: "POST",
      url: "/api/redeem",
      payload: { code: "M5R-AAAA-BBBB-CCCC" }
    });
    expect(invalid.statusCode).toBe(404);
    expect(invalid.json()).toMatchObject({ error: "INVALID_CODE" });

    await app.close();
  });
});

async function createTestServer() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "redeemer-routes-"));
  tempDirs.push(tempDir);

  return buildServer({
    adminSecret: "test-secret",
    dbPath: path.join(tempDir, "redeemer.sqlite"),
    logger: false,
    serveStatic: false
  });
}
