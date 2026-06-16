import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type DatabaseConnection = Database.Database;

export function openDatabase(dbPath: string): DatabaseConnection {
  if (dbPath.trim().length === 0) {
    throw new Error("DB_PATH must not be empty.");
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  initializeDatabase(db);

  return db;
}

export function initializeDatabase(db: DatabaseConnection): void {
  const columns = readRedeemCodeColumns(db);

  if (columns.length === 0) {
    createRedeemCodesTable(db);
    createRedeemCodeIndexes(db);
    return;
  }

  if (hasRequestedSchema(columns)) {
    createRedeemCodeIndexes(db);
    return;
  }

  if (hasLegacyCamelCaseSchema(columns)) {
    migrateLegacyRedeemCodesTable(db);
    createRedeemCodeIndexes(db);
    return;
  }

  throw new Error(
    "Existing redeem_codes table has an unsupported schema. Back up the database before changing it manually."
  );
}

function createRedeemCodesTable(db: DatabaseConnection): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS redeem_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      redeemed INTEGER NOT NULL DEFAULT 0,
      redeemed_at TEXT,
      redeemed_ip TEXT,
      note TEXT
    );
  `);
}

function createRedeemCodeIndexes(db: DatabaseConnection): void {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_redeem_codes_code
      ON redeem_codes (code);

    CREATE INDEX IF NOT EXISTS idx_redeem_codes_redeemed
      ON redeem_codes (redeemed);
  `);
}

function migrateLegacyRedeemCodesTable(db: DatabaseConnection): void {
  const migrate = db.transaction(() => {
    db.exec(`
      DROP TABLE IF EXISTS redeem_codes_migration;

      CREATE TABLE redeem_codes_migration (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        redeemed INTEGER NOT NULL DEFAULT 0,
        redeemed_at TEXT,
        redeemed_ip TEXT,
        note TEXT
      );

      INSERT INTO redeem_codes_migration (
        id,
        code,
        created_at,
        expires_at,
        redeemed,
        redeemed_at,
        redeemed_ip,
        note
      )
      SELECT
        id,
        code,
        createdAt,
        expiresAt,
        redeemed,
        redeemedAt,
        redeemedIp,
        note
      FROM redeem_codes;

      DROP TABLE redeem_codes;
      ALTER TABLE redeem_codes_migration RENAME TO redeem_codes;
    `);
  });

  migrate();
}

function readRedeemCodeColumns(db: DatabaseConnection): string[] {
  const rows = db.prepare("PRAGMA table_info(redeem_codes)").all() as Array<{
    name: string;
  }>;

  return rows.map((row) => row.name);
}

function hasRequestedSchema(columns: string[]): boolean {
  return [
    "id",
    "code",
    "created_at",
    "expires_at",
    "redeemed",
    "redeemed_at",
    "redeemed_ip",
    "note"
  ].every((column) => columns.includes(column));
}

function hasLegacyCamelCaseSchema(columns: string[]): boolean {
  return [
    "id",
    "code",
    "createdAt",
    "expiresAt",
    "redeemed",
    "redeemedAt",
    "redeemedIp",
    "note"
  ].every((column) => columns.includes(column));
}
