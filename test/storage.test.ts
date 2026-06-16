import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, type DatabaseConnection } from "../src/server/db.js";
import { CodeStorage } from "../src/server/storage.js";

let tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs) {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
  tempDirs = [];
});

describe("CodeStorage", () => {
  it("initializes the requested persistent SQLite schema", () => {
    const { db } = createStorage();
    const columns = db
      .prepare("PRAGMA table_info(redeem_codes)")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(columns).toEqual([
      "id",
      "code",
      "created_at",
      "expires_at",
      "redeemed",
      "redeemed_at",
      "redeemed_ip",
      "note"
    ]);
    expect(columns).not.toContain("createdAt");
    expect(columns).not.toContain("redeemedAt");
  });

  it("creates and redeems a single-use code", () => {
    const { storage } = createStorage();
    const [code] = storage.createCodes({ amount: 1 });

    expect(storage.redeemCode(code, "127.0.0.1")).toEqual({ ok: true });
    expect(storage.redeemCode(code, "127.0.0.1")).toEqual({
      ok: false,
      error: "ALREADY_REDEEMED",
      message: "This code has already been redeemed."
    });
  });

  it("rejects expired codes without redeeming them", () => {
    const { storage } = createStorage();
    const [code] = storage.createCodes({
      amount: 1,
      expiresAt: new Date(Date.now() - 60_000)
    });

    expect(storage.redeemCode(code, "127.0.0.1")).toEqual({
      ok: false,
      error: "EXPIRED_CODE",
      message: "This code has expired."
    });
  });

  it("returns invalid for missing codes", () => {
    const { storage } = createStorage();

    expect(storage.redeemCode("M5R-AAAA-BBBB-CCCC", "127.0.0.1")).toEqual({
      ok: false,
      error: "INVALID_CODE",
      message: "This code does not exist."
    });
  });

  it("persists generated and redeemed state after reopening SQLite", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "redeemer-persist-"));
    tempDirs.push(tempDir);
    const dbPath = path.join(tempDir, "redeemer.sqlite");

    const firstDb = openDatabase(dbPath);
    const firstStorage = new CodeStorage(firstDb);
    const [code] = firstStorage.createCodes({ amount: 1 });
    firstDb.close();

    const secondDb = openDatabase(dbPath);
    const secondStorage = new CodeStorage(secondDb);
    expect(secondStorage.redeemCode(code, "127.0.0.1")).toEqual({ ok: true });
    secondDb.close();

    const thirdDb = openDatabase(dbPath);
    const thirdStorage = new CodeStorage(thirdDb);
    expect(thirdStorage.redeemCode(code, "127.0.0.1")).toEqual({
      ok: false,
      error: "ALREADY_REDEEMED",
      message: "This code has already been redeemed."
    });
    thirdDb.close();
  });
});

function createStorage(): { db: DatabaseConnection; storage: CodeStorage } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "redeemer-test-"));
  tempDirs.push(tempDir);
  const db = openDatabase(path.join(tempDir, "redeemer.sqlite"));

  return {
    db,
    storage: new CodeStorage(db)
  };
}
