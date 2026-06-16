import type { CodeRecord, StorageAdapter } from "./types";
import { generateCode, isCodeFormatValid, normalizeCode } from "./code";
import { isAuthorized } from "./auth";
import { getClientIp, jsonResponse, readJson } from "./validation";
import { isRateLimited } from "./rate-limit";

type HandlerContext = {
  request: Request;
  storage: StorageAdapter;
  adminSecret?: string;
};

export async function handleRedeem({ request, storage }: HandlerContext): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "METHOD_NOT_ALLOWED" }, { status: 405 });
    }

    const ip = getClientIp(request);

    if (isRateLimited(`redeem:${ip}`)) {
      return jsonResponse({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
    }

    const body = await readJson(request);
    const code = normalizeCode((body as { code?: unknown })?.code);

    if (!code || !isCodeFormatValid(code)) {
      return jsonResponse({ ok: false, error: "MALFORMED_CODE" }, { status: 400 });
    }

    const record = await storage.get(code);

    if (!record) {
      return jsonResponse({ ok: false, error: "INVALID_CODE" }, { status: 404 });
    }

    if (record.redeemed) {
      return jsonResponse({ ok: false, error: "ALREADY_REDEEMED" }, { status: 409 });
    }

    if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
      return jsonResponse({ ok: false, error: "EXPIRED_CODE" }, { status: 410 });
    }

    const updated: CodeRecord = {
      ...record,
      redeemed: true,
      redeemedAt: new Date().toISOString(),
      redeemedBy: ip
    };

    await storage.put(updated);

    return jsonResponse({
      ok: true,
      message: "Code redeemed successfully."
    });
  } catch {
    return jsonResponse({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function handleGenerate({ request, storage, adminSecret }: HandlerContext): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "METHOD_NOT_ALLOWED" }, { status: 405 });
    }

    if (!isAuthorized(request.headers.get("authorization"), adminSecret)) {
      return jsonResponse({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await readJson(request) as {
      amount?: unknown;
      expiresInHours?: unknown;
      note?: unknown;
    };

    const amountInput = typeof body.amount === "number" && Number.isFinite(body.amount)
      ? body.amount
      : 1;

    const amount = Math.max(1, Math.min(100, Math.floor(amountInput)));

    const expiresInHours = typeof body.expiresInHours === "number" &&
      Number.isFinite(body.expiresInHours) &&
      body.expiresInHours > 0
      ? Math.min(body.expiresInHours, 24 * 365)
      : undefined;

    const note = typeof body.note === "string"
      ? body.note.slice(0, 200)
      : undefined;

    const createdAt = new Date();
    const expiresAt = expiresInHours
      ? new Date(createdAt.getTime() + expiresInHours * 60 * 60 * 1000).toISOString()
      : undefined;

    const codes: string[] = [];

    for (let index = 0; index < amount; index += 1) {
      let code = generateCode();
      let attempts = 0;

      while (await storage.get(code)) {
        attempts += 1;

        if (attempts > 8) {
          return jsonResponse({ ok: false, error: "CODE_GENERATION_FAILED" }, { status: 500 });
        }

        code = generateCode();
      }

      await storage.put({
        code,
        createdAt: createdAt.toISOString(),
        expiresAt,
        redeemed: false,
        note
      });

      codes.push(code);
    }

    return jsonResponse({
      ok: true,
      codes
    });
  } catch {
    return jsonResponse({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
