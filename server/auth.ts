function toBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function isAuthorized(authorizationHeader: string | null, adminSecret: string | undefined): boolean {
  if (!authorizationHeader || !adminSecret || !authorizationHeader.startsWith("Bearer ")) {
    return false;
  }

  const provided = authorizationHeader.slice("Bearer ".length);
  const providedBytes = toBytes(provided);
  const secretBytes = toBytes(adminSecret);

  let diff = providedBytes.length ^ secretBytes.length;
  const length = Math.max(providedBytes.length, secretBytes.length);

  for (let index = 0; index < length; index += 1) {
    diff |= (providedBytes[index] ?? 0) ^ (secretBytes[index] ?? 0);
  }

  return diff === 0;
}
