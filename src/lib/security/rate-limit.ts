import type { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

type MemoryEntry = {
  count: number;
  expiresAt: number;
};

const memoryStore = new Map<string, MemoryEntry>();
let redisClient: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redisClient = Redis.fromEnv();
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (limit <= 0) {
    return { allowed: true, limit, remaining: 0, retryAfterSeconds: 0 };
  }

  if (redisClient) {
    try {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      const ttl = await redisClient.ttl(key);
      const remaining = Math.max(0, limit - Number(count));
      return {
        allowed: Number(count) <= limit,
        limit,
        remaining,
        retryAfterSeconds: Math.max(0, Number(ttl) || 0),
      };
    } catch (error) {
      console.warn('[RateLimit] Redis check failed, falling back to memory:', error);
    }
  }

  const now = Date.now();
  const current = memoryStore.get(key);
  const windowMs = windowSeconds * 1000;

  if (!current || current.expiresAt <= now) {
    memoryStore.set(key, { count: 1, expiresAt: now + windowMs });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: windowSeconds,
    };
  }

  current.count += 1;
  memoryStore.set(key, current);

  return {
    allowed: current.count <= limit,
    limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.ceil((current.expiresAt - now) / 1000),
  };
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || 'unknown';
}
