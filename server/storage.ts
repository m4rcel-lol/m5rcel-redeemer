import type { CodeRecord, StorageAdapter } from "./types";

const memory = new Map<string, CodeRecord>();

export function createMemoryStorage(): StorageAdapter {
  return {
    async get(code: string) {
      return memory.get(code) ?? null;
    },

    async put(record: CodeRecord) {
      memory.set(record.code, record);
    }
  };
}

export function createCloudflareKvStorage(namespace: KVNamespace): StorageAdapter {
  return {
    async get(code: string) {
      return namespace.get<CodeRecord>(`code:${code}`, "json");
    },

    async put(record: CodeRecord) {
      await namespace.put(`code:${record.code}`, JSON.stringify(record));
    }
  };
}

export function createVercelKvStorage(kvClient: {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
}): StorageAdapter {
  return {
    async get(code: string) {
      return kvClient.get<CodeRecord>(`code:${code}`);
    },

    async put(record: CodeRecord) {
      await kvClient.set(`code:${record.code}`, record);
    }
  };
}
