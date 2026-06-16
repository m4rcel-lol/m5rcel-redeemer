import type { VercelRequest, VercelResponse } from "@vercel/node";
import { kv } from "@vercel/kv";
import { handleRedeem } from "../server/handlers";
import { createMemoryStorage, createVercelKvStorage } from "../server/storage";

function toRequest(req: VercelRequest): Request {
  const origin = `https://${req.headers.host ?? "localhost"}`;
  const url = new URL(req.url ?? "/api/redeem", origin);

  return new Request(url, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req.method === "GET" || req.method === "HEAD"
      ? undefined
      : JSON.stringify(req.body ?? {})
  });
}

async function sendResponse(res: VercelResponse, response: Response): Promise<void> {
  const body = await response.text();

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  res.status(response.status).send(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const hasVercelKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  const storage = hasVercelKv ? createVercelKvStorage(kv) : createMemoryStorage();

  const response = await handleRedeem({
    request: toRequest(req),
    storage,
    adminSecret: process.env.ADMIN_SECRET
  });

  await sendResponse(res, response);
}
