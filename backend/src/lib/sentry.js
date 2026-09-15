// Sentry glue — critical-path error capture for the backend.
// Activates only when SENTRY_DSN is set (see backend/.env.example); without a
// DSN every function here is a safe no-op, so dev keeps zero Sentry overhead.

let sentry = null;

export const sentryEnabled = () => Boolean(process.env.SENTRY_DSN);

export async function initSentry() {
  if (!sentryEnabled()) return;
  const mod = await import('@sentry/node');
  mod.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV !== 'production',
  });
  sentry = mod;
}

// Captures an exception with the request context attached. The existing error
// middleware keeps producing the stable `{error:{code,message}}` response
// shape — Sentry only records what happened, the client never sees it.
export function captureError(error, req) {
  if (!sentry) return;
  const context = {};
  if (req) {
    context.user = {
      id: req.user?.id,
      username: req.user?.username,
      role: req.user?.role,
      tenantId: req.user?.tenantId,
    };
    context.extra = { method: req.method, url: req.originalUrl };
  }
  sentry.captureException(error, context);
}