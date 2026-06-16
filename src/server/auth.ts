import { createHash, timingSafeEqual } from "node:crypto";

export function isAuthorizedAdmin(
  authorizationHeader: string | undefined,
  adminSecret: string | undefined
): boolean {
  if (!adminSecret || !authorizationHeader?.startsWith("Bearer ")) {
    return false;
  }

  const providedToken = authorizationHeader.slice("Bearer ".length);
  if (providedToken.length === 0) {
    return false;
  }

  return timingSafeStringEqual(providedToken, adminSecret);
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left, "utf8").digest();
  const rightHash = createHash("sha256").update(right, "utf8").digest();

  return timingSafeEqual(leftHash, rightHash);
}
