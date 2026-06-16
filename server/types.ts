export type CodeRecord = {
  code: string;
  createdAt: string;
  expiresAt?: string;
  redeemed: boolean;
  redeemedAt?: string;
  redeemedBy?: string;
  note?: string;
};

export type StorageAdapter = {
  get(code: string): Promise<CodeRecord | null>;
  put(record: CodeRecord): Promise<void>;
};
