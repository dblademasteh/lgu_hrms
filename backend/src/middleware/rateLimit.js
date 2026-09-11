/**
 * Minimal in-memory rate limiter — zero new dependencies.
 * Keyed per route+IP. For multi-instance prod, replace with a Redis counter.
 */
const buckets = new Map();

function cleanup(now) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size > 10000) {
    // Shed oldest under memory pressure.
    const keys = [...buckets.keys()].slice(0, 1000);
    for (const k of keys) buckets.delete(k);
  }
}

export function rateLimit({ windowMs = 60000, max = 60, message = 'Too many requests — try again later' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    if (Math.random() < 0.01) cleanup(now);
    const key = `${req.path}|${req.ip}`;
    let entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }
    entry.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: { code: 'RATE_LIMITED', message } });
    }
    next();
  };
}

/** Strict bucket for credential endpoints (shared shape, tighter window). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many sign-in attempts — try again in 15 minutes',
});

/** Global API bucket — generous, catches runaway clients. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  message: 'Too many requests — slow down',
});
