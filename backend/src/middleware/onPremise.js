import ipaddr from 'ipaddr.js';
import { prisma } from '../lib/prisma.js';

/**
 * On-premise-only enforcement for session-establishing endpoints (login,
 * login-pin, refresh). The caller's source IP must fall inside the tenant's
 * `allowedIps` allowlist (CIDRs). Fallbacks:
 *   1. Tenant's own `allowedIps` (per-LGU network)
 *   2. Global `ALLOWED_IPS` env (comma-separated CIDRs) when the tenant list
 *      is empty or the tenant cannot be resolved
 *   3. No restriction when neither is configured (open by default)
 *
 * NOTE: requires `TRUST_PROXY` to be set correctly in `server.js` for any
 * proxy/nginx deployment; otherwise `req.ip` is the proxy's address.
 */

function parseCidrs(list) {
  const ranges = [];
  for (const raw of list || []) {
    const s = String(raw).trim();
    if (!s) continue;
    try {
      ranges.push(ipaddr.parseCIDR(s));
    } catch {
      try {
        ranges.push([ipaddr.parse(s), 32]);
      } catch {
        // Ignore malformed entries rather than failing open silently — they
        // simply don't match, so the caller stays blocked when restricted.
      }
    }
  }
  return ranges;
}

export function ipInCidr(ip, cidrs) {
  if (!ip || !Array.isArray(cidrs) || cidrs.length === 0) return false;
  const ranges = parseCidrs(cidrs);
  if (ranges.length === 0) return false;
  let parsed;
  try {
    parsed = ipaddr.parse(String(ip).trim());
  } catch {
    return false;
  }
  return ranges.some(([range, bits]) => {
    try {
      return range.kind() === parsed.kind() && parsed.match(range, bits);
    } catch {
      return false;
    }
  });
}

async function resolveTenantId(req) {
  const header = req.headers['x-tenant-id'];
  if (typeof header === 'string' && header) return header;

  const queryTenant = req.query?.tenantId;
  if (queryTenant) return String(queryTenant);

  const reqCode = req.body?.tenantCode || req.query?.tenantCode;
  if (reqCode) {
    const t = await prisma.tenant.findFirst({
      where: { code: { equals: String(reqCode), mode: 'insensitive' } },
      select: { id: true },
    });
    if (t) return t.id;
  }

  const username = req.body?.username;
  if (username) {
    const u = await prisma.user.findUnique({
      where: { username: String(username) },
      select: { tenantId: true },
    });
    if (u?.tenantId) return u.tenantId;
  }

  return null;
}

export async function requireOnPremise(req, res, next) {
  try {
    const tenantId = await resolveTenantId(req);

    let allowedIps = null;
    let tenantActive = null;
    if (tenantId) {
      const t = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { allowedIps: true, isActive: true },
      });
      if (t) {
        allowedIps = t.allowedIps;
        tenantActive = t.isActive;
      }
    }

    if (tenantActive === false) {
      return res.status(403).json({ error: { code: 'TENANT_INACTIVE', message: 'This LGU account is deactivated' } });
    }

    if (!allowedIps || allowedIps.length === 0) {
      allowedIps = String(process.env.ALLOWED_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
    }

    // No rule configured anywhere → open (keeps existing deployments working).
    if (allowedIps.length === 0) return next();

    if (ipInCidr(req.ip, allowedIps)) return next();

    return res.status(403).json({
      error: { code: 'ONPREMISE_ONLY', message: 'Access restricted to the office network' },
    });
  } catch (e) {
    next(e);
  }
}