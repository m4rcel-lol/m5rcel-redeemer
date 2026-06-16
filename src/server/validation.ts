export const REDEEM_CODE_PATTERN = /^M5R-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const MAX_NOTE_LENGTH = 500;
const MAX_EXPIRES_IN_HOURS = 24 * 365 * 10;

export type ValidRedeemBody = {
  code: string;
};

export type ValidAdminGenerateBody = {
  amount: number;
  expiresInHours?: number;
  note?: string;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export function normalizeRedeemCode(input: string): string {
  return input.trim().replace(/\s+/g, "").toUpperCase();
}

export function parseRedeemBody(body: unknown): ValidationResult<ValidRedeemBody> {
  if (!isRecord(body) || typeof body.code !== "string") {
    return {
      ok: false,
      message: "Redeem code must be provided."
    };
  }

  const code = normalizeRedeemCode(body.code);
  if (!REDEEM_CODE_PATTERN.test(code)) {
    return {
      ok: false,
      message: "Redeem code must match M5R-XXXX-XXXX-XXXX."
    };
  }

  return {
    ok: true,
    value: { code }
  };
}

export function parseAdminGenerateBody(
  body: unknown
): ValidationResult<ValidAdminGenerateBody> {
  if (body !== undefined && !isRecord(body)) {
    return {
      ok: false,
      message: "Request body must be a JSON object."
    };
  }

  const input: Record<string, unknown> = body ?? {};
  const amount = input.amount === undefined ? 1 : input.amount;

  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1 || amount > 100) {
    return {
      ok: false,
      message: "amount must be an integer between 1 and 100."
    };
  }

  const output: ValidAdminGenerateBody = { amount };

  if (input.expiresInHours !== undefined) {
    if (
      typeof input.expiresInHours !== "number" ||
      !Number.isFinite(input.expiresInHours) ||
      input.expiresInHours <= 0 ||
      input.expiresInHours > MAX_EXPIRES_IN_HOURS
    ) {
      return {
        ok: false,
        message: `expiresInHours must be a positive number up to ${MAX_EXPIRES_IN_HOURS}.`
      };
    }

    output.expiresInHours = input.expiresInHours;
  }

  if (input.note !== undefined) {
    if (typeof input.note !== "string") {
      return {
        ok: false,
        message: "note must be a string."
      };
    }

    const note = input.note.trim();
    if (note.length > MAX_NOTE_LENGTH) {
      return {
        ok: false,
        message: `note must be ${MAX_NOTE_LENGTH} characters or fewer.`
      };
    }

    if (note.length > 0) {
      output.note = note;
    }
  }

  return {
    ok: true,
    value: output
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
