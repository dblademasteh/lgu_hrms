import { prisma } from '../lib/prisma.js';

/**
 * Tenant context — shared-schema multi-tenancy scaffold.
 *
 * Resolution order per request:
 *   1. JWT claim `tenantId` (set at login from the user's row)
 *   2. Subdomain e.g. tarlac.hrms.local → tenant code mapping
 *   3. `X-Tenant-Id` header (SUPER_ADMIN only, for platform operators)
 *   4. `?tenantId=` query param (SUPER_ADMIN only)
 *
 * Regular users are pinned to their own tenant. Cross-tenant access fails
 * closed. SUPER_ADMIN (platform role, no tenant) may scope into any tenant.
 */
const SUBDOMAIN_TENANT_MAP = {
  default: 'tenant-default',
  tarlac: 'tenant-tarlac',
};

export function tenantContext(req, res, next) {
  const claim = req.user?.tenantId ?? null;
  const header = req.headers['x-tenant-id'];
  const query = req.query?.tenantId;

  // Subdomain resolution: subdomain.hrms.local -> tenant code mapping
  let subdomainTenantId = null;
  try {
    const host = req.get('host') || '';
    const hostname = host.split(':')[0];
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0].toLowerCase();
      subdomainTenantId = SUBDOMAIN_TENANT_MAP[subdomain] || null;
    }
  } catch {}

  const requested = (typeof header === 'string' && header) || (typeof query === 'string' && query) || null;

  if (req.user?.role === 'SUPER_ADMIN') {
    req.tenantId = requested || subdomainTenantId || null;
    req.tenantScope = req.tenantId ? { tenantId: req.tenantId } : {};
    req.isSuperAdmin = true;
    return next();
  }

  // Resolve tenant for regular users: JWT claim wins, then subdomain if matches claim
  const resolvedTenantId = claim || subdomainTenantId || null;

  if (requested && requested !== claim) {
    return res.status(403).json({ error: { code: 'TENANT_FORBIDDEN', message: 'Cross-tenant access denied' } });
  }
  req.tenantId = resolvedTenantId;
  req.tenantScope = resolvedTenantId ? { tenantId: resolvedTenantId } : {};
  req.isSuperAdmin = false;
  next();
}

/**
 * Merge the request's tenant scope into a Prisma `where` clause.
 * Usage in repositories: `where: withTenant(req, { status: 'ACTIVE' })`.
 * SUPER_ADMIN with no tenant selected sees all tenants (platform view).
 */
export function withTenant(req, where = {}) {
  if (!req) return where;
  if (req.isSuperAdmin && !req.tenantId) return where;
  if (!req.tenantId) return { ...where, tenantId: req.tenantId ?? null };
  return { ...where, tenantId: req.tenantId };
}

/**
 * Guard for writes: stamp tenantId on create payloads, reject cross-tenant ids.
 * Returns 400 when the payload names a different tenant.
 */
export function stampTenant(req, data = {}) {
  if (req.isSuperAdmin && !req.tenantId) return data;
  if (data.tenantId && data.tenantId !== req.tenantId) {
    const err = new Error('Cross-tenant write denied');
    err.status = 403;
    err.code = 'TENANT_FORBIDDEN';
    throw err;
  }
  return req.tenantId ? { ...data, tenantId: req.tenantId } : data;
}

export const tenantRepository = {
  list: () => prisma.tenant.findMany({ orderBy: { name: 'asc' } }),
  get: (id) => prisma.tenant.findUnique({ where: { id } }),
  create: (data) => prisma.tenant.create({ data }),
  update: (id, data) => prisma.tenant.update({ where: { id }, data }),
};
