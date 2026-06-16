const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_PATTERN = /^M5R-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const compact = input.trim().replace(/\s+/g, "").toUpperCase();

  if (!compact) return null;

  const withoutSeparators = compact.replace(/-/g, "");

  if (withoutSeparators.startsWith("M5R") && withoutSeparators.length === 15) {
    return `M5R-${withoutSeparators.slice(3, 7)}-${withoutSeparators.slice(7, 11)}-${withoutSeparators.slice(11, 15)}`;
  }

  return compact;
}

export function isCodeFormatValid(code: string): boolean {
  return CODE_PATTERN.test(code);
}

export function generateCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);

  let body = "";

  for (const byte of bytes) {
    body += ALPHABET[byte % ALPHABET.length];
  }

  return `M5R-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}
