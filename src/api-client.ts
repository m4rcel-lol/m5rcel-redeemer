export type RedeemResponse =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function redeemCode(code: string): Promise<RedeemResponse> {
  const response = await fetch("/api/redeem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ code })
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: "SERVER_ERROR" };
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "ok" in payload &&
    typeof (payload as { ok: unknown }).ok === "boolean"
  ) {
    return payload as RedeemResponse;
  }

  return { ok: false, error: "SERVER_ERROR" };
}
