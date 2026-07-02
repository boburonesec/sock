import { Injectable } from '@nestjs/common';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Process-local limiter for the first production deployment.
 *
 * It deliberately avoids a new Redis dependency for Phase 6. Multi-instance
 * deployments must move this policy to Redis or the edge proxy.
 */
@Injectable()
export class AuthRateLimiterService {
  private readonly buckets = new Map<string, RateLimitBucket>();

  consume(key: string, options: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    this.pruneExpiredBuckets(now);

    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });

      return {
        allowed: true,
        retryAfterSeconds: 0,
      };
    }

    if (existing.count >= options.maxAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    existing.count += 1;

    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  private pruneExpiredBuckets(now: number): void {
    if (this.buckets.size < 1_000) {
      return;
    }

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
