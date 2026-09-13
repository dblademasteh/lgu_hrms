import { prisma } from '../lib/prisma.js';

/**
 * Append-only AuditLog writer for mutating requests.
 * - Uses the shared Prisma client (see lib/prisma.js), never a per-file one.
 * - Captures a before snapshot for PATCH/DELETE so the trail shows what changed.
 * - Never blocks the response and never throws: audit failures are logged to
 *   stderr instead of being silently swallowed.
 */
function entityOf(req) {
  const base = (req.baseUrl || '').replace('/api/v1/', '').replace(/^\//, '');
  return base || 'root';
}

function entityIdOf(req) {
  return (
    req.params?.id ??
    req.params?.recordId ??
    req.params?.itemId ??
    ''
  );
}

async function readBefore(req) {
  try {
    if (req.method === 'GET' || req.method === 'POST') return null;
    const url = req.originalUrl || req.url || '';
    if (url.includes('/employees/') && url.includes('/sections/')) {
      const { employeeSectionService } = await import('../services/employeeSectionService.js');
      const items = await employeeSectionService.list(req.params.section, req.params.id).catch(() => null);
      return items ? { count: items.length } : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function auditLog(req, res, next) {
  if (req.method === 'GET' || !req.user) return next();
  const beforePromise = readBefore(req);
  const originalSend = res.send.bind(res);
  res.send = function (body) {
    const status = res.statusCode;
    Promise.resolve(beforePromise)
      .then(before =>
        prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: `${req.method} ${req.path}`,
            entity: entityOf(req),
            entityId: String(entityIdOf(req)),
            before: before ?? undefined,
            after: status < 400 ? safeBody(body) : { status, error: true },
            ip: req.ip,
          },
        })
      )
      .catch(err => console.error('[audit] failed to write AuditLog:', err?.message ?? err));
    return originalSend(body);
  };
  next();
}

const MAX_AUDIT_BODY_BYTES = 65536;

/** Compact large payloads to a shape summary so bulk endpoints (payroll generation/posting) don't bloat AuditLog. */
function summarizeObject(value) {
  if (Array.isArray(value)) return { count: value.length };
  if (value === null || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).slice(0, 40)) {
    const v = value[key];
    out[key] = Array.isArray(v) ? { count: v.length } : v && typeof v === 'object' ? summarizeObject(v) : v;
  }
  return out;
}

function safeBody(body) {
  try {
    if (!body) return undefined;
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    if (parsed && typeof parsed === 'object' && 'password' in parsed) {
      const { password, ...rest } = parsed;
      return rest;
    }
    const serialized = typeof parsed === 'object' ? JSON.stringify(parsed) : String(parsed);
    if (serialized.length <= MAX_AUDIT_BODY_BYTES) return parsed;
    return summarizeObject(parsed);
  } catch {
    return undefined;
  }
}
