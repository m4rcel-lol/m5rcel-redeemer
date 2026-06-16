export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    private readonly options: {
      windowMs: number;
      maxAttempts: number;
    }
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    this.cleanup(now);

    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + this.options.windowMs
      });
      return { ok: true };
    }

    if (current.count >= this.options.maxAttempts) {
      return {
        ok: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
      };
    }

    current.count += 1;
    return { ok: true };
  }

  private cleanup(now: number): void {
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
