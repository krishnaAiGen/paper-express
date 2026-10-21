import "server-only";

const attempts = new Map<string, { count: number; resetAt: number }>();

/** Allows `max` attempts per key per window. In-memory: per server instance, which is enough to slow down guessing. */
export function allow(key: string, max = 10, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

export const clientKey = (req: Request, scope: string) =>
  `${scope}:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "local"}`;
