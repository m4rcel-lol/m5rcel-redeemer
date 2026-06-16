import { generateRedeemCode } from "./code.js";
import type { DatabaseConnection } from "./db.js";

export type RedeemFailureCode =
  | "INVALID_CODE"
  | "ALREADY_REDEEMED"
  | "EXPIRED_CODE";

export type RedeemResult =
  | { ok: true }
  | { ok: false; error: RedeemFailureCode; message: string };

export type CreateCodesInput = {
  amount: number;
  expiresAt?: Date;
  note?: string;
};

type CodeRow = {
  id: number;
  code: string;
  created_at: string;
  expires_at: string | null;
  redeemed: 0 | 1;
  redeemed_at: string | null;
  redeemed_ip: string | null;
  note: string | null;
};

const REDEEM_ERROR_MESSAGES: Record<RedeemFailureCode, string> = {
  INVALID_CODE: "This code does not exist.",
  ALREADY_REDEEMED: "This code has already been redeemed.",
  EXPIRED_CODE: "This code has expired."
};

export class CodeStorage {
  constructor(private readonly db: DatabaseConnection) {}

  createCodes(input: CreateCodesInput): string[] {
    const insert = this.db.prepare(`
      INSERT INTO redeem_codes (code, created_at, expires_at, redeemed, note)
      VALUES (?, ?, ?, 0, ?)
    `);

    const createTransaction = this.db.transaction(() => {
      const codes: string[] = [];
      const createdAt = new Date().toISOString();
      const expiresAt = input.expiresAt?.toISOString() ?? null;
      const note = input.note ?? null;

      while (codes.length < input.amount) {
        const code = generateRedeemCode();

        try {
          insert.run(code, createdAt, expiresAt, note);
          codes.push(code);
        } catch (error) {
          if (!isSqliteUniqueConstraintError(error)) {
            throw error;
          }
        }
      }

      return codes;
    });

    return createTransaction() as string[];
  }

  redeemCode(code: string, redeemedIp: string, now = new Date()): RedeemResult {
    const find = this.db.prepare(`
      SELECT id, code, created_at, expires_at, redeemed, redeemed_at, redeemed_ip, note
      FROM redeem_codes
      WHERE code = ?
      LIMIT 1
    `);

    const update = this.db.prepare(`
      UPDATE redeem_codes
      SET redeemed = 1, redeemed_at = ?, redeemed_ip = ?
      WHERE code = ? AND redeemed = 0
    `);

    const redeemTransaction = this.db.transaction(() => {
      const row = find.get(code) as CodeRow | undefined;

      if (!row) {
        return redeemError("INVALID_CODE");
      }

      if (row.redeemed === 1) {
        return redeemError("ALREADY_REDEEMED");
      }

      if (row.expires_at && Date.parse(row.expires_at) <= now.getTime()) {
        return redeemError("EXPIRED_CODE");
      }

      const result = update.run(now.toISOString(), redeemedIp, code);
      if (result.changes !== 1) {
        return redeemError("ALREADY_REDEEMED");
      }

      return { ok: true } satisfies RedeemResult;
    });

    return redeemTransaction() as RedeemResult;
  }
}

function redeemError(error: RedeemFailureCode): RedeemResult {
  return {
    ok: false,
    error,
    message: REDEEM_ERROR_MESSAGES[error]
  };
}

function isSqliteUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String((error as { code: unknown }).code).startsWith("SQLITE_CONSTRAINT")
  );
}
