import { permissionService } from '../services/permissionService.js';

/**
 * Capability gate. Requires the caller's role to hold at least one of the
 * given capability keys (see backend/src/shared/permissions.js). Effective
 * permissions come from the RolePermission table with DEFAULT_PERMISSIONS
 * fallback. SUPER_ADMIN (platform operator) bypasses.
 *
 * Place AFTER requireAuth + tenantContext (needs req.user.role, req.tenantId).
 */
export function requirePermission(...keys) {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'SUPER_ADMIN') return next();
      const permissions = await permissionService.getEffectivePermissions(req.tenantId, req.user?.role);
      const allowed = keys.some(key => !!permissions[key]);
      if (!allowed) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permission' } });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}