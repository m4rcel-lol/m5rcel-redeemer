function toBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function isAuthorized(authorizationHeader: string | null, adminSecret: string | undefined): boolean {
  if (!authorizationHeader || !adminSecret || !authorizationHeader.startsWith("Bearer ")) {
    return false;
  }

  const provided = authorizationHeader.slice("Bearer ".length);
  const a = toBytes(provided);
  const b = toBytes(adminSecret);

  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }

  return diff === 0;
}
