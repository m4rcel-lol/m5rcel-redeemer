import type { FastifyInstance } from "fastify";
import { FixedWindowRateLimiter } from "../rate-limit.js";
import type { CodeStorage, RedeemFailureCode } from "../storage.js";
import { parseRedeemBody } from "../validation.js";

type RegisterRedeemRoutesOptions = {
  storage: CodeStorage;
  rateLimiter: FixedWindowRateLimiter;
};

const STATUS_BY_ERROR: Record<RedeemFailureCode, number> = {
  INVALID_CODE: 404,
  ALREADY_REDEEMED: 409,
  EXPIRED_CODE: 410
};

export async function registerRedeemRoutes(
  app: FastifyInstance,
  options: RegisterRedeemRoutesOptions
): Promise<void> {
  app.post("/api/redeem", async (request, reply) => {
    const rateLimit = options.rateLimiter.check(request.ip);
    if (!rateLimit.ok) {
      return reply
        .code(429)
        .header("Retry-After", String(rateLimit.retryAfterSeconds))
        .send({
          ok: false,
          error: "RATE_LIMITED",
          message: "Too many redeem attempts. Please wait and try again."
        });
    }

    const parsed = parseRedeemBody(request.body);
    if (!parsed.ok) {
      return reply.code(400).send({
        ok: false,
        error: "MALFORMED_CODE",
        message: parsed.message
      });
    }

    const result = options.storage.redeemCode(parsed.value.code, request.ip);
    if (!result.ok) {
      return reply.code(STATUS_BY_ERROR[result.error]).send(result);
    }

    return reply.send({
      ok: true,
      message: "Code redeemed successfully."
    });
  });
}
