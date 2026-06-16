import { handleRedeem } from "../../server/handlers";
import { createCloudflareKvStorage, createMemoryStorage } from "../../server/storage";

type Env = {
  CODES_KV?: KVNamespace;
  ADMIN_SECRET?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const storage = env.CODES_KV
    ? createCloudflareKvStorage(env.CODES_KV)
    : createMemoryStorage();

  return handleRedeem({
    request,
    storage,
    adminSecret: env.ADMIN_SECRET
  });
};
