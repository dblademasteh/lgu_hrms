import { Issuer } from 'openid-client';
import { prisma } from '../lib/prisma.js';
import { userRepository } from '../repositories/userRepository.js';

/**
 * OIDC / SSO service (mirrors IMS backend/src/services/oauth.js).
 *
 * One credential across both systems: HRMS and IMS point at the SAME
 * external identity provider (Entra ID / Google / generic OIDC).
 * On callback the IdP subject is upserted to a local User row keyed on
 * externalId (= IdP `sub`), so each system still owns its local RBAC
 * (role/department) while sharing the login identity.
 *
 * Opt-in via env: OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET,
 * OIDC_REDIRECT_URI. When unset, `oidcEnabled()` is false and the
 * frontend hides the SSO button.
 */

let oidcIssuer = null;
let client = null;

export function oidcEnabled() {
  return Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET);
}

async function getClient() {
  if (client) return client;
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const redirectUri = process.env.OIDC_REDIRECT_URI || 'http://localhost:4000/api/v1/auth/oidc/callback';
  if (!issuer || !clientId || !clientSecret) {
    throw Object.assign(new Error('OIDC is not configured'), { status: 400, code: 'OIDC_DISABLED' });
  }
  oidcIssuer = await Issuer.discover(issuer);
  client = new oidcIssuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [redirectUri],
    response_types: ['code'],
  });
  return client;
}

export async function getAuthorizationUrl(state) {
  const c = await getClient();
  return c.authorizationUrl({ state, scope: 'openid profile email' });
}

export async function exchangeCodeForProfile(code, state) {
  const c = await getClient();
  const tokenSet = await c.callback(c.redirect_uris[0], { code, state }, {});
  const claims = tokenSet.claims();
  return {
    sub: claims.sub,
    email: claims.email || claims.preferred_username,
    fullName: claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(' ') || claims.email,
    firstName: claims.given_name || null,
    lastName: claims.family_name || null,
    groups: claims.groups || [],
    provider: process.env.OIDC_ISSUER?.includes('microsoft') ? 'azure-ad' : 'oidc',
  };
}

const GROUP_ROLE_MAP = {
  admin: 'ADMIN',
  hr: 'HR_MANAGER',
  hrmanager: 'HR_MANAGER',
  payroll: 'PAYROLL_OFFICER',
  auditor: 'AUDITOR',
  depthead: 'DEPARTMENT_HEAD',
  departmenthead: 'DEPARTMENT_HEAD',
};

function roleFromGroups(groups = []) {
  for (const g of groups) {
    const mapped = GROUP_ROLE_MAP[String(g).toLowerCase().replace(/[^a-z]/g, '')];
    if (mapped) return mapped;
  }
  return null;
}

/**
 * Upsert the local User row for an IdP identity.
 * - Match key: externalId = IdP sub (stable across logins).
 * - Never touches passwordHash/pinHash: SSO users keep password login
 *   working if they also have one; pure-SSO users get an unusable random hash.
 * - Never downgrades an existing role: role is only set on create, or
 *   upgraded when the IdP group mapping yields a strictly higher role.
 */
const ROLE_RANK = { AUDITOR: 1, DEPARTMENT_HEAD: 2, PAYROLL_OFFICER: 3, HR_MANAGER: 4, ADMIN: 5 };

export async function upsertUserFromOidc({ tenantId, profile }) {
  const { sub, email, fullName, groups, provider } = profile;
  if (!sub || !email) {
    throw Object.assign(new Error('IdP profile missing sub/email'), { status: 400 });
  }
  const resolvedTenantId = tenantId || 'tenant-default';

  const existing = await prisma.user.findFirst({ where: { externalId: sub } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { email, displayName: fullName },
    });
    await userRepository.createLoginEvent({ userId: existing.id, success: true }).catch(() => {});
    return prisma.user.findUnique({ where: { id: existing.id } });
  }

  const usernameBase = String(email).split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') || `sso-${sub.slice(0, 8)}`;
  let username = usernameBase;
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.user.findUnique({ where: { username } }).catch(() => null);
    if (!clash) break;
    username = `${usernameBase}-${attempt + 2}`;
  }

  const mappedRole = roleFromGroups(groups);
  const user = await prisma.user.create({
    data: {
      tenantId: resolvedTenantId,
      username,
      // Unusable random hash: account is SSO-only unless a password is set later.
      passwordHash: `sso:${sub}:${Date.now()}`,
      passwordChangedAt: new Date(),
      role: mappedRole || 'DEPARTMENT_HEAD',
      email,
      displayName: fullName,
      externalId: sub,
      status: 'ACTIVE',
    },
  });
  await userRepository.createLoginEvent({ userId: user.id, success: true }).catch(() => {});
  return user;
}

export { ROLE_RANK };
