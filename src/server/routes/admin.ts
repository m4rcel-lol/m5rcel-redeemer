import type { FastifyInstance } from "fastify";
import { isAuthorizedAdmin } from "../auth.js";
import type { CodeStorage } from "../storage.js";
import { parseAdminGenerateBody } from "../validation.js";

type RegisterAdminRoutesOptions = {
  adminSecret?: string;
  storage: CodeStorage;
};

export async function registerAdminRoutes(
  app: FastifyInstance,
  options: RegisterAdminRoutesOptions
): Promise<void> {
  app.post("/api/admin/generate", async (request, reply) => {
    if (!isAuthorizedAdmin(request.headers.authorization, options.adminSecret)) {
      return reply.code(401).send({
        ok: false,
        error: "UNAUTHORIZED",
        message: "Unauthorized."
      });
    }

    const parsed = parseAdminGenerateBody(request.body);
    if (!parsed.ok) {
      return reply.code(400).send({
        ok: false,
        error: "BAD_REQUEST",
        message: parsed.message
      });
    }

    const expiresAt =
      parsed.value.expiresInHours === undefined
        ? undefined
        : new Date(Date.now() + parsed.value.expiresInHours * 60 * 60 * 1000);

    const codes = options.storage.createCodes({
      amount: parsed.value.amount,
      expiresAt,
      note: parsed.value.note
    });

    return reply.send({
      ok: true,
      codes
    });
  });
}
