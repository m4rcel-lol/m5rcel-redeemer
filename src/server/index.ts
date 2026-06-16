import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyHelmet from "@fastify/helmet";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { openDatabase } from "./db.js";
import { FixedWindowRateLimiter } from "./rate-limit.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerRedeemRoutes } from "./routes/redeem.js";
import { CodeStorage } from "./storage.js";

type BuildServerOptions = {
  adminSecret?: string;
  dbPath?: string;
  logger?: boolean;
  serveStatic?: boolean;
  staticRoot?: string;
  trustProxy?: boolean;
};

const DEFAULT_PORT = 10513;
const DEFAULT_BODY_LIMIT_BYTES = 10 * 1024;
const REDEEM_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const REDEEM_RATE_LIMIT_MAX_ATTEMPTS = 8;

export async function buildServer(
  options: BuildServerOptions = {}
): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: DEFAULT_BODY_LIMIT_BYTES,
    logger: options.logger ?? process.env.NODE_ENV !== "test",
    trustProxy: options.trustProxy ?? process.env.TRUST_PROXY === "true"
  });

  const db = openDatabase(resolveDbPath(options.dbPath));
  const storage = new CodeStorage(db);

  app.addHook("onClose", async () => {
    db.close();
  });

  app.setErrorHandler(async (error, request, reply) => {
    request.log.error({ error }, "Unhandled request error");

    if (getStatusCode(error) === 413) {
      return reply.code(413).send({
        ok: false,
        error: "SERVER_ERROR",
        message: "Request body is too large."
      });
    }

    return reply.code(500).send({
      ok: false,
      error: "SERVER_ERROR",
      message: "Something went wrong. Please try again later."
    });
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        "upgrade-insecure-requests": null
      }
    },
    crossOriginOpenerPolicy: false,
    originAgentCluster: false
  });
  await registerHealthRoutes(app);
  await registerRedeemRoutes(app, {
    storage,
    rateLimiter: new FixedWindowRateLimiter({
      windowMs: REDEEM_RATE_LIMIT_WINDOW_MS,
      maxAttempts: REDEEM_RATE_LIMIT_MAX_ATTEMPTS
    })
  });
  await registerAdminRoutes(app, {
    adminSecret: options.adminSecret ?? process.env.ADMIN_SECRET,
    storage
  });

  const serveStatic = options.serveStatic ?? true;

  if (serveStatic) {
    const staticRoot = resolveStaticRoot(options.staticRoot);

    await app.register(fastifyStatic, {
      decorateReply: true,
      index: false,
      prefix: "/public/",
      root: staticRoot
    });

    await app.register(fastifyStatic, {
      decorateReply: false,
      index: "index.html",
      prefix: "/",
      root: staticRoot
    });
  }

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/") || request.url === "/healthz") {
      return reply.code(404).send({
        ok: false,
        error: "NOT_FOUND",
        message: "Not found."
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return reply.code(404).send({
        ok: false,
        error: "NOT_FOUND",
        message: "Not found."
      });
    }

    if (serveStatic) {
      return reply.sendFile("index.html");
    }

    return reply.code(404).send({
      ok: false,
      error: "NOT_FOUND",
      message: "Not found."
    });
  });

  return app;
}

async function start(): Promise<void> {
  const app = await buildServer();
  const port = readPort(process.env.PORT);

  try {
    await app.listen({
      host: "0.0.0.0",
      port
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

function resolveDbPath(dbPath?: string): string {
  return dbPath ?? process.env.DB_PATH ?? path.resolve(process.cwd(), "data/redeemer.sqlite");
}

function resolveStaticRoot(staticRoot?: string): string {
  if (staticRoot) {
    return staticRoot;
  }

  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), "../client");
}

function readPort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function getStatusCode(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
  ) {
    return (error as { statusCode: number }).statusCode;
  }

  return undefined;
}

const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (currentFile === executedFile) {
  void start();
}
