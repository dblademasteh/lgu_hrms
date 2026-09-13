import { prisma } from '../lib/prisma.js';
import { DEFAULT_PERMISSIONS, CAPABILITIES } from '../shared/permissions.js';
import { AppError } from '../lib/errors.js';

const KNOWN_KEYS = new Set(CAPABILITIES.map(c => c.key));

/**
 * Capability lookup for RBAC.
 *
 * Effective permission map for a role:
 *  - `DEFAULT_PERMISSIONS[role]` is the baseline, then explicit `RolePermission`
 *    row truth overrides it (row > default). This keeps seeded/legacy roles with
 *    partial rows from accidentally denying newly-added capabilities, and lets
 *    the matrix UI show the true effective value for every known capability.
 *  - Unknown role → {} (fail closed).
 */
const mergeRowsOverDefaults = (roleName, rows) => {
  const map = { ...(DEFAULT_PERMISSIONS[roleName] ?? {}) };
  for (const row of rows) map[row.key] = row.allowed;
  return map;
};

export const permissionService = {
  async getEffectivePermissions(tenantId, roleName) {
    const rows = await prisma.rolePermission.findMany({
      where: {
        role: {
          name: roleName,
          ...(tenantId ? { tenantId } : {}),
        },
      },
      select: { key: true, allowed: true },
    });
    return mergeRowsOverDefaults(roleName, rows);
  },

  /** Per-role effective permission maps for a tenant (for the matrix UI). */
  async listRolePermissions(tenantId) {
    const roles = await prisma.role.findMany({
      where: tenantId ? { tenantId } : {},
      include: {
        rolePermissions: { select: { key: true, allowed: true } },
      },
      orderBy: { name: 'asc' },
    });
    return roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissions: mergeRowsOverDefaults(r.name, r.rolePermissions),
    }));
  },

  /**
   * Upsert a role's permission flags. Unknown keys are rejected so the payload
   * always maps to a known capability. Returns the effective map.
   */
  async setRolePermissions(tenantId, roleName, permissions) {
    const role = await prisma.role.findFirst({
      where: { name: roleName, ...(tenantId ? { tenantId } : {}) },
    });
    if (!role) {
      throw new AppError(`Role "${roleName}" does not exist for this tenant`, 400, 'INVALID_ROLE');
    }
    const entries = Object.entries(permissions ?? {});
    if (entries.length === 0) {
      return {};
    }
    for (const [key] of entries) {
      if (!KNOWN_KEYS.has(key)) {
        throw new AppError(`Unknown capability "${key}"`, 400, 'INVALID_CAPABILITY');
      }
    }
    await Promise.all(
      entries.map(([key, allowed]) =>
        prisma.rolePermission.upsert({
          where: { roleId_key: { roleId: role.id, key } },
          create: { roleId: role.id, key, allowed: !!allowed, tenantId: tenantId ?? null },
          update: { allowed: !!allowed },
        })
      )
    );
    const map = {};
    entries.forEach(([key, allowed]) => { map[key] = !!allowed; });
    return map;
  },
};