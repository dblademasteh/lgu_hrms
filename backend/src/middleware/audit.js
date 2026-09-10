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

function safeBody(body) {
  try {
    if (!body) return undefined;
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    if (parsed && typeof parsed === 'object' && 'password' in parsed) {
      const { password, ...rest } = parsed;
      return rest;
    }
    return parsed;
  } catch {
    return undefined;
  }
}
