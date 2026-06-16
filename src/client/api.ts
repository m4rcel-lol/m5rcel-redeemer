export type RedeemErrorCode =
  | "INVALID_CODE"
  | "ALREADY_REDEEMED"
  | "EXPIRED_CODE"
  | "MALFORMED_CODE"
  | "RATE_LIMITED"
  | "SERVER_ERROR";

export type RedeemResponse =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      error: RedeemErrorCode;
      message: string;
    };

export async function redeemCode(code: string): Promise<RedeemResponse> {
  const response = await fetch("/api/redeem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ code })
  });

  const payload = await readJson(response);
  if (isRedeemResponse(payload)) {
    return payload;
  }

  return {
    ok: false,
    error: "SERVER_ERROR",
    message: "Unexpected server response."
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isRedeemResponse(value: unknown): value is RedeemResponse {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    return false;
  }

  const maybeResponse = value as {
    error?: unknown;
    message?: unknown;
    ok?: unknown;
  };
  return (
    typeof maybeResponse.ok === "boolean" &&
    typeof maybeResponse.message === "string" &&
    (maybeResponse.ok || typeof maybeResponse.error === "string")
  );
}
